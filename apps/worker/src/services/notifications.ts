import { createHash } from "node:crypto";
import type { AlertPriority, EventType, Game, Product, ProductEvent, WebhookTarget } from "@prisma/client";
import { workerConfig } from "../config";
import { prisma } from "../prisma";
import { buildDiscordPayload, sendWebhook } from "./discord";

type EventWithProduct = ProductEvent & {
  product: Product & {
    store: { name: string; discordWebhookId: string | null };
  };
};

type EventMetadata = {
  stateHash?: string;
  matchedKeywordRulePriority?: AlertPriority | null;
  matchedKeywordRuleWebhookTarget?: WebhookTarget | null;
  matchedKeywordRuleCooldownSeconds?: number | null;
};

function readMetadata(event: ProductEvent): EventMetadata {
  if (!event.metadata || typeof event.metadata !== "object" || Array.isArray(event.metadata)) return {};
  return event.metadata as EventMetadata;
}

function priceLabel(value: unknown, currency: string) {
  if (value === null || value === undefined || value === "") return null;
  return `${String(value)} ${currency}`;
}

type WebhookRouteCandidate = { kind: "target"; target: WebhookTarget } | { kind: "webhookId"; webhookId: string };

function addTarget(candidates: WebhookRouteCandidate[], target: WebhookTarget | null | undefined) {
  if (!target) return;
  if (candidates.some((candidate) => candidate.kind === "target" && candidate.target === target)) return;
  candidates.push({ kind: "target", target });
}

export function eventTypeTarget(eventType: EventType): WebhookTarget | null {
  if (eventType === "RESTOCK") return "RESTOCK";
  if (eventType === "PRICE_DROP") return "PRICE_DROP";
  if (eventType === "PREORDER_OPENED") return "PREORDER";
  return null;
}

export function routeCandidates(params: {
  eventType: EventType;
  productGame: Game;
  priority?: AlertPriority | null;
  storeWebhookId?: string | null;
  ruleTarget?: WebhookTarget | null;
  isTest?: boolean;
  isError?: boolean;
}): WebhookRouteCandidate[] {
  const candidates: WebhookRouteCandidate[] = [];

  if (params.isTest) addTarget(candidates, "TEST");
  if (params.isError) addTarget(candidates, "ERROR_LOG");
  if (params.priority === "HIGH" || params.priority === "CRITICAL") addTarget(candidates, "HIGH_PRIORITY");
  if (params.storeWebhookId) candidates.push({ kind: "webhookId", webhookId: params.storeWebhookId });
  addTarget(candidates, eventTypeTarget(params.eventType));
  if (params.ruleTarget && params.ruleTarget !== "DEFAULT") addTarget(candidates, params.ruleTarget);
  if (params.productGame === "POKEMON" || params.productGame === "BOTH") addTarget(candidates, "POKEMON");
  if (params.productGame === "ONE_PIECE" || params.productGame === "BOTH") addTarget(candidates, "ONE_PIECE");
  addTarget(candidates, "DEFAULT");

  return candidates;
}

async function resolveWebhook(params: Parameters<typeof routeCandidates>[0]) {
  const candidates = routeCandidates(params);

  for (const candidate of candidates) {
    if (candidate.kind === "webhookId") {
      const webhook = await prisma.discordWebhook.findFirst({
        where: { id: candidate.webhookId, active: true }
      });
      if (webhook) return webhook;
      continue;
    }
    const webhook = await prisma.discordWebhook.findFirst({
      where: { target: candidate.target, active: true },
      orderBy: { updatedAt: "desc" }
    });
    if (webhook) return webhook;
  }

  return null;
}

async function getGlobalCooldownSeconds() {
  const setting = await prisma.appSetting.findUnique({ where: { key: "notificationCooldownSeconds" } });
  if (typeof setting?.value === "number") return setting.value;
  return workerConfig.notificationCooldownSeconds;
}

function stateHashForEvent(event: EventWithProduct) {
  const metadata = readMetadata(event);
  if (metadata.stateHash) return metadata.stateHash;
  return createHash("sha256")
    .update(
      JSON.stringify({
        productId: event.productId,
        type: event.type,
        newValue: event.newValue
      })
    )
    .digest("hex");
}

async function shouldSkipNotification(params: {
  event: EventWithProduct;
  target: WebhookTarget;
  payloadHash: string;
  stateHash: string;
  cooldownSeconds: number;
}) {
  if (params.event.product.ignored) return "Product is ignored.";

  const duplicate = await prisma.notificationLog.findFirst({
    where: {
      productId: params.event.productId,
      target: params.target,
      payloadHash: params.payloadHash,
      status: "SENT"
    }
  });
  if (duplicate) return "Duplicate alert payload was already sent.";

  if (params.event.product.lastNotifiedHash === params.stateHash) {
    return "Product state hash was already notified.";
  }

  const since = new Date(Date.now() - params.cooldownSeconds * 1000);
  const recentSameType = await prisma.notificationLog.findFirst({
    where: {
      productId: params.event.productId,
      target: params.target,
      status: "SENT",
      createdAt: { gte: since },
      event: { type: params.event.type }
    },
    orderBy: { createdAt: "desc" }
  });
  if (recentSameType) return `Cooldown active for ${params.event.type}.`;

  return null;
}

export async function notifyProductEvent(eventId: string) {
  const event = await prisma.productEvent.findUniqueOrThrow({
    where: { id: eventId },
    include: { product: { include: { store: true } } }
  });
  if (event.type === "PRODUCT_UPDATED" && process.env.NOTIFY_PRODUCT_UPDATED !== "true") {
    await prisma.notificationLog.create({
      data: {
        productId: event.productId,
        eventId: event.id,
        target: "DEFAULT",
        status: "SKIPPED",
        payloadHash: stateHashForEvent(event),
        error: "PRODUCT_UPDATED Discord notifications are disabled by default."
      }
    });
    return { status: "SKIPPED", reason: "PRODUCT_UPDATED notifications disabled." };
  }

  const metadata = readMetadata(event);
  const cooldownSeconds = Number(metadata.matchedKeywordRuleCooldownSeconds ?? (await getGlobalCooldownSeconds()));
  const webhook = await resolveWebhook({
    eventType: event.type as EventType,
    productGame: event.product.game,
    priority: metadata.matchedKeywordRulePriority,
    storeWebhookId: event.product.store.discordWebhookId,
    ruleTarget: metadata.matchedKeywordRuleWebhookTarget
  });
  const target = webhook?.target ?? metadata.matchedKeywordRuleWebhookTarget ?? "DEFAULT";

  const oldValue = event.oldValue && typeof event.oldValue === "object" && !Array.isArray(event.oldValue) ? event.oldValue : {};
  const newValue = event.newValue && typeof event.newValue === "object" && !Array.isArray(event.newValue) ? event.newValue : {};
  const payload = buildDiscordPayload({
    eventType: event.type as EventType,
    productTitle: event.product.title,
    storeName: event.product.store.name,
    price: priceLabel("price" in newValue ? newValue.price : event.product.price?.toString(), event.product.currency),
    oldPrice: priceLabel("price" in oldValue ? oldValue.price : null, event.product.currency),
    stockStatus: event.product.stockStatus,
    imageUrl: event.product.imageUrl,
    productUrl: event.product.url,
    publicCartUrl: event.product.publicCartUrl,
    category: event.product.category,
    game: event.product.game,
    priority: metadata.matchedKeywordRulePriority ?? "NORMAL"
  });
  const stateHash = stateHashForEvent(event);
  const payloadHash = createHash("sha256")
    .update(JSON.stringify({ stateHash, target, eventType: event.type, productId: event.productId }))
    .digest("hex");

  if (!webhook) {
    await prisma.notificationLog.create({
      data: {
        productId: event.productId,
        eventId: event.id,
        target,
        status: "SKIPPED",
        payloadHash,
        error: `No active Discord webhook configured for ${target} or fallback targets.`
      }
    });
    return { status: "SKIPPED", reason: "No active webhook." };
  }

  const skipReason = await shouldSkipNotification({ event, target: webhook.target, payloadHash, stateHash, cooldownSeconds });
  if (skipReason) {
    await prisma.notificationLog.create({
      data: {
        productId: event.productId,
        eventId: event.id,
        target: webhook.target,
        status: "SKIPPED",
        payloadHash,
        error: skipReason
      }
    });
    return { status: "SKIPPED", reason: skipReason };
  }

  const delivery = await sendWebhook({
    webhookUrl: webhook.url,
    target: webhook.target,
    webhookName: webhook.name,
    eventId: event.id,
    productId: event.productId,
    payload,
    payloadHash
  });

  if (delivery.ok) {
    await prisma.product.update({
      where: { id: event.productId },
      data: { lastNotifiedHash: stateHash }
    });
    await prisma.productEvent.update({
      where: { id: event.id },
      data: { notificationSent: true }
    });
  }

  return delivery;
}

export async function sendProductTestAlert(productId: string, requestedTarget?: WebhookTarget) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { store: true }
  });
  const webhook = requestedTarget
    ? await prisma.discordWebhook.findFirst({ where: { target: requestedTarget, active: true }, orderBy: { updatedAt: "desc" } })
    : await resolveWebhook({
        eventType: "NEW_PRODUCT",
        productGame: product.game,
        priority: "NORMAL",
        storeWebhookId: product.store.discordWebhookId,
        isTest: true
      });
  const target = webhook?.target ?? requestedTarget ?? "TEST";
  const payload = buildDiscordPayload({
    eventType: "NEW_PRODUCT",
    productTitle: product.title,
    storeName: product.store.name,
    price: product.price ? `${product.price.toString()} ${product.currency}` : null,
    stockStatus: product.stockStatus,
    imageUrl: product.imageUrl,
    productUrl: product.url,
    publicCartUrl: product.publicCartUrl,
    category: product.category,
    game: product.game,
    priority: "NORMAL"
  });
  const payloadHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");

  if (!webhook) {
    await prisma.notificationLog.create({
      data: {
        productId: product.id,
        target,
        status: "SKIPPED",
        payloadHash,
        error: `No active Discord webhook configured for ${target} or fallback targets.`
      }
    });
    return { status: "SKIPPED", reason: "No active webhook." };
  }

  return sendWebhook({
    webhookUrl: webhook.url,
    target: webhook.target,
    webhookName: webhook.name,
    productId: product.id,
    payload
  });
}
