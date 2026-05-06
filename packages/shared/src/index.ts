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
export type WebhookTarget =
  | "DEFAULT"
  | "POKEMON"
  | "ONE_PIECE"
  | "HIGH_PRIORITY"
  | "ERROR_LOG"
  | "TEST"
  | "RESTOCK"
  | "PRICE_DROP"
  | "PREORDER";

export interface NormalizedProduct {
  title: string;
  normalizedTitle: string;
  url: string;
  canonicalUrl: string;
  imageUrl?: string | null;
  publicCartUrl?: string | null;
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

export {
  CZ_STORE_PRESETS,
  CZ_STORE_PRESET_WEBHOOK_NAMES,
  buildStorePresetNotes,
  resolvePresetWebhookId
} from "./cz-store-presets";
export type { CzStorePreset, StorePresetMode } from "./cz-store-presets";

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

export function normalizeSourceUrl(url: string, baseUrl?: string): string {
  const parsed = new URL(url, baseUrl);
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

export function isNonProductContentTitle(title: string): boolean {
  const normalized = normalizeTitle(title);
  if (!normalized) return true;
  if (/^(bestseller|na prodejne|nedostupne|skladem|vyprodano|predobjednavka|novinka|akce|tip|detail|slide|cist cele)$/.test(normalized)) return true;
  if (/^(nacist dalsich|nacist dalsi|dalsi|vice|zobrazit dalsi)(\s+\d+)?$/.test(normalized)) return true;
  if (/^(proc nakupovat u nas|jak nakupovat|obchodni podminky|ochrana osobnich udaju|cookie lista)$/.test(normalized)) return true;
  if (
    /^(sberatelske karty|jednotlive karty|pokemon karty|pokemon tcg|tcg one piece|boostery|booster boxy|booster balicky|booster bundle|bundle display|battle deck|elite trainer boxy|hotove balicky|sberatelske plechovky|box sety|prislusenstvi|merchandise|asijske pokemon produkty|sety a mixy karet)$/.test(
      normalized
    )
  )
    return true;
  if (/^(booster boxy a specialni boxy)$/.test(normalized)) return true;
  if (/^pokemon (booster boxy|booster boxy a specialni boxy|plechovky|elite trainer box|v box|edice)$/.test(normalized)) return true;
  if (/^jak (zacit|poznat|vybrat|sbirat)\b/.test(normalized)) return true;
  if (/\bna firmy cz$/.test(normalized)) return true;
  if (/\b(firmy cz|zbozi cz|heureka|newsletter|registrace|remarketing)\b/.test(normalized)) return true;
  if (/\b(kusove karty|jednotlive karty|karta samostatne|samostatna karta|bazarove jednotlive karty|single cards?|singles|card singles?|individual card|graded|slabbed)\b/.test(normalized)) return true;
  return false;
}

export function isLikelyAccessoryProduct(title: string): boolean {
  const normalized = normalizeTitle(title);
  const sealedBoxException =
    /\b(booster box|elite trainer box|trainer box|ex box|collection box|ultra premium collection|premium collection|poster collection|pin collection)\b/.test(normalized);
  const sealedTinException = /\b(mini tin|poke ball tin|pokeball tin|pokeball|tin)\b/.test(normalized);
  if (sealedBoxException || sealedTinException) return false;

  const accessoryPatterns = [
    /\bultra pro\b.*\b(deck protector|deck box|pro binder|album|obaly|krabicka|krouzkove album|flip box|toploader|podlozka)\b/,
    /\b(deck protector|deck box|flip box|card sleeves|sleeves|obaly na karty|obaly|album|album na|krouzkove album|krabicka na karty|box na karty|toploader|top loader|playmat|hraci podlozka|podlozka|folie|folia)\b/,
    /\b(a4 album|a5 album|mini album|portfolio|folio|binder album|pro binder|binder|poradac)\b/,
    /\b(figurka|bojova figurka|figure|hracka|darek|darky|plysak|puzzle|plakat|samolepky|prislusenstvi)\b/,
    /\b(model kit|plastic model|ship model|grand ship collection|model lodi|model lod)\b/,
    /\b(plastovy toploader|casual album|prime album|sbiraci album|sberatelske album)\b/
  ];
  return accessoryPatterns.some((pattern) => pattern.test(normalized));
}

const sealedTcgProductPatterns = [
  /\bbooster\b/,
  /\bbooster box\b/,
  /\bbooster bundle\b/,
  /\bbooster display\b/,
  /\benhanced booster display\b/,
  /\bdisplay\b/,
  /\betb\b/,
  /\belite trainer box\b/,
  /\btrainer box\b/,
  /\bblister\b/,
  /\b2 pack blister\b/,
  /\bmini tin\b/,
  /\btin\b/,
  /\bplechovk(a|y)\b/,
  /\bpoke ball tin\b/,
  /\bpokeball tin\b/,
  /\bpoke ball\b/,
  /\bpokeball\b/,
  /\bpremium collection\b/,
  /\bultra premium collection\b/,
  /\bposter collection\b/,
  /\bpin collection\b/,
  /\bcollection\b/,
  /\bstarter ?deck\b/,
  /\bleague battle deck\b/,
  /\bbattle deck\b/,
  /\bbuild battle\b/,
  /\bbuild and battle\b/,
  /\bcard game\b/,
  /\badventni kalendar\b/,
  /\bholiday calendar\b/
];

const sourceContextSealedTcgProductPatterns = [
  /\bbooster\b/,
  /\bbooster box\b/,
  /\bbooster bundle\b/,
  /\bbooster display\b/,
  /\benhanced booster display\b/,
  /\bdisplay\b/,
  /\betb\b/,
  /\belite trainer box\b/,
  /\btrainer box\b/,
  /\bblister\b/,
  /\b2 pack blister\b/,
  /\bmini tin\b/,
  /\btin\b/,
  /\bplechovk(a|y)\b/,
  /\bpoke ball tin\b/,
  /\bpokeball tin\b/,
  /\bpoke ball\b/,
  /\bpokeball\b/,
  /\bpremium collection\b/,
  /\bultra premium collection\b/,
  /\bposter collection\b/,
  /\bpin collection\b/,
  /\bstarter ?deck\b/,
  /\bleague battle deck\b/,
  /\bbattle deck\b/,
  /\bbuild battle\b/,
  /\bbuild and battle\b/
];

function hasSealedTcgProductKeyword(title: string) {
  const normalized = normalizeTitle(title);
  return sealedTcgProductPatterns.some((pattern) => pattern.test(normalized));
}

function hasSourceContextSealedTcgProductKeyword(title: string) {
  const normalized = normalizeTitle(title);
  return sourceContextSealedTcgProductPatterns.some((pattern) => pattern.test(normalized));
}

export function isLikelySealedTcgProductTitle(title: string): boolean {
  const normalized = normalizeTitle(title);
  if (!normalized || isNonProductContentTitle(title) || isLikelyAccessoryProduct(title)) return false;

  const tcgContext =
    /\b(pokemon|pokémon|poke|one piece|tcg|card game|pokemon karty|pokemon karet|op\b|sv\d|me\d)\b/.test(normalized);
  if (!tcgContext) return false;

  return hasSealedTcgProductKeyword(title);
}

export function isRelevantTargetProduct(product: Pick<NormalizedProduct, "title" | "normalizedTitle" | "game" | "category">): boolean {
  if (isNonProductContentTitle(product.title)) return false;
  if (isLikelyAccessoryProduct(product.title)) return false;
  if (isLikelySealedTcgProductTitle(product.title)) return true;
  return product.game !== "UNKNOWN" && hasSourceContextSealedTcgProductKeyword(product.title);
}

export function productIdentityKey(input: Pick<NormalizedProduct, "canonicalUrl" | "normalizedTitle" | "sku" | "ean">, storeId: string): string {
  return [storeId, input.ean || "", input.sku || "", input.canonicalUrl, input.normalizedTitle].join("|");
}

export interface KeywordRuleInput {
  includeKeywords: string[];
  excludeKeywords: string[];
  game: Game;
  category?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  caseInsensitive?: boolean;
  fuzzyMatching?: boolean;
}

function normalizeKeyword(value: string, caseInsensitive = true): string {
  const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return caseInsensitive ? normalized.toLowerCase() : normalized;
}

function fuzzyIncludes(haystack: string, needle: string): boolean {
  const compactHaystack = haystack.replace(/\s+/g, "");
  const compactNeedle = needle.replace(/\s+/g, "");
  return compactHaystack.includes(compactNeedle);
}

export function keywordRuleMatchesProduct(rule: KeywordRuleInput, product: Pick<NormalizedProduct, "title" | "normalizedTitle" | "price" | "game">): boolean {
  if (!isLikelySealedTcgProductTitle(product.title)) {
    return false;
  }

  if (rule.game !== "BOTH" && product.game !== "BOTH" && product.game !== rule.game) {
    return false;
  }

  const caseInsensitive = rule.caseInsensitive ?? true;
  const haystack = normalizeKeyword(`${product.title} ${product.normalizedTitle}`, caseInsensitive);
  const includes = (keyword: string) => {
    const normalizedKeyword = normalizeKeyword(keyword, caseInsensitive);
    return haystack.includes(normalizedKeyword) || Boolean(rule.fuzzyMatching && fuzzyIncludes(haystack, normalizedKeyword));
  };

  if (rule.includeKeywords.length > 0 && !rule.includeKeywords.some(includes)) {
    return false;
  }

  if (rule.excludeKeywords.some(includes)) {
    return false;
  }

  const price = product.price ?? null;
  if (rule.minPrice !== null && rule.minPrice !== undefined && (price === null || price < rule.minPrice)) {
    return false;
  }
  if (rule.maxPrice !== null && rule.maxPrice !== undefined && (price === null || price > rule.maxPrice)) {
    return false;
  }

  return true;
}
