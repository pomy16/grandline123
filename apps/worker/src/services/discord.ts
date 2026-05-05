import { createHash } from "node:crypto";
import type { AlertPriority, EventType, Game, WebhookTarget } from "@tcg-monitor/shared";
import { prisma } from "../prisma";

const colors: Record<EventType, number> = {
  NEW_PRODUCT: 0x3b82f6,
  RESTOCK: 0x22c55e,
  PRICE_DROP: 0x14b8a6,
  PRICE_INCREASE: 0xf97316,
  SOLD_OUT: 0xef4444,
  PREORDER_OPENED: 0xa855f7,
  PRODUCT_UPDATED: 0xeab308
};

export function buildDiscordPayload(input: {
  eventType: EventType;
  productTitle: string;
  storeName: string;
  price?: string | null;
  oldPrice?: string | null;
  stockStatus?: string | null;
  imageUrl?: string | null;
  productUrl: string;
  publicCartUrl?: string | null;
  category?: string | null;
  game?: Game | null;
  priority?: AlertPriority | null;
}) {
  const quickActions = [
    `[Open product](${input.productUrl})`,
    ...(input.publicCartUrl ? [`[Add to cart](${input.publicCartUrl})`] : [])
  ].join(" | ");

  return {
    embeds: [
      {
        title: input.productTitle,
        url: input.productUrl,
        color: colors[input.eventType],
        timestamp: new Date().toISOString(),
        thumbnail: input.imageUrl ? { url: input.imageUrl } : undefined,
        fields: [
          { name: "Store", value: input.storeName, inline: true },
          { name: "Event", value: input.eventType, inline: true },
          { name: "Price", value: input.price ?? "Unknown", inline: true },
          ...(input.oldPrice ? [{ name: "Old price", value: input.oldPrice, inline: true }] : []),
          { name: "Stock", value: input.stockStatus ?? "Unknown", inline: true },
          { name: "Category", value: input.category ?? "Uncategorized", inline: true },
          { name: "Game", value: input.game ?? "UNKNOWN", inline: true },
          { name: "Priority", value: input.priority ?? "NORMAL", inline: true },
          { name: "Quick actions", value: quickActions, inline: false }
        ],
        footer: { text: "TCG Monitor - purchase assist only" }
      }
    ]
  };
}

export async function sendWebhook(params: {
  webhookUrl: string;
  target: WebhookTarget;
  eventId?: string;
  productId?: string;
  payload: unknown;
  payloadHash?: string;
}) {
  const payloadHash = params.payloadHash ?? createHash("sha256").update(JSON.stringify(params.payload)).digest("hex");
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.DISCORD_TIMEOUT_MS ?? 10_000));

  try {
    const response = await fetch(params.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params.payload),
      signal: controller.signal
    });
    const responseText = await response.text().catch(() => "");
    const durationMs = Date.now() - startedAt;

    await prisma.notificationLog.create({
      data: {
        eventId: params.eventId,
        productId: params.productId,
        target: params.target,
        status: response.ok ? "SENT" : "FAILED",
        payloadHash,
        response: {
          status: response.status,
          statusText: response.statusText,
          durationMs,
          body: responseText.slice(0, 500)
        },
        sentAt: response.ok ? new Date() : null,
        error: response.ok ? null : `Discord returned ${response.status}: ${responseText.slice(0, 160)}`
      }
    });

    if (!response.ok) {
      await prisma.scanLog.create({
        data: {
          severity: "ERROR",
          message: `Discord delivery failed for ${params.target}.`,
          context: {
            eventId: params.eventId,
            productId: params.productId,
            status: response.status,
            statusText: response.statusText,
            durationMs
          }
        }
      });
    }

    return { ok: response.ok, status: response.status, payloadHash, target: params.target };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Discord delivery error";
    await prisma.notificationLog.create({
      data: {
        eventId: params.eventId,
        productId: params.productId,
        target: params.target,
        status: "FAILED",
        payloadHash,
        error: message,
        response: { durationMs: Date.now() - startedAt }
      }
    });
    await prisma.scanLog.create({
      data: {
        severity: "ERROR",
        message: `Discord delivery error for ${params.target}: ${message}`,
        context: { eventId: params.eventId, productId: params.productId }
      }
    });
    return { ok: false, status: 0, payloadHash, target: params.target, error: message };
  } finally {
    clearTimeout(timeout);
  }
}
