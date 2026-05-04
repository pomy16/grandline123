import type { NormalizedProduct, StoreConfig, StoreMonitor } from "@tcg-monitor/shared";
import { inferGame, normalizeTitle, normalizeUrl, parsePrice } from "@tcg-monitor/shared";
import { SafeHttpClient } from "../http/safe-http-client";
import { normalizeStockStatus, uniqueProducts } from "./parser-utils";
import { blocks, cdataText, firstTagValue } from "./xml-utils";

export class RssMonitor implements StoreMonitor {
  async scan(storeConfig: StoreConfig): Promise<NormalizedProduct[]> {
    const client = new SafeHttpClient(storeConfig);
    const feedUrls = storeConfig.listingUrls.length > 0 ? storeConfig.listingUrls : [storeConfig.apiEndpoint].filter(Boolean) as string[];
    const products: NormalizedProduct[] = [];

    for (const feedUrl of feedUrls) {
      const response = await client.fetchText(feedUrl, "RSS");
      const entries = [...blocks(response.body, "item"), ...blocks(response.body, "entry")];
      for (const entry of entries) {
        const title = cdataText(firstTagValue(entry, "title"));
        const link = firstTagValue(entry, "link") ?? entry.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] ?? null;
        if (!title || !link) continue;
        const description = cdataText(firstTagValue(entry, "description") ?? firstTagValue(entry, "summary") ?? firstTagValue(entry, "content:encoded"));
        const priceText = firstTagValue(entry, "g:price") ?? firstTagValue(entry, "price") ?? description;
        const stock = normalizeStockStatus(`${firstTagValue(entry, "g:availability") ?? ""} ${description ?? ""}`);
        const canonicalUrl = normalizeUrl(link, storeConfig.baseUrl);

        products.push({
          title,
          normalizedTitle: normalizeTitle(title),
          url: canonicalUrl,
          canonicalUrl,
          imageUrl: firstTagValue(entry, "g:image_link") ?? firstTagValue(entry, "image") ?? null,
          price: priceText ? parsePrice(priceText) : null,
          currency: storeConfig.currency,
          ...stock,
          sku: firstTagValue(entry, "g:id") ?? firstTagValue(entry, "guid"),
          ean: firstTagValue(entry, "g:gtin"),
          category: firstTagValue(entry, "g:product_type") ?? firstTagValue(entry, "category"),
          game: inferGame(title),
          rawData: { source: "rss-monitor", feedUrl: response.url }
        });
      }
    }

    return uniqueProducts(products);
  }
}
