export type StorePresetMode = "API" | "SITEMAP" | "RSS" | "HTML" | "PLAYWRIGHT";

export interface CzStorePreset {
  id: string;
  slug: string;
  name: string;
  webhookName: string;
  baseUrl: string;
  listingUrls: string[];
  mode: StorePresetMode;
  pollingIntervalSeconds: number;
  currency: "CZK";
  country: "CZ";
  language: "cs";
  active: false;
  trusted: boolean;
  recommended: boolean;
  testedStatus: string;
  sourceSummary: string;
  limitation: string;
}

export const CZ_STORE_PRESETS: CzStorePreset[] = [
  {
    id: "preset-cz-alza",
    slug: "cz-alza",
    name: "Alza",
    webhookName: "cz-alza",
    baseUrl: "https://www.alza.cz",
    listingUrls: ["https://www.alza.cz/hracky/levne-pokemon-karty/18879069.htm"],
    mode: "PLAYWRIGHT",
    pollingIntervalSeconds: 300,
    currency: "CZK",
    country: "CZ",
    language: "cs",
    active: false,
    trusted: true,
    recommended: false,
    testedStatus: "needs attention / paused",
    sourceSummary: "Public Alza Pokemon cards listing sorted by price.",
    limitation: "Use browser rendering for diagnostics, but if the site returns HTTP 403 it must remain Needs Attention with zero products/events/alerts."
  },
  {
    id: "preset-cz-dracik",
    slug: "cz-dracik",
    name: "Dráčik",
    webhookName: "cz-dracik",
    baseUrl: "https://www.dracik.cz",
    listingUrls: ["https://www.dracik.cz/pokemon-karticky/"],
    mode: "PLAYWRIGHT",
    pollingIntervalSeconds: 180,
    currency: "CZK",
    country: "CZ",
    language: "cs",
    active: false,
    trusted: true,
    recommended: false,
    testedStatus: "0 products after cart URL safety fix / paused",
    sourceSummary: "Public Dráčik Pokemon cards/product listing page.",
    limitation: "Observed add-to-cart links on the listing and 0 valid products after cart URL filtering; keep paused unless a safer public listing is confirmed."
  },
  {
    id: "preset-cz-smarty",
    slug: "cz-smarty",
    name: "Smarty",
    webhookName: "cz-smarty",
    baseUrl: "https://www.smarty.cz",
    listingUrls: ["https://www.smarty.cz/pokemon-tcg-4c14578", "https://www.smarty.cz/one-piece-tcg-4c14584"],
    mode: "PLAYWRIGHT",
    pollingIntervalSeconds: 180,
    currency: "CZK",
    country: "CZ",
    language: "cs",
    active: false,
    trusted: true,
    recommended: false,
    testedStatus: "needs attention / paused",
    sourceSummary: "Public Smarty Pokemon TCG and One Piece TCG category pages.",
    limitation: "Use browser rendering for diagnostics, but if the site returns HTTP 403 it must remain Needs Attention with zero products/events/alerts."
  },
  {
    id: "preset-cz-pompo",
    slug: "cz-pompo",
    name: "Pompo",
    webhookName: "cz-pompo",
    baseUrl: "https://pompo.cz",
    listingUrls: ["https://pompo.cz/pokemon-tcg/"],
    mode: "PLAYWRIGHT",
    pollingIntervalSeconds: 300,
    currency: "CZK",
    country: "CZ",
    language: "cs",
    active: false,
    trusted: true,
    recommended: false,
    testedStatus: "candidate URL / paused",
    sourceSummary: "Public Pompo Pokemon TCG category page, replacing the broader Pokemon URL that returned 404 in local testing.",
    limitation: "The previous /pokemon/ preset returned 404 or a bad redirect locally. Keep this narrower /pokemon-tcg/ candidate paused until manually tested."
  },
  {
    id: "preset-cz-cardstore",
    slug: "cz-cardstore",
    name: "Cardstore",
    webhookName: "cz-cardstore",
    baseUrl: "https://www.cardstore.cz",
    listingUrls: ["https://www.cardstore.cz/pokemon-produkty/", "https://www.cardstore.cz/one-piece-tcg/"],
    mode: "PLAYWRIGHT",
    pollingIntervalSeconds: 180,
    currency: "CZK",
    country: "CZ",
    language: "cs",
    active: false,
    trusted: true,
    recommended: false,
    testedStatus: "fetch failed / paused",
    sourceSummary: "Public Cardstore Pokemon products and One Piece TCG category pages.",
    limitation: "Observed fetch failure; keep paused unless a safe working public listing URL is confirmed."
  },
  {
    id: "preset-cz-luxor",
    slug: "cz-luxor",
    name: "Luxor",
    webhookName: "cz-luxor",
    baseUrl: "https://www.luxor.cz",
    listingUrls: ["https://www.luxor.cz/clanek/727/pokemon-day"],
    mode: "PLAYWRIGHT",
    pollingIntervalSeconds: 180,
    currency: "CZK",
    country: "CZ",
    language: "cs",
    active: false,
    trusted: true,
    recommended: false,
    testedStatus: "candidate URL / paused",
    sourceSummary: "Public Luxor Pokemon Day page that lists Pokemon TCG products, replacing the publisher page that extracted 0 products locally.",
    limitation: "Observed 0 products from the previous publisher source. Keep this Pokemon Day candidate paused until manual scan quality is confirmed."
  },
  {
    id: "preset-cz-tolarie",
    slug: "cz-tolarie",
    name: "Tolarie",
    webhookName: "cz-tolarie",
    baseUrl: "https://www.tolarie.cz",
    listingUrls: ["https://www.tolarie.cz/koupit_produkty/katalog/48-pokemon-produkty/", "https://www.tolarie.cz/koupit_produkty/katalog/70-one-piece/"],
    mode: "PLAYWRIGHT",
    pollingIntervalSeconds: 180,
    currency: "CZK",
    country: "CZ",
    language: "cs",
    active: false,
    trusted: true,
    recommended: false,
    testedStatus: "generic page skipped / paused",
    sourceSummary: "Public Tolarie Pokemon products and One Piece TCG catalog pages.",
    limitation: "Observed generic homepage/category data; parser should skip non-product homepage/category entries and complete with 0 products when no real products are present."
  },
  {
    id: "preset-cz-knihy-dobrovsky",
    slug: "cz-knihy-dobrovsky",
    name: "Knihy Dobrovský",
    webhookName: "cz-knihy-dobrovsky",
    baseUrl: "https://www.knihydobrovsky.cz",
    listingUrls: ["https://www.knihydobrovsky.cz/pokemon-tcg"],
    mode: "PLAYWRIGHT",
    pollingIntervalSeconds: 300,
    currency: "CZK",
    country: "CZ",
    language: "cs",
    active: false,
    trusted: true,
    recommended: true,
    testedStatus: "working",
    sourceSummary: "Public Knihy Dobrovský Pokemon TCG category page.",
    limitation: "Observed successful HTML scan with real products, images, and prices. Recommended as the first store to enable and test."
  },
  {
    id: "preset-cz-vesely-drak",
    slug: "cz-vesely-drak",
    name: "Veselý Drak",
    webhookName: "cz-vesely-drak",
    baseUrl: "https://www.vesely-drak.cz",
    listingUrls: ["https://www.vesely-drak.cz/produkty/boostery/", "https://www.vesely-drak.cz/produkty/one-piece-card-game/"],
    mode: "PLAYWRIGHT",
    pollingIntervalSeconds: 180,
    currency: "CZK",
    country: "CZ",
    language: "cs",
    active: false,
    trusted: true,
    recommended: false,
    testedStatus: "candidate / paused",
    sourceSummary: "Public Veselý Drak Pokemon booster and One Piece Card Game category pages, rendered with Playwright for dynamic DOM readiness.",
    limitation: "Public category pages look suitable from search/manual HEAD checks, but keep paused until local scan quality is confirmed."
  },
  {
    id: "preset-cz-tcgkarty",
    slug: "cz-tcgkarty",
    name: "TCG Karty",
    webhookName: "cz-tcgkarty",
    baseUrl: "https://www.tcgkarty.cz",
    listingUrls: ["https://www.tcgkarty.cz/tcg-pokemon", "https://www.tcgkarty.cz/tcg-one-piece"],
    mode: "PLAYWRIGHT",
    pollingIntervalSeconds: 180,
    currency: "CZK",
    country: "CZ",
    language: "cs",
    active: false,
    trusted: true,
    recommended: false,
    testedStatus: "candidate / paused",
    sourceSummary: "Public TCG Karty Pokemon and One Piece category pages. The site also exposes a sitemap, but these focused categories avoid broad full-store scanning.",
    limitation: "Category pages include many singles and add-to-cart controls; keep keyword filters and cart URL safety enabled and test manually."
  },
  {
    id: "preset-cz-gengar",
    slug: "cz-gengar",
    name: "Gengar.cz",
    webhookName: "cz-gengar",
    baseUrl: "https://www.gengar.cz",
    listingUrls: ["https://www.gengar.cz/pokemon", "https://www.gengar.cz/one-piece"],
    mode: "PLAYWRIGHT",
    pollingIntervalSeconds: 180,
    currency: "CZK",
    country: "CZ",
    language: "cs",
    active: false,
    trusted: true,
    recommended: false,
    testedStatus: "candidate / paused",
    sourceSummary: "Public Gengar.cz Pokemon and One Piece category pages, rendered with Playwright for dynamic DOM readiness.",
    limitation: "Upgates category pages can include broad products and purchase buttons; keep paused until manual scan output is reviewed."
  },
  {
    id: "preset-cz-hranane-tu",
    slug: "cz-hranane-tu",
    name: "Hra na netu",
    webhookName: "cz-hranane-tu",
    baseUrl: "https://www.hrananetu.cz",
    listingUrls: ["https://www.hrananetu.cz/kategorie-pokemon"],
    mode: "PLAYWRIGHT",
    pollingIntervalSeconds: 300,
    currency: "CZK",
    country: "CZ",
    language: "cs",
    active: false,
    trusted: true,
    recommended: false,
    testedStatus: "candidate / paused",
    sourceSummary: "Public Hra na netu Pokemon category page. No safe One Piece category was found during review.",
    limitation: "Pokemon category appears public, but keep paused until local scan confirms real products and no generic page entries."
  }
];

export const CZ_STORE_PRESET_WEBHOOK_NAMES = CZ_STORE_PRESETS.map((preset) => preset.webhookName);

export function resolvePresetWebhookId(preset: Pick<CzStorePreset, "webhookName">, webhookIdsByName: ReadonlyMap<string, string>) {
  return webhookIdsByName.get(preset.webhookName) ?? null;
}

export function buildStorePresetNotes(preset: CzStorePreset, hasWebhook: boolean) {
  const webhookNote = hasWebhook
    ? `Store-specific Discord route: ${preset.webhookName}.`
    : `No Discord webhook record named ${preset.webhookName} was found during seed; assign it in Stores after creating it in Settings.`;
  return [
    `Preset: ${preset.slug}.`,
    `Source: ${preset.sourceSummary}`,
    `Recommended interval: ${preset.pollingIntervalSeconds} seconds.`,
    `Tested status: ${preset.testedStatus}.`,
    `Recommended now: ${preset.recommended ? "yes" : "no"}.`,
    `Mode: ${preset.mode}.`,
    `Limitations: ${preset.limitation}`,
    webhookNote,
    "Created paused by default for one-by-one manual testing. Purchase assist only; no checkout automation."
  ].join(" ");
}
