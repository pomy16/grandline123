export type MonitorMode = "API" | "SITEMAP" | "RSS" | "HTML" | "PLAYWRIGHT" | "MOCK";
export type Game = "POKEMON" | "ONE_PIECE" | "BOTH" | "UNKNOWN";
export type StockStatus = "IN_STOCK" | "OUT_OF_STOCK" | "PREORDER" | "UNKNOWN";
export type EventType =
  | "NEW_PRODUCT"
  | "RESTOCK"
  | "PRICE_DROP"
  | "PRICE_INCREASE"
  | "SOLD_OUT"
  | "PREORDER_OPENED"
  | "PRODUCT_UPDATED";
export type AlertPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
export type WebhookTarget = "DEFAULT" | "POKEMON" | "ONE_PIECE" | "HIGH_PRIORITY" | "ERROR_LOG";

export interface NormalizedProduct {
  title: string;
  normalizedTitle: string;
  url: string;
  canonicalUrl: string;
  imageUrl?: string | null;
  price?: number | null;
  currency: string;
  stockStatus: StockStatus;
  isAvailable: boolean;
  isPreorder: boolean;
  sku?: string | null;
  ean?: string | null;
  category?: string | null;
  game: Game;
  rawData?: unknown;
}

export interface StoreConfig {
  id: string;
  name: string;
  baseUrl: string;
  listingUrls: string[];
  apiEndpoint?: string | null;
  mode: MonitorMode;
  pollingIntervalSeconds: number;
  currency: string;
  country?: string | null;
  language?: string | null;
  active: boolean;
  requestHeaders?: Record<string, string> | null;
  selectors?: {
    productUrl?: string | null;
    title?: string | null;
    price?: string | null;
    image?: string | null;
    stockStatus?: string | null;
    preorderStatus?: string | null;
  };
}

export interface StoreMonitor {
  scan(storeConfig: StoreConfig): Promise<NormalizedProduct[]>;
}

export const complianceGuardrails = [
  "Do not bypass CAPTCHA, queues, login protections, anti-bot systems, rate limits, or checkout restrictions.",
  "Do not implement proxy rotation, fingerprint evasion, or protection-bypass logic.",
  "Prefer official APIs, public JSON endpoints, RSS feeds, sitemap.xml, and structured data.",
  "Use HTML parsing only for publicly accessible product or listing pages.",
  "Purchase assist may open public product or cart links, but checkout remains manual."
];

export function normalizeTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeUrl(url: string, baseUrl?: string): string {
  const parsed = new URL(url, baseUrl);
  parsed.hash = "";
  parsed.searchParams.sort();
  return parsed.toString();
}

export function parsePrice(value: string): number | null {
  const normalized = value
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "")
    .replace(/,(?=\d{1,2}$)/, ".")
    .replace(/,/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function inferGame(title: string): Game {
  const normalized = normalizeTitle(title);
  const pokemon = normalized.includes("pokemon") || normalized.includes("pokémon");
  const onePiece = normalized.includes("one piece") || normalized.includes("op booster") || normalized.includes("starter deck");
  if (pokemon && onePiece) return "BOTH";
  if (pokemon) return "POKEMON";
  if (onePiece) return "ONE_PIECE";
  return "UNKNOWN";
}

export function productIdentityKey(input: Pick<NormalizedProduct, "canonicalUrl" | "normalizedTitle" | "sku" | "ean">, storeId: string): string {
  return [storeId, input.ean || "", input.sku || "", input.canonicalUrl, input.normalizedTitle].join("|");
}
