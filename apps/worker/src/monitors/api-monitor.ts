import type { NormalizedProduct, StoreConfig, StoreMonitor } from "@tcg-monitor/shared";
import { SafeHttpClient } from "../http/safe-http-client";
import { asArray, productFromUnknown, uniqueProducts } from "./parser-utils";

export class ApiMonitor implements StoreMonitor {
  async scan(storeConfig: StoreConfig): Promise<NormalizedProduct[]> {
    const client = new SafeHttpClient(storeConfig);
    const endpoints = [storeConfig.apiEndpoint, ...storeConfig.listingUrls].filter(Boolean) as string[];
    const products: NormalizedProduct[] = [];

    for (const endpoint of endpoints) {
      const response = await client.fetchText(endpoint, "API");
      let parsed: unknown;
      try {
        parsed = JSON.parse(response.body);
      } catch (error) {
        throw new Error(`API monitor could not parse JSON from ${response.url}: ${error instanceof Error ? error.message : "unknown parse error"}`);
      }

      for (const item of asArray(parsed)) {
        const product = productFromUnknown(item, storeConfig, "api-monitor");
        if (product) products.push(product);
      }
    }

    return uniqueProducts(products);
  }
}
