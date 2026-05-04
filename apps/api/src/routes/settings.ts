import { Router } from "express";
import { Prisma, WebhookTarget } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { sendDiscordAlert } from "../services/discord";

export const settingsRouter = Router();

settingsRouter.get("/", async (_request, response) => {
  const [settings, webhooks] = await Promise.all([
    prisma.appSetting.findMany({ orderBy: { key: "asc" } }),
    prisma.discordWebhook.findMany({ orderBy: { createdAt: "desc" } })
  ]);
  response.json({ data: { settings, webhooks } });
});

settingsRouter.patch("/", async (request, response) => {
  const entries = Object.entries(request.body.settings ?? {});
  const updates = await Promise.all(
    entries.map(([key, value]) =>
      prisma.appSetting.upsert({
        where: { key },
        update: { value: value as Prisma.InputJsonValue },
        create: { key, value: value as Prisma.InputJsonValue }
      })
    )
  );
  response.json({ data: updates });
});

function webhookPayload(body: Record<string, unknown>) {
  return {
    name: String(body.name ?? ""),
    target: typeof body.target === "string" && body.target in WebhookTarget ? (body.target as WebhookTarget) : "DEFAULT",
    url: String(body.url ?? ""),
    active: body.active !== false
  };
}

settingsRouter.post("/webhooks", async (request, response) => {
  if (!request.body.name || !request.body.url) {
    response.status(400).json({ error: "Webhook name and URL are required." });
    return;
  }
  const webhook = await prisma.discordWebhook.create({ data: webhookPayload(request.body) });
  response.status(201).json({ data: webhook });
});

settingsRouter.patch("/webhooks/:id", async (request, response) => {
  const webhook = await prisma.discordWebhook.update({ where: { id: request.params.id }, data: webhookPayload(request.body) });
  response.json({ data: webhook });
});

settingsRouter.delete("/webhooks/:id", async (request, response) => {
  await prisma.discordWebhook.delete({ where: { id: request.params.id } });
  response.status(204).send();
});

settingsRouter.post("/webhooks/:id/test", async (request, response) => {
  const webhook = await prisma.discordWebhook.findUniqueOrThrow({ where: { id: request.params.id } });
  try {
    const result = await sendDiscordAlert({
      webhookUrl: webhook.url,
      target: webhook.target,
      eventType: request.body.eventType ?? "NEW_PRODUCT",
      productTitle: request.body.productTitle ?? "Test Pokemon TCG Monitor Alert",
      storeName: "Demo Store",
      price: "129.99 EUR",
      stockStatus: "IN_STOCK",
      imageUrl: "https://placehold.co/400x400?text=TCG+Monitor",
      productUrl: "https://example.invalid/products/demo",
      category: "System test"
    });
    response.json({ data: result });
  } catch (error) {
    response.status(502).json({ error: error instanceof Error ? error.message : "Discord webhook test failed." });
  }
});
