export type StorePresetMode = "API" | "SITEMAP" | "RSS" | "HTML";

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
    mode: "HTML",
    pollingIntervalSeconds: 300,
    currency: "CZK",
    country: "CZ",
    language: "cs",
    active: false,
    trusted: true,
    recommended: false,
    testedStatus: "403 / paused",
    sourceSummary: "Public Alza Pokemon cards listing sorted by price.",
    limitation: "Observed HTTP 403 for automated public requests; keep paused and rely on existing failure/backoff handling."
  },
  {
    id: "preset-cz-dracik",
    slug: "cz-dracik",
    name: "Dráčik",
    webhookName: "cz-dracik",
    baseUrl: "https://www.dracik.cz",
    listingUrls: ["https://www.dracik.cz/pokemon-karticky/"],
    mode: "HTML",
    pollingIntervalSeconds: 180,
    currency: "CZK",
    country: "CZ",
    language: "cs",
    active: false,
    trusted: true,
    recommended: false,
    testedStatus: "cart URL issue / paused",
    sourceSummary: "Public Dráčik Pokemon cards/product listing page.",
    limitation: "Observed add-to-cart links on the listing; monitor must ignore basket/add URLs and keep any extracted cart URL as purchase-assist metadata only."
  },
  {
    id: "preset-cz-smarty",
    slug: "cz-smarty",
    name: "Smarty",
    webhookName: "cz-smarty",
    baseUrl: "https://www.smarty.cz",
    listingUrls: ["https://www.smarty.cz/pokemon-tcg-4c14578", "https://www.smarty.cz/one-piece-tcg-4c14584"],
    mode: "HTML",
    pollingIntervalSeconds: 180,
    currency: "CZK",
    country: "CZ",
    language: "cs",
    active: false,
    trusted: true,
    recommended: false,
    testedStatus: "403 / paused",
    sourceSummary: "Public Smarty Pokemon TCG and One Piece TCG category pages.",
    limitation: "Observed HTTP 403 for automated public requests; keep paused unless a safe public source works."
  },
  {
    id: "preset-cz-pompo",
    slug: "cz-pompo",
    name: "Pompo",
    webhookName: "cz-pompo",
    baseUrl: "https://pompo.cz",
    listingUrls: ["https://pompo.cz/pokemon/"],
    mode: "HTML",
    pollingIntervalSeconds: 300,
    currency: "CZK",
    country: "CZ",
    language: "cs",
    active: false,
    trusted: true,
    recommended: false,
    testedStatus: "404 / paused",
    sourceSummary: "Public Pompo Pokemon category page with Pokemon TCG items mixed with toys.",
    limitation: "Observed HTTP 404 for the preset URL; keep paused until a safe working public listing is confirmed."
  },
  {
    id: "preset-cz-cardstore",
    slug: "cz-cardstore",
    name: "Cardstore",
    webhookName: "cz-cardstore",
    baseUrl: "https://www.cardstore.cz",
    listingUrls: ["https://www.cardstore.cz/pokemon-produkty/", "https://www.cardstore.cz/one-piece-tcg/"],
    mode: "HTML",
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
    listingUrls: ["https://www.luxor.cz/nakladatel/4415"],
    mode: "HTML",
    pollingIntervalSeconds: 180,
    currency: "CZK",
    country: "CZ",
    language: "cs",
    active: false,
    trusted: true,
    recommended: false,
    testedStatus: "0 products / paused",
    sourceSummary: "Public Luxor publisher/listing page for Pokemon Company products.",
    limitation: "Observed 0 extracted products; keep paused and review the source URL before enabling."
  },
  {
    id: "preset-cz-tolarie",
    slug: "cz-tolarie",
    name: "Tolarie",
    webhookName: "cz-tolarie",
    baseUrl: "https://www.tolarie.cz",
    listingUrls: ["https://www.tolarie.cz/koupit_produkty/katalog/48-pokemon-produkty/", "https://www.tolarie.cz/koupit_produkty/katalog/70-one-piece/"],
    mode: "HTML",
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
    mode: "HTML",
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
