import { createHash } from "node:crypto";
import type { EventType, WebhookTarget } from "@tcg-monitor/shared";
import { prisma } from "../lib/prisma";

const colors: Record<EventType, number> = {
  NEW_PRODUCT: 0x3b82f6,
  RESTOCK: 0x22c55e,
  PRICE_DROP: 0x14b8a6,
  PRICE_INCREASE: 0xf97316,
  SOLD_OUT: 0xef4444,
  PREORDER_OPENED: 0xa855f7,
  PRODUCT_UPDATED: 0xeab308
};

export interface DiscordAlertInput {
  webhookUrl: string;
  target: WebhookTarget;
  eventType: EventType;
  productTitle: string;
  storeName: string;
  price?: string | null;
  oldPrice?: string | null;
  stockStatus?: string | null;
  imageUrl?: string | null;
  productUrl: string;
  category?: string | null;
}

export function buildDiscordPayload(input: Omit<DiscordAlertInput, "webhookUrl" | "target">) {
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
          { name: "Quick actions", value: `[Open product](${input.productUrl})`, inline: false }
        ],
        footer: {
          text: "TCG Monitor - purchase assist only"
        }
      }
    ]
  };
}

export async function sendDiscordAlert(input: DiscordAlertInput) {
  const payload = buildDiscordPayload(input);
  const payloadHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.DISCORD_TIMEOUT_MS ?? 10_000));

  try {
    const response = await fetch(input.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const responseText = await response.text().catch(() => "");

    await prisma.notificationLog.create({
      data: {
        target: input.target,
        status: response.ok ? "SENT" : "FAILED",
        payloadHash,
        response: {
          status: response.status,
          statusText: response.statusText,
          durationMs: Date.now() - startedAt,
          body: responseText.slice(0, 500)
        },
        sentAt: response.ok ? new Date() : null,
        error: response.ok ? null : `Discord returned ${response.status}: ${responseText.slice(0, 160)}`
      }
    });

    return { ok: response.ok, status: response.status, payload };
  } catch (error) {
    await prisma.notificationLog.create({
      data: {
        target: input.target,
        status: "FAILED",
        payloadHash,
        error: error instanceof Error ? error.message : "Unknown Discord delivery error",
        response: { durationMs: Date.now() - startedAt }
      }
    });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
