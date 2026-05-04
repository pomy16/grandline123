import type { NormalizedProduct, StoreConfig, StoreMonitor } from "@tcg-monitor/shared";
import { SafeHttpClient } from "../http/safe-http-client";
import { HtmlMonitor } from "./html-monitor";
import { blocks, firstTagValue } from "./xml-utils";

export class SitemapMonitor implements StoreMonitor {
  async scan(storeConfig: StoreConfig): Promise<NormalizedProduct[]> {
    const client = new SafeHttpClient(storeConfig);
    const sitemapUrls = storeConfig.listingUrls.length > 0 ? storeConfig.listingUrls : [new URL("/sitemap.xml", storeConfig.baseUrl).toString()];
    const productUrls = new Set<string>();

    for (const sitemapUrl of sitemapUrls) {
      const response = await client.fetchText(sitemapUrl, "SITEMAP");
      const sitemapBlocks = blocks(response.body, "sitemap");
      if (sitemapBlocks.length > 0) {
        for (const block of sitemapBlocks.slice(0, Number(process.env.SITEMAP_MONITOR_MAX_SITEMAPS ?? 10))) {
          const loc = firstTagValue(block, "loc");
          if (loc) {
            const nested = await client.fetchText(loc, "SITEMAP");
            for (const urlBlock of blocks(nested.body, "url")) {
              const productUrl = firstTagValue(urlBlock, "loc");
              if (productUrl && /product|products|shop|tcg|pokemon|one-piece|onepiece/i.test(productUrl)) productUrls.add(productUrl);
            }
          }
        }
      }
      for (const urlBlock of blocks(response.body, "url")) {
        const productUrl = firstTagValue(urlBlock, "loc");
        if (productUrl && /product|products|shop|tcg|pokemon|one-piece|onepiece/i.test(productUrl)) productUrls.add(productUrl);
      }
    }

    const htmlMonitor = new HtmlMonitor();
    return htmlMonitor.scan({
      ...storeConfig,
      listingUrls: [...productUrls].slice(0, Number(process.env.SITEMAP_MONITOR_MAX_PRODUCT_PAGES ?? 50))
    });
  }
}
