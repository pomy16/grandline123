import { Router } from "express";
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
        update: { value },
        create: { key, value }
      })
    )
  );
  response.json({ data: updates });
});

settingsRouter.post("/webhooks", async (request, response) => {
  const webhook = await prisma.discordWebhook.create({ data: request.body });
  response.status(201).json({ data: webhook });
});

settingsRouter.patch("/webhooks/:id", async (request, response) => {
  const webhook = await prisma.discordWebhook.update({ where: { id: request.params.id }, data: request.body });
  response.json({ data: webhook });
});

settingsRouter.delete("/webhooks/:id", async (request, response) => {
  await prisma.discordWebhook.delete({ where: { id: request.params.id } });
  response.status(204).send();
});

settingsRouter.post("/webhooks/:id/test", async (request, response) => {
  const webhook = await prisma.discordWebhook.findUniqueOrThrow({ where: { id: request.params.id } });
  const result = await sendDiscordAlert({
    webhookUrl: webhook.url,
    target: webhook.target,
    eventType: "NEW_PRODUCT",
    productTitle: "Test Pokemon TCG Monitor Alert",
    storeName: "Demo Store",
    price: "129.99 EUR",
    stockStatus: "IN_STOCK",
    imageUrl: "https://placehold.co/400x400?text=TCG+Monitor",
    productUrl: "https://example.invalid/products/demo",
    category: "System test"
  });
  response.json({ data: result });
});
