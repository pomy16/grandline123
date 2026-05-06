import type { MonitorMode, Store } from "@prisma/client";
import type { StoreConfig } from "@tcg-monitor/shared";
import { inferGame, isRelevantTargetProduct, normalizeUrl } from "@tcg-monitor/shared";
import { Prisma } from "@prisma/client";
import { SafeHttpClient, MonitorRequestError } from "../http/safe-http-client";
import { createMonitor } from "../monitors";
import { productsFromHtmlDocument } from "../monitors/html-monitor";
import { isValidSourceCandidateUrl } from "../monitors/parser-utils";
import { prisma } from "../prisma";
import { toStoreConfig } from "./store-config";

const discoveryKeywords = /pokemon|pokémon|tcg|one[\s-]?piece|karty|karticky|kartičky|booster|display|starter|etb/i;
const candidateLimit = Number(process.env.DISCOVERY_MAX_CANDIDATES ?? 16);

type CandidateInput = {
  url: string;
  kind: string;
  monitorMode: MonitorMode;
  discoveredFrom: string;
  metadata?: Record<string, unknown>;
};

function safeUrl(value: string, storeConfig: StoreConfig) {
  try {
    const normalized = normalizeUrl(value, storeConfig.baseUrl);
    if (!isValidSourceCandidateUrl(normalized, storeConfig)) return null;
    return normalized;
  } catch {
    return null;
  }
}

function isLikelyTcgSource(url: string) {
  return discoveryKeywords.test(decodeURIComponent(url));
}

function extractUrlsFromXml(xml: string) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim());
}

function extractAnchorUrls(html: string) {
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1].trim());
}

function extractOpenGraphUrls(html: string) {
  return [...html.matchAll(/<meta\b[^>]*(?:property|name)=["']og:url["'][^>]*content=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1].trim());
}

function uniqueCandidates(candidates: CandidateInput[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = candidate.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function errorReason(error: unknown) {
  if (error instanceof MonitorRequestError) {
    if (error.details.status === 403) return `Access denied (${error.details.status})`;
    if (error.details.status === 404) return `Not found (${error.details.status})`;
    if (error.details.status) return `HTTP ${error.details.status}`;
    return error.message;
  }
  if (error instanceof Error && error.message.includes("robots.txt disallows")) return "robots.txt disallows this source";
  return error instanceof Error ? error.message : "Unknown discovery failure";
}

async function discoverMetadataCandidates(storeConfig: StoreConfig) {
  const client = new SafeHttpClient(storeConfig);
  const candidates: CandidateInput[] = [];

  const seedPages = uniqueCandidates(
    storeConfig.listingUrls.map((url) => ({ url: safeUrl(url, storeConfig), kind: "LISTING", monitorMode: storeConfig.mode === "PLAYWRIGHT" ? "PLAYWRIGHT" : "HTML", discoveredFrom: "store.listingUrls" }))
      .filter((candidate): candidate is CandidateInput => Boolean(candidate.url))
  );

  for (const seed of seedPages) {
    candidates.push(seed);
    try {
      const response = await client.fetchText(seed.url, "HTML");
      for (const url of [...extractAnchorUrls(response.body), ...extractOpenGraphUrls(response.body)]) {
        const candidateUrl = safeUrl(url, storeConfig);
        if (candidateUrl && isLikelyTcgSource(candidateUrl)) {
          candidates.push({ url: candidateUrl, kind: "CATEGORY_LINK", monitorMode: "PLAYWRIGHT", discoveredFrom: seed.url });
        }
      }
      for (const product of productsFromHtmlDocument(response.body, storeConfig, seed.url, "discovery-metadata")) {
        if (inferGame(product.title) !== "UNKNOWN" || isLikelyTcgSource(product.canonicalUrl)) {
          candidates.push({ url: product.canonicalUrl, kind: "JSON_LD_PRODUCT", monitorMode: "PLAYWRIGHT", discoveredFrom: seed.url });
        }
      }
    } catch {
      continue;
    }
  }

  const sitemapUrls = ["/sitemap.xml", "/sitemap_index.xml"].map((path) => new URL(path, storeConfig.baseUrl).toString());
  for (const sitemapUrl of sitemapUrls) {
    const normalized = safeUrl(sitemapUrl, storeConfig);
    if (!normalized) continue;
    try {
      const response = await client.fetchText(normalized, "SITEMAP");
      candidates.push({ url: normalized, kind: "SITEMAP", monitorMode: "SITEMAP", discoveredFrom: normalized, metadata: { status: response.status } });
      for (const loc of extractUrlsFromXml(response.body)) {
        const candidateUrl = safeUrl(loc, storeConfig);
        if (candidateUrl && isLikelyTcgSource(candidateUrl)) {
          candidates.push({ url: candidateUrl, kind: "SITEMAP_URL", monitorMode: "PLAYWRIGHT", discoveredFrom: normalized });
        }
      }
    } catch {
      continue;
    }
  }

  for (const rssPath of ["/rss", "/rss.xml", "/feed", "/atom.xml"]) {
    const normalized = safeUrl(rssPath, storeConfig);
    if (!normalized) continue;
    try {
      const response = await client.fetchText(normalized, "RSS");
      if (/rss|atom|<item|<entry/i.test(response.body)) {
        candidates.push({ url: normalized, kind: "RSS", monitorMode: "RSS", discoveredFrom: normalized, metadata: { status: response.status } });
      }
    } catch {
      continue;
    }
  }

  return uniqueCandidates(candidates)
    .filter((candidate) => candidate.kind === "SITEMAP" || candidate.kind === "RSS" || isLikelyTcgSource(candidate.url))
    .slice(0, candidateLimit);
}

export function candidateStatusFromValidatedProducts(productsFound: number) {
  return productsFound > 0 ? "ACTIVE" : "EMPTY";
}

async function validateCandidate(storeConfig: StoreConfig, candidate: CandidateInput) {
  const monitor = createMonitor(candidate.monitorMode);
  try {
    const products = await monitor.scan({
      ...storeConfig,
      mode: candidate.monitorMode,
      listingUrls: [candidate.url]
    });
    const relevantProducts = products.filter(isRelevantTargetProduct);
    const skippedNonTargetProducts = products.length - relevantProducts.length;
    const skippedWarnings = ("warnings" in monitor && Array.isArray(monitor.warnings) ? monitor.warnings.length : 0) + skippedNonTargetProducts;
    return {
      status: candidateStatusFromValidatedProducts(relevantProducts.length),
      productsFound: relevantProducts.length,
      rawProductsFound: products.length,
      skippedNonTargetProducts,
      skippedWarnings,
      reason:
        relevantProducts.length > 0
          ? `Product source successfully extracted ${relevantProducts.length} relevant sealed TCG product(s) from ${products.length} raw product candidate(s).`
          : `Page loaded, but no relevant sealed TCG products were extracted${skippedWarnings > 0 ? `; skipped ${skippedWarnings} non-product or non-target candidate(s)` : ""}.`
    };
  } catch (error) {
    return {
      status: "NEEDS_ATTENTION",
      productsFound: 0,
      rawProductsFound: 0,
      skippedNonTargetProducts: 0,
      skippedWarnings: 0,
      reason: errorReason(error)
    };
  }
}

export async function discoverStoreSources(storeId: string, scanJobId?: string) {
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  const storeConfig = toStoreConfig(store);
  const startedAt = new Date();
  if (scanJobId) {
    await prisma.scanJob.update({ where: { id: scanJobId }, data: { status: "RUNNING", startedAt } });
  }

  try {
    const existingCandidates = await prisma.sourceCandidate.findMany({
      where: { storeId: store.id },
      select: { id: true, url: true, status: true }
    });
    const invalidActiveCandidateIds = existingCandidates
      .filter((candidate) => candidate.status === "ACTIVE" && !isValidSourceCandidateUrl(candidate.url, storeConfig))
      .map((candidate) => candidate.id);
    if (invalidActiveCandidateIds.length > 0) {
      await prisma.sourceCandidate.updateMany({
        where: { id: { in: invalidActiveCandidateIds } },
        data: {
          status: "NEEDS_ATTENTION",
          productsFound: 0,
          reason: "Source URL is no longer safe as a scan source: homepage, article, info, cart, checkout, or off-store URL."
        }
      });
    }

    const discovered = await discoverMetadataCandidates(storeConfig);
    let activeCount = 0;
    let totalProducts = 0;

    for (const candidate of discovered) {
      const validation = await validateCandidate(storeConfig, candidate);
      if (validation.status === "ACTIVE") activeCount += 1;
      totalProducts += validation.productsFound;
      await prisma.sourceCandidate.upsert({
        where: { storeId_url: { storeId: store.id, url: candidate.url } },
        update: {
          kind: candidate.kind,
          monitorMode: candidate.monitorMode,
          status: validation.status,
          productsFound: validation.productsFound,
          reason: validation.reason,
          discoveredFrom: candidate.discoveredFrom,
          metadata: {
            ...(candidate.metadata ?? {}),
            rawProductCandidateCount: validation.rawProductsFound,
            validatedProductCount: validation.productsFound,
            skippedNonProductWarnings: validation.skippedWarnings,
            skippedNonTargetProducts: validation.skippedNonTargetProducts
          } as Prisma.InputJsonValue,
          lastCheckedAt: new Date()
        },
        create: {
          storeId: store.id,
          url: candidate.url,
          kind: candidate.kind,
          monitorMode: candidate.monitorMode,
          status: validation.status,
          productsFound: validation.productsFound,
          reason: validation.reason,
          discoveredFrom: candidate.discoveredFrom,
          metadata: {
            ...(candidate.metadata ?? {}),
            rawProductCandidateCount: validation.rawProductsFound,
            validatedProductCount: validation.productsFound,
            skippedNonProductWarnings: validation.skippedWarnings,
            skippedNonTargetProducts: validation.skippedNonTargetProducts
          } as Prisma.InputJsonValue,
          lastCheckedAt: new Date()
        }
      });
    }

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();
    await prisma.scanLog.create({
      data: {
        storeId: store.id,
        severity: activeCount > 0 ? "INFO" : "WARN",
        message: `Discovery scan completed for ${store.name}.`,
        context: {
          discoveredCandidates: discovered.length,
          activeCandidates: activeCount,
          productsFound: totalProducts,
          mode: "DISCOVERY"
        } as Prisma.InputJsonValue
      }
    });
    if (scanJobId) {
      await prisma.scanJob.update({
        where: { id: scanJobId },
        data: {
          status: "SUCCEEDED",
          finishedAt,
          durationMs,
          productsFound: totalProducts,
          eventsCreated: 0,
          metadata: { type: "discovery", discoveredCandidates: discovered.length, activeCandidates: activeCount }
        }
      });
    }
    return { discoveredCandidates: discovered.length, activeCandidates: activeCount, productsFound: totalProducts, durationMs };
  } catch (error) {
    const finishedAt = new Date();
    const message = errorReason(error);
    if (scanJobId) {
      await prisma.scanJob.update({
        where: { id: scanJobId },
        data: { status: "FAILED", finishedAt, durationMs: finishedAt.getTime() - startedAt.getTime(), error: message, metadata: { type: "discovery" } }
      });
    }
    await prisma.scanLog.create({
      data: {
        storeId: store.id,
        severity: "ERROR",
        message,
        context: { mode: "DISCOVERY" } as Prisma.InputJsonValue
      }
    });
    throw error;
  }
}
