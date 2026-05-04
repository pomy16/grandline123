import { Router } from "express";
import { AlertPriority, Game, WebhookTarget } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const rulesRouter = Router();

function parseKeywords(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function rulePayload(body: Record<string, unknown>) {
  return {
    name: String(body.name ?? ""),
    includeKeywords: parseKeywords(body.includeKeywords),
    excludeKeywords: parseKeywords(body.excludeKeywords),
    category: typeof body.category === "string" && body.category.length > 0 ? body.category : null,
    game: typeof body.game === "string" && body.game in Game ? (body.game as Game) : "BOTH",
    minPrice: body.minPrice === "" || body.minPrice === null || body.minPrice === undefined ? null : Number(body.minPrice),
    maxPrice: body.maxPrice === "" || body.maxPrice === null || body.maxPrice === undefined ? null : Number(body.maxPrice),
    priority: typeof body.priority === "string" && body.priority in AlertPriority ? (body.priority as AlertPriority) : "NORMAL",
    webhookTarget: typeof body.webhookTarget === "string" && body.webhookTarget in WebhookTarget ? (body.webhookTarget as WebhookTarget) : "DEFAULT",
    caseInsensitive: body.caseInsensitive !== false,
    fuzzyMatching: Boolean(body.fuzzyMatching),
    active: body.active !== false,
    cooldownSeconds: Number(body.cooldownSeconds ?? 900)
  };
}

rulesRouter.get("/", async (_request, response) => {
  const rules = await prisma.keywordRule.findMany({ orderBy: { createdAt: "desc" } });
  response.json({ data: rules });
});

rulesRouter.post("/", async (request, response) => {
  if (!request.body.name) {
    response.status(400).json({ error: "Rule name is required." });
    return;
  }
  const rule = await prisma.keywordRule.create({ data: rulePayload(request.body) });
  response.status(201).json({ data: rule });
});

rulesRouter.patch("/:id", async (request, response) => {
  const rule = await prisma.keywordRule.update({ where: { id: request.params.id }, data: rulePayload(request.body) });
  response.json({ data: rule });
});

rulesRouter.delete("/:id", async (request, response) => {
  await prisma.keywordRule.delete({ where: { id: request.params.id } });
  response.status(204).send();
});
