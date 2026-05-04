import type { NormalizedProduct, StoreConfig, StoreMonitor } from "@tcg-monitor/shared";
import { inferGame, normalizeTitle, normalizeUrl, parsePrice } from "@tcg-monitor/shared";
import { SafeHttpClient } from "../http/safe-http-client";
import {
  extractJsonLd,
  productFromUnknown,
  selectorHref,
  selectorImage,
  selectorText,
  normalizeStockStatus,
  uniqueProducts
} from "./parser-utils";

export function productFromSelectors(html: string, storeConfig: StoreConfig, pageUrl: string): NormalizedProduct | null {
  const title = selectorText(html, storeConfig.selectors?.title) ?? selectorText(html, "h1");
  const href = selectorHref(html, storeConfig.selectors?.productUrl);
  if (!title || !href) return null;
  const priceText = selectorText(html, storeConfig.selectors?.price);
  const stockText = [selectorText(html, storeConfig.selectors?.stockStatus), selectorText(html, storeConfig.selectors?.preorderStatus)].filter(Boolean).join(" ");
  const stock = normalizeStockStatus(stockText);
  const canonicalUrl = normalizeUrl(href, storeConfig.baseUrl);

  return {
    title,
    normalizedTitle: normalizeTitle(title),
    url: canonicalUrl,
    canonicalUrl,
    imageUrl: selectorImage(html, storeConfig.selectors?.image),
    price: priceText ? parsePrice(priceText) : null,
    currency: storeConfig.currency,
    ...stock,
    sku: null,
    ean: null,
    category: null,
    game: inferGame(title),
    rawData: { source: "html-monitor", pageUrl, parser: "selectors" }
  };
}

export function productLinks(html: string, storeConfig: StoreConfig) {
  const links = new Set<string>();
  const selector = storeConfig.selectors?.productUrl;
  const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRegex.exec(html))) {
    const tag = match[0];
    const href = match[1];
    if (selector?.startsWith(".") && !new RegExp(`class=["'][^"']*\\b${selector.slice(1)}\\b`, "i").test(tag)) continue;
    if (selector?.startsWith("#") && !new RegExp(`id=["']${selector.slice(1)}["']`, "i").test(tag)) continue;
    if (/product|products|shop|card|tcg|pokemon|one-piece/i.test(href)) links.add(normalizeUrl(href, storeConfig.baseUrl));
  }
  return [...links].slice(0, Number(process.env.HTML_MONITOR_MAX_PRODUCT_PAGES ?? 25));
}

export class HtmlMonitor implements StoreMonitor {
  async scan(storeConfig: StoreConfig): Promise<NormalizedProduct[]> {
    const client = new SafeHttpClient(storeConfig);
    const products: NormalizedProduct[] = [];

    for (const listingUrl of storeConfig.listingUrls) {
      const listing = await client.fetchText(listingUrl, "HTML");

      for (const item of extractJsonLd(listing.body)) {
        const product = productFromUnknown(item, storeConfig, "html-monitor-jsonld");
        if (product) products.push(product);
      }

      const links = productLinks(listing.body, storeConfig);
      if (links.length === 0) {
        const product = productFromSelectors(listing.body, storeConfig, listing.url);
        if (product) products.push(product);
      }

      for (const link of links) {
        const page = await client.fetchText(link, "HTML");
        for (const item of extractJsonLd(page.body)) {
          const product = productFromUnknown(item, storeConfig, "html-monitor-product-jsonld");
          if (product) products.push(product);
        }
        const selected = productFromSelectors(page.body, storeConfig, page.url);
        if (selected) products.push(selected);
      }
    }

    return uniqueProducts(products);
  }
}

export function productsFromHtmlDocument(html: string, storeConfig: StoreConfig, pageUrl: string, source: string) {
  const products: NormalizedProduct[] = [];
  for (const item of extractJsonLd(html)) {
    const product = productFromUnknown(item, storeConfig, source);
    if (product) products.push(product);
  }
  const selected = productFromSelectors(html, storeConfig, pageUrl);
  if (selected) products.push({ ...selected, rawData: { source, pageUrl, parser: "selectors" } });
  return uniqueProducts(products);
}
