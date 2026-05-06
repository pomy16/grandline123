import type { Game, NormalizedProduct, StoreConfig, StoreMonitor } from "@tcg-monitor/shared";
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
  isValidProductUrl,
  meaningfulProductTitle,
  hasStrongProductSignal,
  cleanProductTitle
} from "./parser-utils";

function inferGameFromProductContext(title: string, href: string, pageUrl: string): Game {
  const titleGame = inferGame(title);
  if (titleGame !== "UNKNOWN") return titleGame;

  const context = normalizeTitle(`${href} ${pageUrl}`);
  if (/\b(lorcana|yu gi oh|yugioh|star wars|riftbound|magic|mtg|flesh and blood|digimon|dragon ball|weiss|altered|gundam|shadowverse|sportovni|sports)\b/.test(context)) {
    return "UNKNOWN";
  }
  if (/\b(pokemon|pokémon)\b/.test(context)) return "POKEMON";
  if (/\bone piece\b|\bone-piece\b/.test(context)) return "ONE_PIECE";
  return "UNKNOWN";
}

export function productFromSelectors(html: string, storeConfig: StoreConfig, pageUrl: string): NormalizedProduct | null {
  const title = selectorText(html, storeConfig.selectors?.title) ?? selectorText(html, "h1");
  const href = selectorHref(html, storeConfig.selectors?.productUrl);
  if (!title) return null;
  if (!meaningfulProductTitle(title, storeConfig) || normalizeTitle(title) === normalizeTitle(storeConfig.name) || !isValidProductUrl(href, storeConfig)) return null;
  const productTitle = title;
  const priceText = selectorText(html, storeConfig.selectors?.price);
  const stockText = [selectorText(html, storeConfig.selectors?.stockStatus), selectorText(html, storeConfig.selectors?.preorderStatus)].filter(Boolean).join(" ");
  const stock = normalizeStockStatus(stockText);
  const canonicalUrl = normalizeUrl(href, storeConfig.baseUrl);
  const imageUrl = selectorImage(html, storeConfig.selectors?.image);
  const price = priceText ? parsePrice(priceText) : null;
  if (!hasStrongProductSignal({ url: canonicalUrl, storeConfig, price, imageUrl })) return null;

  return {
    title: productTitle,
    normalizedTitle: normalizeTitle(productTitle),
    url: canonicalUrl,
    canonicalUrl,
    imageUrl,
    publicCartUrl: publicCartLink(html, storeConfig),
    price,
    currency: storeConfig.currency,
    ...stock,
    sku: null,
    ean: null,
    category: null,
    game: inferGame(productTitle),
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
    const headingText = tag.match(/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/i)?.[0];
    const title =
      [
        attrValue(imageTag, "alt"),
        attrValue(imageTag, "title"),
        attrValue(tag, "aria-label"),
        attrValue(tag, "title"),
        attrValue(tag, "data-name"),
        headingText ? stripHtml(headingText) : null,
        stripHtml(tag)
      ]
        .map((candidate) => (candidate ? cleanProductTitle(candidate) : null))
        .find((candidate) => candidate && meaningfulProductTitle(candidate, storeConfig)) ?? null;
    if (!title) continue;
    if (!meaningfulProductTitle(title, storeConfig) || normalizeTitle(title).length < 4 || normalizeTitle(title) === normalizeTitle(storeConfig.name)) continue;
    const productTitle = title;
    const game = inferGameFromProductContext(productTitle, href, pageUrl);
    if (game === "UNKNOWN" && !/pokemon|pokémon|one[\s-]?piece|tcg|karty|booster|starter|display|etb/i.test(`${productTitle} ${href}`)) continue;

    const localHtml = html.slice(match.index, Math.min(match.index + tag.length + 450, html.length));
    const priceText =
      localHtml.match(/(?:\d{1,3}(?:[ .]\d{3})*|\d+)(?:[,.]\d{1,2})?\s*(?:Kč|CZK|€|EUR)/i)?.[0] ??
      localHtml.match(/(?:Kč|CZK|€|EUR)\s*(?:\d{1,3}(?:[ .]\d{3})*|\d+)(?:[,.]\d{1,2})?/i)?.[0] ??
      null;
    const stock = normalizeStockStatus(localHtml);
    const canonicalUrl = normalizeUrl(href, storeConfig.baseUrl);
    const imageUrl = attrValue(imageTag, "src") ?? attrValue(imageTag, "data-src") ?? attrValue(imageTag, "data-original");
    const price = priceText ? parsePrice(priceText) : null;
    const productCard = /(?:class|data-testid|itemtype)=["'][^"']*(?:product|produkt|item|card|box)/i.test(tag) || /<article\b/i.test(tag);
    if (!hasStrongProductSignal({ url: canonicalUrl, storeConfig, price, imageUrl, productCard })) continue;

    products.push({
      title: productTitle,
      normalizedTitle: normalizeTitle(productTitle),
      url: canonicalUrl,
      canonicalUrl,
      imageUrl,
      publicCartUrl: publicCartLink(localHtml, storeConfig),
      price,
      currency: storeConfig.currency,
      ...stock,
      sku: null,
      ean: null,
      category: null,
      game,
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
