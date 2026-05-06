import { createHash } from "node:crypto";
import { isRelevantTargetProduct, keywordRuleMatchesProduct } from "@tcg-monitor/shared";
import type { EventType, NormalizedProduct } from "@tcg-monitor/shared";
import { Prisma } from "@prisma/client";
import type { Product, Store } from "@prisma/client";
import { createMonitor } from "../monitors";
import { prisma } from "../prisma";
import { MonitorRequestError } from "../http/safe-http-client";
import { workerConfig } from "../config";
import { assertNoMockProductsForRealStore } from "./monitor-safety";
import { actionableNotificationSkipReason, notifyProductEvent } from "./notifications";
import { toStoreConfig } from "./store-config";

export function stateHash(product: NormalizedProduct, eventType: EventType): string {
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

export function detectEvents(existing: Pick<Product, "price" | "isAvailable" | "isPreorder" | "title" | "imageUrl" | "stockStatus"> | null, incoming: NormalizedProduct): EventType[] {
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

export function mergeIncomingWithExisting(
  existing: Pick<Product, "price" | "imageUrl" | "category" | "game"> | null,
  incoming: NormalizedProduct
): NormalizedProduct {
  if (!existing) return incoming;
  return {
    ...incoming,
    price: incoming.price ?? (existing.price ? Number(existing.price) : null),
    imageUrl: incoming.imageUrl ?? existing.imageUrl,
    category: incoming.category ?? existing.category,
    game: incoming.game === "UNKNOWN" ? existing.game : incoming.game
  };
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
  const mergedIncoming = mergeIncomingWithExisting(existing, incoming);
  const events = detectEvents(existing, mergedIncoming);
  const changed = events.length > 0;

  const product = await prisma.product.upsert({
    where: {
      storeId_canonicalUrl: {
        storeId: store.id,
        canonicalUrl: incoming.canonicalUrl
      }
    },
    update: {
      title: mergedIncoming.title,
      normalizedTitle: mergedIncoming.normalizedTitle,
      url: mergedIncoming.url,
      imageUrl: mergedIncoming.imageUrl,
      publicCartUrl: incoming.publicCartUrl ?? null,
      previousPrice: existing?.price ?? null,
      price: mergedIncoming.price,
      currency: mergedIncoming.currency,
      stockStatus: mergedIncoming.stockStatus,
      isAvailable: mergedIncoming.isAvailable,
      isPreorder: mergedIncoming.isPreorder,
      sku: mergedIncoming.sku,
      ean: mergedIncoming.ean,
      category: mergedIncoming.category,
      game: mergedIncoming.game,
      lastSeenAt: new Date(),
      lastChangedAt: changed ? new Date() : existing?.lastChangedAt
    },
    create: {
      storeId: store.id,
      title: mergedIncoming.title,
      normalizedTitle: mergedIncoming.normalizedTitle,
      url: mergedIncoming.url,
      canonicalUrl: mergedIncoming.canonicalUrl,
      imageUrl: mergedIncoming.imageUrl,
      publicCartUrl: incoming.publicCartUrl ?? null,
      price: mergedIncoming.price,
      currency: mergedIncoming.currency,
      stockStatus: mergedIncoming.stockStatus,
      isAvailable: mergedIncoming.isAvailable,
      isPreorder: mergedIncoming.isPreorder,
      sku: mergedIncoming.sku,
      ean: mergedIncoming.ean,
      category: mergedIncoming.category,
      game: mergedIncoming.game,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      lastChangedAt: new Date()
    }
  });

  await prisma.productSnapshot.create({
    data: {
      productId: product.id,
      title: mergedIncoming.title,
      price: mergedIncoming.price,
      imageUrl: mergedIncoming.imageUrl,
      stockStatus: mergedIncoming.stockStatus,
      isAvailable: mergedIncoming.isAvailable,
      isPreorder: mergedIncoming.isPreorder,
      rawData: mergedIncoming.rawData as never
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
            title: mergedIncoming.title,
            price: mergedIncoming.price ?? null,
            stockStatus: mergedIncoming.stockStatus,
            imageUrl: mergedIncoming.imageUrl ?? null,
            isAvailable: mergedIncoming.isAvailable,
            isPreorder: mergedIncoming.isPreorder
          },
          metadata: {
            stateHash: stateHash(mergedIncoming, type),
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

  return { product, events: productEvents, wasCreated: !existing, wasChanged: changed };
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

function productRelevanceReason(product: NormalizedProduct) {
  if (!product.title.trim()) return "missing title";
  if (!isRelevantTargetProduct(product)) return "not a relevant sealed TCG target";
  return null;
}

function scanProductDedupeKey(product: NormalizedProduct) {
  if (product.ean) return `ean:${product.ean}`;
  if (product.sku) return `sku:${product.sku}`;
  return `url:${product.canonicalUrl}`;
}

function productCompletenessScore(product: NormalizedProduct) {
  return [
    product.price !== null && product.price !== undefined,
    Boolean(product.imageUrl),
    Boolean(product.sku),
    Boolean(product.ean),
    product.game !== "UNKNOWN",
    Boolean(product.category)
  ].filter(Boolean).length;
}

export function dedupeScanProducts(products: NormalizedProduct[]) {
  const byIdentity = new Map<string, NormalizedProduct>();

  for (const product of products) {
    const key = scanProductDedupeKey(product);
    const existing = byIdentity.get(key);
    if (!existing || productCompletenessScore(product) > productCompletenessScore(existing)) {
      byIdentity.set(key, product);
    }
  }

  return Array.from(byIdentity.values());
}

export function filterRelevantScanProducts(products: NormalizedProduct[]) {
  const accepted: NormalizedProduct[] = [];
  const skipped: Array<{ title: string; url: string; reason: string }> = [];

  for (const product of products) {
    const reason = productRelevanceReason(product);
    if (reason) {
      skipped.push({ title: product.title, url: product.canonicalUrl, reason });
      continue;
    }
    accepted.push(product);
  }

  return { accepted: dedupeScanProducts(accepted), skipped };
}

function countByReason(skipped: Array<{ reason: string }>) {
  return skipped.reduce<Record<string, number>>((counts, skippedProduct) => {
    counts[skippedProduct.reason] = (counts[skippedProduct.reason] ?? 0) + 1;
    return counts;
  }, {});
}

function hasInStockActionSignal(product: NormalizedProduct) {
  return product.isAvailable || product.isPreorder || product.stockStatus === "IN_STOCK" || product.stockStatus === "PREORDER";
}

function hasAnyActionSignal(product: NormalizedProduct) {
  return hasInStockActionSignal(product) || product.price !== null || Boolean(product.publicCartUrl);
}

function scanNotificationSummary() {
  return {
    queued: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    skipReasons: {} as Record<string, number>
  };
}

function addSkipReason(summary: ReturnType<typeof scanNotificationSummary>, reason: string) {
  summary.skipReasons[reason] = (summary.skipReasons[reason] ?? 0) + 1;
}

function recordNotificationResult(summary: ReturnType<typeof scanNotificationSummary>, result: unknown) {
  if (!result || typeof result !== "object") return;
  const value = result as { ok?: boolean; status?: string; reason?: string; deliveries?: unknown[]; error?: string };
  if (Array.isArray(value.deliveries)) {
    for (const delivery of value.deliveries) recordNotificationResult(summary, delivery);
    return;
  }
  summary.queued += 1;
  if (value.ok === true) {
    summary.sent += 1;
    return;
  }
  if (value.status === "SKIPPED") {
    summary.skipped += 1;
    addSkipReason(summary, value.reason ?? "Notification skipped.");
    return;
  }
  if (value.ok === false) {
    summary.failed += 1;
    if (value.error) addSkipReason(summary, value.error);
  }
}

function monitorErrorContext(error: unknown) {
  if (error instanceof MonitorRequestError) {
    return {
      requestUrl: error.details.url,
      httpStatus: error.details.status ?? null,
      durationMs: error.details.durationMs ?? null,
      errorKind: error.details.kind
    };
  }

  return {
    requestUrl: null,
    httpStatus: null
  };
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
    const rawProducts = await monitor.scan(toStoreConfig(store));
    const relevance = filterRelevantScanProducts(rawProducts);
    const products = await applyKeywordRules(relevance.accepted);
    assertNoMockProductsForRealStore(store, products);
    const parserWarnings = "warnings" in monitor && Array.isArray(monitor.warnings) ? monitor.warnings.slice(0, 20) : [];
    let eventsCreated = 0;
    let productsCreated = 0;
    let productsUpdated = 0;
    let productsUnchanged = 0;
    const notificationSummary = scanNotificationSummary();
    const inStockRelevantFound = products.filter(hasInStockActionSignal).length;
    const relevantWithActionSignal = products.filter(hasAnyActionSignal).length;
    const outOfStockSkippedCount = products.filter((product) => product.stockStatus === "OUT_OF_STOCK").length;

    await prisma.scanLog.create({
      data: {
        storeId: store.id,
        severity: "DEBUG",
        message: `${store.mode} monitor preview for ${store.name}.`,
        context: {
          mode: store.mode,
          monitorMode: store.mode,
          fallbackUsed: false,
          scanSources: store.listingUrls,
          rawProductCount: rawProducts.length,
          rawFound: rawProducts.length,
          productCount: products.length,
          relevantFound: products.length,
          inStockRelevantFound,
          relevantWithActionSignal,
          productsExtracted: products.length,
          skippedNonTargetCount: relevance.skipped.length,
          skippedCount: relevance.skipped.length,
          skippedByReason: countByReason(relevance.skipped),
          outOfStockSkippedCount,
          skippedNonTargetProducts: relevance.skipped.slice(0, 20),
          products: products.slice(0, 10).map((product) => ({
            title: product.title,
            url: product.canonicalUrl,
            publicCartUrl: product.publicCartUrl ?? null,
            price: product.price ?? null,
            stockStatus: product.stockStatus,
            source:
              typeof product.rawData === "object" && product.rawData !== null && "source" in product.rawData
                ? String(product.rawData.source)
                : "unknown"
          }))
        } as Prisma.InputJsonValue
      }
    });

    if (parserWarnings.length > 0) {
      await prisma.scanLog.create({
        data: {
          storeId: store.id,
          severity: "WARN",
          message: `${store.mode} parser skipped non-product URLs for ${store.name}.`,
          context: { mode: store.mode, monitorMode: store.mode, parserWarnings } as Prisma.InputJsonValue
        }
      });
    }

    if (relevance.skipped.length > 0) {
      await prisma.scanLog.create({
        data: {
          storeId: store.id,
          severity: "WARN",
          message: `${store.mode} monitor skipped non-target products for ${store.name}.`,
          context: {
            mode: store.mode,
            monitorMode: store.mode,
            skippedNonTargetCount: relevance.skipped.length,
            skippedCount: relevance.skipped.length,
            skippedByReason: countByReason(relevance.skipped),
            skippedNonTargetProducts: relevance.skipped.slice(0, 50)
          } as Prisma.InputJsonValue
        }
      });
    }

    for (const product of products) {
      const result = await persistProduct(store, product);
      if (result.wasCreated) productsCreated += 1;
      else if (result.wasChanged) productsUpdated += 1;
      else productsUnchanged += 1;
      eventsCreated += result.events.length;
      for (const event of result.events) {
        recordNotificationResult(notificationSummary, await notifyProductEvent(event.id));
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
    const actionableSuppressionSummary = products.reduce<Record<string, number>>((counts, product) => {
      const reason = actionableNotificationSkipReason({
        eventType: "NEW_PRODUCT",
        stockStatus: product.stockStatus,
        isAvailable: product.isAvailable,
        isPreorder: product.isPreorder,
        price: product.price,
        publicCartUrl: product.publicCartUrl
      });
      if (reason) counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    }, {});
    const scanSummary = {
      mode: store.mode,
      monitorMode: store.mode,
      fallbackUsed: false,
      scanSources: store.listingUrls,
      rawProductCount: rawProducts.length,
      rawFound: rawProducts.length,
      skippedNonTargetCount: relevance.skipped.length,
      skippedCount: relevance.skipped.length,
      skippedByReason: countByReason(relevance.skipped),
      outOfStockSkippedCount,
      productsFound: products.length,
      relevantFound: products.length,
      inStockRelevantFound,
      relevantWithActionSignal,
      productsExtracted: products.length,
      productsCreated,
      productsUpdated,
      productsUnchanged,
      eventsCreated,
      notificationQueuedCount: notificationSummary.queued,
      notificationSentCount: notificationSummary.sent,
      notificationSkippedCount: notificationSummary.skipped,
      notificationFailedCount: notificationSummary.failed,
      notificationSkipReasons: notificationSummary.skipReasons,
      actionableSuppressionSummary,
      storeWebhookConfigured: Boolean(store.discordWebhookId),
      durationMs
    };
    if (scanJobId) {
      await prisma.scanJob.update({
        where: { id: scanJobId },
        data: { metadata: scanSummary as Prisma.InputJsonValue }
      });
    }
    await prisma.scanLog.create({
      data: {
        storeId: store.id,
        severity: "INFO",
        message: `${store.mode} scan completed for ${store.name}.`,
        context: scanSummary as Prisma.InputJsonValue
      }
    });

    return { productsFound: products.length, eventsCreated, durationMs };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scan failure";
    const finishedAt = new Date();
    const failedStore = await prisma.store.update({
      where: { id: store.id },
      data: {
        lastError: message,
        repeatedFailureCount: { increment: 1 },
        autoPausedAfterFailures:
          store.repeatedFailureCount + 1 >= workerConfig.repeatedFailurePauseThreshold ? true : store.autoPausedAfterFailures,
        active: store.repeatedFailureCount + 1 >= workerConfig.repeatedFailurePauseThreshold ? false : store.active
      }
    });
    if (scanJobId) {
      await prisma.scanJob.update({
        where: { id: scanJobId },
        data: { status: "FAILED", finishedAt, durationMs: finishedAt.getTime() - startedAt.getTime(), error: message }
      });
    }
    await prisma.scanLog.create({
      data: {
        storeId: store.id,
        severity: "ERROR",
        message,
        context: {
          mode: store.mode,
          monitorMode: store.mode,
          fallbackUsed: false,
          productsExtracted: 0,
          ...monitorErrorContext(error)
        } as Prisma.InputJsonValue
      }
    });
    if (failedStore.autoPausedAfterFailures) {
      await prisma.scanLog.create({
        data: {
          storeId: store.id,
          severity: "WARN",
          message: `Store ${store.name} was auto-paused after ${failedStore.repeatedFailureCount} repeated scan failures.`,
          context: {
            repeatedFailureCount: failedStore.repeatedFailureCount,
            threshold: workerConfig.repeatedFailurePauseThreshold,
            mode: store.mode
          }
        }
      });
    }
    throw error;
  }
}
