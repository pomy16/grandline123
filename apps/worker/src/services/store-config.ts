import type { StoreConfig } from "@tcg-monitor/shared";
import type { Store } from "@prisma/client";

export function toStoreConfig(store: Store): StoreConfig {
  return {
    id: store.id,
    name: store.name,
    baseUrl: store.baseUrl,
    listingUrls: store.listingUrls,
    apiEndpoint: store.apiEndpoint,
    mode: store.mode,
    pollingIntervalSeconds: store.pollingIntervalSeconds,
    currency: store.currency,
    country: store.country,
    language: store.language,
    active: store.active,
    requestHeaders: store.requestHeaders as Record<string, string> | null,
    selectors: {
      productUrl: store.selectorProductUrl,
      title: store.selectorTitle,
      price: store.selectorPrice,
      image: store.selectorImage,
      stockStatus: store.selectorStockStatus,
      preorderStatus: store.selectorPreorderStatus
    }
  };
}
