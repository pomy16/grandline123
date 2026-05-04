import { createHash } from "node:crypto";
import { keywordRuleMatchesProduct } from "@tcg-monitor/shared";
import type { EventType, NormalizedProduct } from "@tcg-monitor/shared";
import type { Product, Store } from "@prisma/client";
import { createMonitor } from "../monitors";
import { prisma } from "../prisma";
import { notifyProductEvent } from "./notifications";
import { toStoreConfig } from "./store-config";

function stateHash(product: NormalizedProduct, eventType: EventType): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        eventType,
        canonicalUrl: product.canonicalUrl,
        title: product.normalizedTitle,
        price: product.price,
        stockStatus: product.stockStatus,
        isPreorder: product.isPreorder
      })
    )
    .digest("hex");
}

function detectEvents(existing: Product | null, incoming: NormalizedProduct): EventType[] {
  if (!existing) return incoming.isPreorder ? ["NEW_PRODUCT", "PREORDER_OPENED"] : ["NEW_PRODUCT"];

  const events: EventType[] = [];
  const oldPrice = existing.price ? Number(existing.price) : null;
  const newPrice = incoming.price ?? null;

  if (!existing.isAvailable && incoming.isAvailable) events.push("RESTOCK");
  if (existing.isAvailable && !incoming.isAvailable) events.push("SOLD_OUT");
  if (!existing.isPreorder && incoming.isPreorder) events.push("PREORDER_OPENED");
  if (oldPrice !== null && newPrice !== null && newPrice < oldPrice) events.push("PRICE_DROP");
  if (oldPrice !== null && newPrice !== null && newPrice > oldPrice) events.push("PRICE_INCREASE");
  if (
    existing.title !== incoming.title ||
    existing.imageUrl !== incoming.imageUrl ||
    existing.stockStatus !== incoming.stockStatus
  ) {
    events.push("PRODUCT_UPDATED");
  }

  return events;
}

function rawField(product: NormalizedProduct, key: string): string | number | boolean | null {
  if (typeof product.rawData !== "object" || product.rawData === null || !(key in product.rawData)) {
    return null;
  }
  const value = product.rawData[key as keyof typeof product.rawData];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return null;
}

async function persistProduct(store: Store, incoming: NormalizedProduct) {
  const existing = await prisma.product.findUnique({
    where: {
      storeId_canonicalUrl: {
        storeId: store.id,
        canonicalUrl: incoming.canonicalUrl
      }
    }
  });
  const events = detectEvents(existing, incoming);
  const changed = events.length > 0;

  const product = await prisma.product.upsert({
    where: {
      storeId_canonicalUrl: {
        storeId: store.id,
        canonicalUrl: incoming.canonicalUrl
      }
    },
    update: {
      title: incoming.title,
      normalizedTitle: incoming.normalizedTitle,
      url: incoming.url,
      imageUrl: incoming.imageUrl,
      previousPrice: existing?.price ?? null,
      price: incoming.price,
      currency: incoming.currency,
      stockStatus: incoming.stockStatus,
      isAvailable: incoming.isAvailable,
      isPreorder: incoming.isPreorder,
      sku: incoming.sku,
      ean: incoming.ean,
      category: incoming.category,
      game: incoming.game,
      lastSeenAt: new Date(),
      lastChangedAt: changed ? new Date() : existing?.lastChangedAt
    },
    create: {
      storeId: store.id,
      title: incoming.title,
      normalizedTitle: incoming.normalizedTitle,
      url: incoming.url,
      canonicalUrl: incoming.canonicalUrl,
      imageUrl: incoming.imageUrl,
      price: incoming.price,
      currency: incoming.currency,
      stockStatus: incoming.stockStatus,
      isAvailable: incoming.isAvailable,
      isPreorder: incoming.isPreorder,
      sku: incoming.sku,
      ean: incoming.ean,
      category: incoming.category,
      game: incoming.game,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      lastChangedAt: new Date()
    }
  });

  await prisma.productSnapshot.create({
    data: {
      productId: product.id,
      title: incoming.title,
      price: incoming.price,
      imageUrl: incoming.imageUrl,
      stockStatus: incoming.stockStatus,
      isAvailable: incoming.isAvailable,
      isPreorder: incoming.isPreorder,
      rawData: incoming.rawData as never
    }
  });

  const productEvents = await Promise.all(
    events.map((type) =>
      prisma.productEvent.create({
        data: {
          productId: product.id,
          type,
          oldValue: existing
            ? {
                title: existing.title,
                price: existing.price?.toString() ?? null,
                stockStatus: existing.stockStatus,
                imageUrl: existing.imageUrl,
                isAvailable: existing.isAvailable,
                isPreorder: existing.isPreorder
              }
            : undefined,
          newValue: {
            title: incoming.title,
            price: incoming.price ?? null,
            stockStatus: incoming.stockStatus,
            imageUrl: incoming.imageUrl ?? null,
            isAvailable: incoming.isAvailable,
            isPreorder: incoming.isPreorder
          },
          metadata: {
            stateHash: stateHash(incoming, type),
            phase: "phase-3-discord-notifications",
            matchedKeywordRuleId: rawField(incoming, "matchedKeywordRuleId"),
            matchedKeywordRuleName: rawField(incoming, "matchedKeywordRuleName"),
            matchedKeywordRulePriority: rawField(incoming, "matchedKeywordRulePriority"),
            matchedKeywordRuleWebhookTarget: rawField(incoming, "matchedKeywordRuleWebhookTarget"),
            matchedKeywordRuleCooldownSeconds: rawField(incoming, "matchedKeywordRuleCooldownSeconds")
          }
        }
      })
    )
  );

  return { product, events: productEvents };
}

async function applyKeywordRules(products: NormalizedProduct[]) {
  const rules = await prisma.keywordRule.findMany({
    where: { active: true },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }]
  });

  return products.map((product) => {
    const rule = rules.find((candidate) =>
      keywordRuleMatchesProduct(
        {
          includeKeywords: candidate.includeKeywords,
          excludeKeywords: candidate.excludeKeywords,
          game: candidate.game,
          category: candidate.category,
          minPrice: candidate.minPrice ? Number(candidate.minPrice) : null,
          maxPrice: candidate.maxPrice ? Number(candidate.maxPrice) : null,
          caseInsensitive: candidate.caseInsensitive,
          fuzzyMatching: candidate.fuzzyMatching
        },
        product
      )
    );

    return rule
      ? {
          ...product,
          category: rule.category ?? product.category,
          game: rule.game === "BOTH" ? product.game : rule.game,
          rawData: {
            ...(typeof product.rawData === "object" && product.rawData !== null ? product.rawData : {}),
            matchedKeywordRuleId: rule.id,
            matchedKeywordRuleName: rule.name,
            matchedKeywordRulePriority: rule.priority,
            matchedKeywordRuleWebhookTarget: rule.webhookTarget,
            matchedKeywordRuleCooldownSeconds: rule.cooldownSeconds
          }
        }
      : product;
  });
}

export async function scanStore(storeId: string, scanJobId?: string) {
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  const startedAt = new Date();

  if (scanJobId) {
    await prisma.scanJob.update({
      where: { id: scanJobId },
      data: { status: "RUNNING", startedAt }
    });
  }

  try {
    const monitor = createMonitor(store.mode);
    const products = await applyKeywordRules(await monitor.scan(toStoreConfig(store)));
    let eventsCreated = 0;

    for (const product of products) {
      const result = await persistProduct(store, product);
      eventsCreated += result.events.length;
      for (const event of result.events) {
        await notifyProductEvent(event.id);
      }
    }

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    await prisma.store.update({
      where: { id: store.id },
      data: {
        lastScanAt: finishedAt,
        nextScanAt: new Date(finishedAt.getTime() + store.pollingIntervalSeconds * 1000),
        lastError: null,
        repeatedFailureCount: 0,
        averageScanDurationMs: durationMs
      }
    });
    if (scanJobId) {
      await prisma.scanJob.update({
        where: { id: scanJobId },
        data: { status: "SUCCEEDED", finishedAt, durationMs, productsFound: products.length, eventsCreated }
      });
    }
    await prisma.scanLog.create({
      data: {
        storeId: store.id,
        severity: "INFO",
        message: `Mock scan completed for ${store.name}.`,
        context: { productsFound: products.length, eventsCreated, durationMs }
      }
    });

    return { productsFound: products.length, eventsCreated, durationMs };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scan failure";
    const finishedAt = new Date();
    await prisma.store.update({
      where: { id: store.id },
      data: {
        lastError: message,
        repeatedFailureCount: { increment: 1 }
      }
    });
    if (scanJobId) {
      await prisma.scanJob.update({
        where: { id: scanJobId },
        data: { status: "FAILED", finishedAt, durationMs: finishedAt.getTime() - startedAt.getTime(), error: message }
      });
    }
    await prisma.scanLog.create({
      data: { storeId: store.id, severity: "ERROR", message, context: { mode: store.mode } }
    });
    throw error;
  }
}
