import type { NormalizedProduct, StockStatus, StoreConfig } from "@tcg-monitor/shared";
import { inferGame, isNonProductContentTitle, normalizeTitle, normalizeUrl, parsePrice } from "@tcg-monitor/shared";

export function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripHtml(value: string) {
  return decodeEntities(value.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " "));
}

export function attrValue(tag: string, attr: string) {
  const match = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match?.[1] ? decodeEntities(match[1]) : null;
}

export function normalizeStockStatus(value: unknown): { stockStatus: StockStatus; isAvailable: boolean; isPreorder: boolean } {
  const normalized = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const preorder = /pre[\s-]?order|preorder|predobjed|reservation|reserve/.test(normalized);
  const out = /out[\s-]?of[\s-]?stock|sold[\s-]?out|unavailable|not available|vyprod|ausverkauft|non disponible/.test(normalized);
  const inStock = /in[\s-]?stock|instock|available|skladem|na sklade|dostupne|lager|add to cart|buy now/.test(normalized);
  if (preorder) return { stockStatus: "PREORDER", isAvailable: true, isPreorder: true };
  if (out) return { stockStatus: "OUT_OF_STOCK", isAvailable: false, isPreorder: false };
  if (inStock || value === true) return { stockStatus: "IN_STOCK", isAvailable: true, isPreorder: false };
  return { stockStatus: "UNKNOWN", isAvailable: false, isPreorder: false };
}

export function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

export function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["products", "items", "data", "results", "nodes"]) {
      if (Array.isArray(record[key])) return record[key] as unknown[];
    }
  }
  return [];
}

function normalizePathForSafety(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function isPurchaseAssistUrl(url: string, baseUrl?: string): boolean {
  try {
    const parsed = new URL(url, baseUrl);
    const safePath = normalizePathForSafety(`${parsed.pathname}?${parsed.searchParams.toString()}`);
    const segments = safePath.split(/[/?#&=_-]+/).filter(Boolean);
    if (segments.some((segment) => ["basket", "cart", "checkout", "order", "payment", "objednavka", "kosik", "platba", "add"].includes(segment))) return true;
    return /addtocart|add-to-cart|add_to_cart|nakupni-kosik|pridat-do-kosiku|vlozit-do-kosiku|pokladna/.test(safePath);
  } catch {
    return false;
  }
}

export function isValidSourceCandidateUrl(url: string | null, storeConfig: StoreConfig): url is string {
  if (!url) return false;
  if (isPurchaseAssistUrl(url, storeConfig.baseUrl)) return false;
  try {
    const parsed = new URL(url, storeConfig.baseUrl);
    const base = new URL(storeConfig.baseUrl);
    const path = normalizePathForSafety(parsed.pathname).replace(/\/+$/, "");
    const segments = path.split("/").filter(Boolean);
    if (parsed.origin !== base.origin) return false;
    if (segments.length === 0) return false;
    if (/\/(?:blog|clanek|clanky|clanky-videa|clanky_videa|article|articles|magazin|navod|guide|poradna)(?:\/|$)/.test(`${path}/`)) return false;
    if (/(^|\/)(jak-|proc-|ochrana-|osobni-udaje|obchodni-podminky|cookie|kontakt|o-nas|reklamace|doprava|platba|spustili-jsme)/.test(path)) return false;
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function isSameUrl(first: string, second: string) {
  try {
    return normalizeUrl(first) === normalizeUrl(second);
  } catch {
    return false;
  }
}

export function isProductControlTitle(title: string | null): boolean {
  if (!title) return true;
  const normalized = normalizeTitle(title);
  if (!normalized) return true;
  if (isNonProductContentTitle(title)) return true;
  if (/^(nacist dalsich|nacist dalsi|dalsi|vice|zobrazit dalsi)(\s+\d+)?$/.test(normalized)) return true;
  return [
    "nedostupne",
    "skladem",
    "vyprodano",
    "predobjednavka",
    "out of stock",
    "in stock",
    "available",
    "unavailable",
    "bestseller",
    "na prodejne",
    "novinka",
    "akce",
    "tip",
    "proc nakupovat u nas",
    "jak poznat falesne karty",
    "sberatelske karty"
  ].includes(normalized);
}

export function cleanProductTitle(title: string) {
  return decodeEntities(title)
    .replace(/^\s*\d+\s+(?=\S)/, "")
    .replace(/\b(Bestseller|Novinka|Akce|Tip|Na prodejně|Skladem online|Skladem v prodejně|Dostupné v jiných prodejnách|Nedostupné)\b/gi, " ")
    .replace(/DMOC:\s*(?:\d{1,3}(?:[ .]\d{3})*|\d+)(?:[,.]\d{1,2})?\s*(?:Kč|CZK)/gi, " ")
    .replace(/(?:\d{1,3}(?:[ .]\d{3})*|\d+)(?:[,.]\d{1,2})?\s*(?:Kč|CZK|€|EUR)/gi, " ")
    .replace(/\s+-\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function hasProductDetailUrlPattern(url: string | null, storeConfig: StoreConfig): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url, storeConfig.baseUrl);
    const path = normalizePathForSafety(parsed.pathname);
    const base = new URL(storeConfig.baseUrl);
    if (parsed.origin !== base.origin) return false;
    if (/\/hra\//.test(path)) return true;
    if (/(?:^|[-/])\d{3,}(?:[-/]|$)/.test(path)) return true;
    return /\/(?:produkt|product|detail|zbozi|item|karta|single)\//.test(path);
  } catch {
    return false;
  }
}

export function isLikelySourcePageUrl(url: string | null, storeConfig: StoreConfig): boolean {
  if (!url) return true;
  if (isPurchaseAssistUrl(url, storeConfig.baseUrl)) return true;
  try {
    const canonical = normalizeUrl(url, storeConfig.baseUrl);
    const parsed = new URL(canonical);
    const base = new URL(storeConfig.baseUrl);
    const path = normalizePathForSafety(parsed.pathname).replace(/\/+$/, "");
    const segments = path.split("/").filter(Boolean);
    if (parsed.origin !== base.origin) return true;
    if (/firmy\.cz$/i.test(parsed.hostname)) return true;
    if (isGenericProductUrl(canonical, storeConfig)) return true;
    if (segments.length === 0) return true;
    if (/\/(?:publisher|nakladatel|category|kategorie|katalog|search|vyhledavani|strana|page|blog|clanek|article|magazin|navod|guide|poradna|jak-nakupovat|osobni-udaje)(?:\/|$)/.test(`${path}/`)) return true;
    if (/(^|\/)(jak-|proc-|ochrana-|obchodni-podminky|cookie|kontakt|reklamace|doprava|platba)/.test(path)) return true;
    if (/load-more|loadmore|nacist|dalsi|pagination|ajax/.test(path)) return true;
    if (["pokemon-tcg", "pokemon", "booster", "boostery", "konverzacni-karty", "one-piece", "one-piece-card-game"].includes(segments.join("/"))) return true;
    if (
      segments.length <= 2 &&
      /^(boosters?|boostery|booster-box(?:es)?|booster-boxy|elite-trainer-boxy|hotove-balicky|sberatelske-plechovky|box-sety|prislusenstvi|merchandise|asijske-pokemon-produkty|sety-a-mixy-karet)$/.test(
        segments[segments.length - 1] ?? ""
      )
    ) {
      return true;
    }
    for (const key of parsed.searchParams.keys()) {
      if (/^(page|p|sort|filter|q|s|search|category|manufacturer|publisher|limit|offset|country_id|do)$/i.test(key)) return true;
    }
    return false;
  } catch {
    return true;
  }
}

export function isGenericProductUrl(url: string, storeConfig: StoreConfig): boolean {
  try {
    const canonical = normalizeUrl(url, storeConfig.baseUrl);
    const parsed = new URL(canonical);
    const base = new URL(storeConfig.baseUrl);
    if (parsed.origin === base.origin && (parsed.pathname === "/" || parsed.pathname === "")) return true;
    return storeConfig.listingUrls.some((listingUrl) => isSameUrl(canonical, normalizeUrl(listingUrl, storeConfig.baseUrl)));
  } catch {
    return true;
  }
}

export function isValidProductUrl(url: string | null, storeConfig: StoreConfig): url is string {
  if (!url) return false;
  if (isPurchaseAssistUrl(url, storeConfig.baseUrl)) return false;
  return !isLikelySourcePageUrl(url, storeConfig);
}

export function meaningfulProductTitle(title: string | null, storeConfig: StoreConfig) {
  if (!title) return false;
  const normalized = normalizeTitle(title);
  if (normalized.length < 3) return false;
  if (normalized === normalizeTitle(storeConfig.name)) return false;
  if (isProductControlTitle(title)) return false;
  return !["home", "homepage", "uvodni stranka", "eshop", "katalog"].includes(normalized);
}

export function hasStrongProductSignal(input: {
  url: string | null;
  storeConfig: StoreConfig;
  price?: number | null;
  imageUrl?: string | null;
  sku?: string | null;
  ean?: string | null;
  jsonLdProduct?: boolean;
  productCard?: boolean;
}) {
  return Boolean(
    input.price !== null && input.price !== undefined ||
      input.imageUrl ||
      input.sku ||
      input.ean ||
      input.jsonLdProduct ||
      input.productCard ||
      hasProductDetailUrlPattern(input.url, input.storeConfig)
  );
}

function firstValidProductUrl(storeConfig: StoreConfig, ...values: unknown[]) {
  for (const value of values) {
    const candidate = pickString(value);
    if (isValidProductUrl(candidate, storeConfig)) return normalizeUrl(candidate, storeConfig.baseUrl);
  }
  return null;
}

function firstPublicCartUrl(storeConfig: StoreConfig, ...values: unknown[]) {
  for (const value of values) {
    const candidate = pickString(value);
    if (candidate && isPurchaseAssistUrl(candidate, storeConfig.baseUrl)) return normalizeUrl(candidate, storeConfig.baseUrl);
  }
  return null;
}

function firstRecord(value: unknown): Record<string, unknown> {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && typeof candidate === "object" ? (candidate as Record<string, unknown>) : {};
}

function firstImageUrl(value: unknown) {
  const image = Array.isArray(value) ? value[0] : value;
  if (typeof image === "string") return image;
  if (image && typeof image === "object") {
    const record = image as Record<string, unknown>;
    return pickString(record.url, record.contentUrl, record.thumbnailUrl);
  }
  return null;
}

function firstPriceValue(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim()) return parsePrice(value);
  }
  return null;
}

function typeIncludes(value: unknown, expected: string) {
  const values = Array.isArray(value) ? value : [value];
  return values.some((candidate) => typeof candidate === "string" && new RegExp(`\\b${expected}\\b`, "i").test(candidate));
}

export function productFromUnknown(item: unknown, storeConfig: StoreConfig, source: string, onReject?: (reason: string) => void): NormalizedProduct | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  const offer = firstRecord(record.offers);
  const priceSpecification = firstRecord(offer.priceSpecification ?? record.priceSpecification);
  const rawTitle = pickString(record.title, record.name, record.productName, record.headline);
  const title = rawTitle ? cleanProductTitle(rawTitle) : null;
  const canonicalUrl = firstValidProductUrl(storeConfig, record.productUrl, record.url, record.link, record["@id"], offer.url);
  const jsonLdProduct = typeIncludes(record["@type"] ?? record.type, "Product");
  const price = firstPriceValue(record.price, record.salePrice, record.currentPrice, offer.price, priceSpecification.price);
  const imageUrl = pickString(record.imageUrl, firstImageUrl(record.image), record.thumbnail, record.thumbnailUrl);
  const sku = pickString(record.sku, record.mpn, record.productCode);
  const ean = pickString(record.ean, record.gtin, record.gtin13, record.barcode);
  if (!meaningfulProductTitle(title, storeConfig)) {
    if (title) onReject?.(`Skipped generic or non-product title "${title}".`);
    return null;
  }
  if (!canonicalUrl) {
    const rejectedUrl = pickString(record.productUrl, record.url, record.link, record["@id"], offer.url);
    if (rejectedUrl) onReject?.(`Skipped non-product URL ${rejectedUrl}.`);
    return null;
  }
  if (!hasStrongProductSignal({ url: canonicalUrl, storeConfig, price, imageUrl, sku, ean, jsonLdProduct })) {
    onReject?.(`Skipped product candidate without strong product signal: ${title}.`);
    return null;
  }
  const stock = normalizeStockStatus(pickString(record.stockStatus, record.availability, record.available, record.inStock, offer.availability) ?? record.isAvailable);
  const publicCartUrl = firstPublicCartUrl(storeConfig, record.publicCartUrl, record.addToCartUrl, record.add_to_cart_url, record.cartUrl, record.buyUrl, record.addUrl, offer.url);

  return {
    title: title!,
    normalizedTitle: normalizeTitle(title!),
    url: canonicalUrl,
    canonicalUrl,
    imageUrl,
    publicCartUrl,
    price,
    currency: pickString(record.currency, record.priceCurrency, offer.priceCurrency, priceSpecification.priceCurrency) ?? storeConfig.currency,
    ...stock,
    sku,
    ean,
    category: pickString(record.category, record.productType, record.collection),
    game: inferGame(title!),
    rawData: { source, item }
  };
}

export function uniqueProducts(products: NormalizedProduct[]) {
  const byIdentity = new Map<string, NormalizedProduct>();
  const aliases = new Map<string, string>();
  const score = (product: NormalizedProduct) =>
    [
      product.price !== null && product.price !== undefined,
      Boolean(product.imageUrl),
      Boolean(product.sku),
      Boolean(product.ean),
      product.stockStatus !== "UNKNOWN",
      product.game !== "UNKNOWN"
    ].filter(Boolean).length;

  for (const product of products) {
    const identities = [`url:${product.canonicalUrl}`, product.sku ? `sku:${product.sku}` : null, product.ean ? `ean:${product.ean}` : null].filter(
      (value): value is string => Boolean(value)
    );
    const key = identities.map((identity) => aliases.get(identity)).find(Boolean) ?? identities[0];
    const existing = byIdentity.get(key);
    if (!existing || score(product) > score(existing)) {
      byIdentity.set(key, product);
    }
    for (const identity of identities) aliases.set(identity, key);
  }

  return Array.from(byIdentity.values());
}

export function extractJsonLd(html: string): unknown[] {
  const items: unknown[] = [];
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
  const flatten = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) flatten(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    items.push(record);

    if (Array.isArray(record["@graph"])) flatten(record["@graph"]);
    if (typeIncludes(record["@type"], "ItemList") || record.itemListElement) flatten(record.itemListElement);
    if (typeIncludes(record["@type"], "ListItem") || record.item) flatten(record.item);
  };

  for (const script of scripts) {
    const raw = script.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    try {
      flatten(JSON.parse(raw));
    } catch {
      continue;
    }
  }
  return items;
}

export function selectorText(html: string, selector?: string | null) {
  if (!selector) return null;
  if (selector.startsWith("meta[")) {
    const property = selector.match(/(?:property|name)=["']?([^"'\]]+)/i)?.[1];
    if (!property) return null;
    const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`, "i"))?.[0];
    return tag ? attrValue(tag, "content") : null;
  }
  if (selector.startsWith(".")) {
    const className = selector.slice(1);
    const match = html.match(new RegExp(`<([a-z0-9-]+)[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>[\\s\\S]*?<\\/\\1>`, "i"));
    return match?.[0] ? stripHtml(match[0]) : null;
  }
  if (selector.startsWith("#")) {
    const id = selector.slice(1);
    const match = html.match(new RegExp(`<([a-z0-9-]+)[^>]*id=["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>[\\s\\S]*?<\\/\\1>`, "i"));
    return match?.[0] ? stripHtml(match[0]) : null;
  }
  const match = html.match(new RegExp(`<${selector}[^>]*>[\\s\\S]*?<\\/${selector}>`, "i"));
  return match?.[0] ? stripHtml(match[0]) : null;
}

export function selectorHref(html: string, selector?: string | null) {
  if (!selector) return null;
  const tag = selector.startsWith(".")
    ? html.match(new RegExp(`<a[^>]*class=["'][^"']*\\b${selector.slice(1)}\\b[^"']*["'][^>]*>`, "i"))?.[0]
    : html.match(/<a[^>]+href=["'][^"']+["'][^>]*>/i)?.[0];
  return tag ? attrValue(tag, "href") : null;
}

export function selectorImage(html: string, selector?: string | null) {
  const tag = selector?.startsWith(".")
    ? html.match(new RegExp(`<img[^>]*class=["'][^"']*\\b${selector.slice(1)}\\b[^"']*["'][^>]*>`, "i"))?.[0]
    : html.match(/<img[^>]+src=["'][^"']+["'][^>]*>/i)?.[0];
  return tag ? attrValue(tag, "src") : null;
}
