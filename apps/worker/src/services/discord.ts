import { createHash } from "node:crypto";
import type { EventType, WebhookTarget } from "@tcg-monitor/shared";
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
  category?: string | null;
}) {
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
}) {
  const payloadHash = createHash("sha256").update(JSON.stringify(params.payload)).digest("hex");
  const response = await fetch(params.webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params.payload)
  });

  await prisma.notificationLog.create({
    data: {
      eventId: params.eventId,
      productId: params.productId,
      target: params.target,
      status: response.ok ? "SENT" : "FAILED",
      payloadHash,
      response: { status: response.status, statusText: response.statusText },
      sentAt: response.ok ? new Date() : null,
      error: response.ok ? null : `Discord returned ${response.status}`
    }
  });

  return response.ok;
}
