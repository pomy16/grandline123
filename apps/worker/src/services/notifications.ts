import { createHash } from "node:crypto";
import type { AlertPriority, DiscordWebhook, EventType, Game, Product, ProductEvent, WebhookTarget } from "@prisma/client";
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
type ResolvedWebhookRoute = {
  webhook: DiscordWebhook;
  candidate: WebhookRouteCandidate;
  reason: string;
};

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
  multiRouteHighPriority?: boolean;
}): WebhookRouteCandidate[] {
  const candidates: WebhookRouteCandidate[] = [];

  if (params.isTest) {
    addTarget(candidates, "TEST");
    return candidates;
  }
  if (params.isError) {
    addTarget(candidates, "ERROR_LOG");
    return candidates;
  }

  const isHighPriority = params.priority === "HIGH" || params.priority === "CRITICAL";
  if (params.storeWebhookId) {
    candidates.push({ kind: "webhookId", webhookId: params.storeWebhookId });
    if (isHighPriority && params.multiRouteHighPriority) addTarget(candidates, "HIGH_PRIORITY");
    return candidates;
  }

  if (isHighPriority) addTarget(candidates, "HIGH_PRIORITY");
  addTarget(candidates, eventTypeTarget(params.eventType));
  if (params.ruleTarget && params.ruleTarget !== "DEFAULT") addTarget(candidates, params.ruleTarget);
  if (params.productGame === "POKEMON" || params.productGame === "BOTH") addTarget(candidates, "POKEMON");
  if (params.productGame === "ONE_PIECE" || params.productGame === "BOTH") addTarget(candidates, "ONE_PIECE");
  addTarget(candidates, "DEFAULT");

  return candidates;
}

function discordMultiRouteHighPriority() {
  return process.env.DISCORD_MULTI_ROUTE_HIGH_PRIORITY === "true";
}

async function resolveCandidateWebhook(candidate: WebhookRouteCandidate) {
  if (candidate.kind === "webhookId") {
    return prisma.discordWebhook.findFirst({
      where: { id: candidate.webhookId, active: true }
    });
  }
  return prisma.discordWebhook.findFirst({
    where: targetFallbackWebhookWhere(candidate.target),
    orderBy: { updatedAt: "desc" }
  });
}

export function targetFallbackWebhookWhere(target: WebhookTarget) {
  return { target, active: true, stores: { none: {} } } as const;
}

function routeReason(candidate: WebhookRouteCandidate, params: Parameters<typeof routeCandidates>[0]) {
  if (params.isTest) return "TEST notification route.";
  if (params.isError) return "ERROR_LOG notification route.";
  if (candidate.kind === "webhookId") return "Store-specific webhook is primary for product events.";
  if (candidate.target === "HIGH_PRIORITY" && params.storeWebhookId && params.multiRouteHighPriority) return "Extra high-priority copy because multi-route is enabled.";
  if (candidate.target === "HIGH_PRIORITY") return "High-priority fallback because no active store-specific webhook was available.";
  const eventTarget = eventTypeTarget(params.eventType);
  if (candidate.target === eventTarget) return `Event-type fallback for ${params.eventType}.`;
  if (candidate.target === params.ruleTarget) return "Explicit keyword-rule fallback target.";
  if (candidate.target === "POKEMON" || candidate.target === "ONE_PIECE") return "Game-specific fallback route.";
  return "Default fallback route.";
}

function routeContext(route: ResolvedWebhookRoute, params: Parameters<typeof routeCandidates>[0]) {
  return {
    reason: route.reason,
    routeKind: route.candidate.kind,
    target: route.webhook.target,
    webhookName: route.webhook.name,
    storeFirst: route.candidate.kind === "webhookId",
    multiRouteHighPriority: Boolean(params.multiRouteHighPriority),
    storeWebhookConfigured: Boolean(params.storeWebhookId)
  };
}

async function resolveWebhookRoutes(params: Parameters<typeof routeCandidates>[0]): Promise<ResolvedWebhookRoute[]> {
  const candidates = routeCandidates(params);
  const routes: ResolvedWebhookRoute[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const webhook = await resolveCandidateWebhook(candidate);
    if (!webhook) continue;
    const key = `${webhook.id}:${webhook.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    routes.push({ webhook, candidate, reason: routeReason(candidate, params) });
  }

  if (params.storeWebhookId && routes.length === 0) {
    return resolveWebhookRoutes({ ...params, storeWebhookId: null });
  }

  return routes;
}

async function getGlobalCooldownSeconds() {
  const setting = await prisma.appSetting.findUnique({ where: { key: "notificationCooldownSeconds" } });
  if (typeof setting?.value === "number") return setting.value;
  return workerConfig.notificationCooldownSeconds;
}

export function actionableNotificationSkipReason(params: {
  eventType: EventType;
  stockStatus: Product["stockStatus"];
  isAvailable: boolean;
  isPreorder: boolean;
  price?: Product["price"] | number | string | null;
  publicCartUrl?: string | null;
}) {
  if (params.eventType === "RESTOCK" || params.eventType === "PREORDER_OPENED") return null;
  if (params.isAvailable || params.isPreorder || params.stockStatus === "IN_STOCK" || params.stockStatus === "PREORDER") return null;
  if (params.stockStatus === "OUT_OF_STOCK") return "Product is out of stock; tracked for future RESTOCK but not alerted.";
  if (params.eventType === "SOLD_OUT") return "SOLD_OUT is tracked for history but not sent as an actionable alert.";
  if (params.eventType === "NEW_PRODUCT" && params.price === null && !params.publicCartUrl) {
    return "NEW_PRODUCT has UNKNOWN stock and no price/cart/actionable availability signal; tracked without Discord alert.";
  }
  return null;
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
  const routingParams = {
    eventType: event.type as EventType,
    productGame: event.product.game,
    priority: metadata.matchedKeywordRulePriority,
    storeWebhookId: event.product.store.discordWebhookId,
    ruleTarget: metadata.matchedKeywordRuleWebhookTarget,
    multiRouteHighPriority: discordMultiRouteHighPriority()
  };
  const routes = await resolveWebhookRoutes(routingParams);
  const fallbackTarget = metadata.matchedKeywordRuleWebhookTarget ?? "DEFAULT";

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

  if (routes.length === 0) {
    const payloadHash = createHash("sha256")
      .update(JSON.stringify({ stateHash, target: fallbackTarget, eventType: event.type, productId: event.productId }))
      .digest("hex");
    await prisma.notificationLog.create({
      data: {
        productId: event.productId,
        eventId: event.id,
        target: fallbackTarget,
        status: "SKIPPED",
        payloadHash,
        error: `No active Discord webhook configured for ${fallbackTarget} or fallback targets.`,
        response: {
          route: {
            reason: "No active webhook matched store-first, event-type, rule, game, or default fallback routing.",
            storeWebhookConfigured: Boolean(event.product.store.discordWebhookId),
            multiRouteHighPriority: routingParams.multiRouteHighPriority
          }
        }
      }
    });
    return { status: "SKIPPED", reason: "No active webhook." };
  }

  const nonActionableReason = actionableNotificationSkipReason({
    eventType: event.type as EventType,
    stockStatus: event.product.stockStatus,
    isAvailable: event.product.isAvailable,
    isPreorder: event.product.isPreorder,
    price: event.product.price,
    publicCartUrl: event.product.publicCartUrl
  });
  if (nonActionableReason) {
    const deliveries = [];
    for (const route of routes) {
      const payloadHash = createHash("sha256")
        .update(JSON.stringify({ stateHash, target: route.webhook.target, webhookId: route.webhook.id, eventType: event.type, productId: event.productId }))
        .digest("hex");
      await prisma.notificationLog.create({
        data: {
          productId: event.productId,
          eventId: event.id,
          target: route.webhook.target,
          status: "SKIPPED",
          payloadHash,
          error: nonActionableReason,
          response: { route: routeContext(route, routingParams) }
        }
      });
      deliveries.push({ status: "SKIPPED", reason: nonActionableReason, target: route.webhook.target });
    }
    return deliveries.length === 1 ? deliveries[0] : { status: "MULTI_ROUTE", deliveries };
  }

  const deliveries = [];
  for (const route of routes) {
    const { webhook } = route;
    const payloadHash = createHash("sha256")
      .update(JSON.stringify({ stateHash, target: webhook.target, webhookId: webhook.id, eventType: event.type, productId: event.productId }))
      .digest("hex");
    const deliveryRouteContext = routeContext(route, routingParams);

    const skipReason = await shouldSkipNotification({ event, target: webhook.target, payloadHash, stateHash, cooldownSeconds });
    if (skipReason) {
      await prisma.notificationLog.create({
        data: {
          productId: event.productId,
          eventId: event.id,
          target: webhook.target,
          status: "SKIPPED",
          payloadHash,
          error: skipReason,
          response: { route: deliveryRouteContext }
        }
      });
      deliveries.push({ status: "SKIPPED", reason: skipReason, target: webhook.target });
      continue;
    }

    const delivery = await sendWebhook({
      webhookUrl: webhook.url,
      target: webhook.target,
      webhookName: webhook.name,
      eventId: event.id,
      productId: event.productId,
      payload,
      payloadHash,
      routeContext: deliveryRouteContext
    });
    deliveries.push(delivery);
  }

  if (deliveries.some((delivery) => "ok" in delivery && delivery.ok)) {
    await prisma.product.update({
      where: { id: event.productId },
      data: { lastNotifiedHash: stateHash }
    });
    await prisma.productEvent.update({
      where: { id: event.id },
      data: { notificationSent: true }
    });
  }

  return deliveries.length === 1 ? deliveries[0] : { status: "MULTI_ROUTE", deliveries };
}

export async function sendProductTestAlert(productId: string) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { store: true }
  });
  const routingParams = {
    eventType: "NEW_PRODUCT" as EventType,
    productGame: product.game,
    priority: "NORMAL" as const,
    storeWebhookId: product.store.discordWebhookId,
    multiRouteHighPriority: false
  };
  const route = (await resolveWebhookRoutes(routingParams))[0] ?? null;
  const target = route?.webhook.target ?? "DEFAULT";
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

  if (!route) {
    await prisma.notificationLog.create({
      data: {
        productId: product.id,
        target,
        status: "SKIPPED",
        payloadHash,
        error: "No active Discord webhook matched the product store route or safe fallback targets.",
        response: {
          route: {
            reason: "Product test uses store-first routing, but no active store, game, event-type, or global fallback webhook was available.",
            storeWebhookConfigured: Boolean(product.store.discordWebhookId),
            multiRouteHighPriority: false
          }
        }
      }
    });
    return { status: "SKIPPED", reason: "No active webhook." };
  }

  return sendWebhook({
    webhookUrl: route.webhook.url,
    target: route.webhook.target,
    webhookName: route.webhook.name,
    productId: product.id,
    payload,
    payloadHash,
    routeContext: {
      ...routeContext(route, routingParams),
      reason: `Product test alert: ${route.reason}`
    }
  });
}
