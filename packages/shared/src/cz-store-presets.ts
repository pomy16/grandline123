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
    sourceSummary: "Public Alza Pokemon cards listing sorted by price.",
    limitation: "Alza can return HTTP 403 to automated public requests; keep paused until tested and rely on existing failure/backoff handling."
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
    sourceSummary: "Public Dráčik Pokemon cards/product listing page.",
    limitation: "Listing can include broad toy/category content; review scan previews before enabling alerts."
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
    sourceSummary: "Public Smarty Pokemon TCG and One Piece TCG category pages.",
    limitation: "Category pages are public HTML; prefer manual selector review before activating."
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
    sourceSummary: "Public Pompo Pokemon category page with Pokemon TCG items mixed with toys.",
    limitation: "Pokemon category includes non-card merchandise; keyword rules should filter TCG products."
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
    sourceSummary: "Public Cardstore Pokemon products and One Piece TCG category pages.",
    limitation: "Shoptet-style category HTML can include sold-out products; verify stock parsing in scan previews."
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
    sourceSummary: "Public Luxor publisher/listing page for Pokemon Company products.",
    limitation: "Luxor source may include Pokemon books and merch, not only sealed TCG; keep keyword filters enabled."
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
    sourceSummary: "Public Tolarie Pokemon products and One Piece TCG catalog pages.",
    limitation: "Catalog pages are paginated; start with page one and broaden only after manual testing."
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
    sourceSummary: "Public Knihy Dobrovský Pokemon TCG category page.",
    limitation: "Availability can include supplier stock and sold-out items; verify event quality before enabling alerts."
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
    `Mode: ${preset.mode}.`,
    `Limitations: ${preset.limitation}`,
    webhookNote,
    "Created paused by default for one-by-one manual testing. Purchase assist only; no checkout automation."
  ].join(" ");
}
