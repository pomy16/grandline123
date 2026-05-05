import type { NormalizedProduct, StoreConfig, StoreMonitor } from "@tcg-monitor/shared";
import { inferGame, normalizeTitle, normalizeUrl, parsePrice } from "@tcg-monitor/shared";
import { SafeHttpClient } from "../http/safe-http-client";
import {
  extractJsonLd,
  productFromUnknown,
  selectorHref,
  selectorImage,
  selectorText,
  stripHtml,
  attrValue,
  normalizeStockStatus,
  uniqueProducts,
  isPurchaseAssistUrl,
  isValidProductUrl
} from "./parser-utils";

export function productFromSelectors(html: string, storeConfig: StoreConfig, pageUrl: string): NormalizedProduct | null {
  const title = selectorText(html, storeConfig.selectors?.title) ?? selectorText(html, "h1");
  const href = selectorHref(html, storeConfig.selectors?.productUrl);
  if (!title || normalizeTitle(title) === normalizeTitle(storeConfig.name) || !isValidProductUrl(href, storeConfig)) return null;
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
    publicCartUrl: publicCartLink(html, storeConfig),
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

export function publicCartLink(html: string, storeConfig: StoreConfig) {
  const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRegex.exec(html))) {
    const href = match[1];
    if (isPurchaseAssistUrl(href, storeConfig.baseUrl)) return normalizeUrl(href, storeConfig.baseUrl);
  }
  return null;
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
    if (/product|products|shop|card|tcg|pokemon|one-piece/i.test(href) && isValidProductUrl(href, storeConfig)) {
      links.add(normalizeUrl(href, storeConfig.baseUrl));
    }
  }
  return [...links].slice(0, Number(process.env.HTML_MONITOR_MAX_PRODUCT_PAGES ?? 25));
}

export function productsFromProductCards(html: string, storeConfig: StoreConfig, pageUrl: string, source: string) {
  const products: NormalizedProduct[] = [];
  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorRegex.exec(html))) {
    const tag = match[0];
    const href = match[1];
    if (!isValidProductUrl(href, storeConfig)) continue;

    const imageTag = tag.match(/<img\b[^>]*>/i)?.[0] ?? "";
    const title = stripHtml(tag) || attrValue(imageTag, "alt") || attrValue(imageTag, "title");
    if (!title || normalizeTitle(title).length < 4 || normalizeTitle(title) === normalizeTitle(storeConfig.name)) continue;
    if (inferGame(title) === "UNKNOWN" && !/pokemon|pokémon|one[\s-]?piece|tcg|karty|booster|starter|display|etb/i.test(`${title} ${href}`)) continue;

    const localHtml = html.slice(Math.max(match.index - 600, 0), Math.min(match.index + tag.length + 900, html.length));
    const priceText =
      localHtml.match(/(?:\d{1,3}(?:[ .]\d{3})*|\d+)(?:[,.]\d{1,2})?\s*(?:Kč|CZK|€|EUR)/i)?.[0] ??
      localHtml.match(/(?:Kč|CZK|€|EUR)\s*(?:\d{1,3}(?:[ .]\d{3})*|\d+)(?:[,.]\d{1,2})?/i)?.[0] ??
      null;
    const stock = normalizeStockStatus(localHtml);
    const canonicalUrl = normalizeUrl(href, storeConfig.baseUrl);

    products.push({
      title,
      normalizedTitle: normalizeTitle(title),
      url: canonicalUrl,
      canonicalUrl,
      imageUrl: attrValue(imageTag, "src") ?? attrValue(imageTag, "data-src") ?? attrValue(imageTag, "data-original"),
      publicCartUrl: publicCartLink(localHtml, storeConfig),
      price: priceText ? parsePrice(priceText) : null,
      currency: storeConfig.currency,
      ...stock,
      sku: null,
      ean: null,
      category: null,
      game: inferGame(title),
      rawData: { source, pageUrl, parser: "product-card" }
    });
  }

  return uniqueProducts(products);
}

export class HtmlMonitor implements StoreMonitor {
  warnings: string[] = [];

  private warn(message: string) {
    if (!this.warnings.includes(message)) this.warnings.push(message);
  }

  async scan(storeConfig: StoreConfig): Promise<NormalizedProduct[]> {
    this.warnings = [];
    const client = new SafeHttpClient(storeConfig);
    const products: NormalizedProduct[] = [];

    for (const listingUrl of storeConfig.listingUrls) {
      const listing = await client.fetchText(listingUrl, "HTML");

      for (const item of extractJsonLd(listing.body)) {
        const product = productFromUnknown(item, storeConfig, "html-monitor-jsonld", (reason) => this.warn(reason));
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
          const product = productFromUnknown(item, storeConfig, "html-monitor-product-jsonld", (reason) => this.warn(reason));
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
  products.push(...productsFromProductCards(html, storeConfig, pageUrl, source));
  const selected = productFromSelectors(html, storeConfig, pageUrl);
  if (selected) products.push({ ...selected, rawData: { source, pageUrl, parser: "selectors" } });
  return uniqueProducts(products);
}
