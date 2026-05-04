import type { NormalizedProduct, StoreConfig, StoreMonitor } from "@tcg-monitor/shared";
import { SafeHttpClient } from "../http/safe-http-client";
import { productsFromHtmlDocument } from "./html-monitor";

type PlaywrightModule = {
  chromium: {
    launch(options: { headless: boolean }): Promise<{
      newPage(options: { userAgent?: string }): Promise<{
        goto(url: string, options: { waitUntil: "domcontentloaded"; timeout: number }): Promise<unknown>;
        content(): Promise<string>;
        close(): Promise<void>;
      }>;
      close(): Promise<void>;
    }>;
  };
};

async function loadPlaywright(): Promise<PlaywrightModule> {
  try {
    return (await Function("return import('playwright')")()) as PlaywrightModule;
  } catch {
    throw new Error("PLAYWRIGHT monitor requires installing the optional 'playwright' package. Use it only for public pages that need JavaScript rendering.");
  }
}

export class PlaywrightMonitor implements StoreMonitor {
  async scan(storeConfig: StoreConfig): Promise<NormalizedProduct[]> {
    const playwright = await loadPlaywright();
    const client = new SafeHttpClient(storeConfig);
    const browser = await playwright.chromium.launch({ headless: true });
    const renderedPages: string[] = [];

    try {
      for (const listingUrl of storeConfig.listingUrls) {
        await client.assertRobotsAllowed(listingUrl);
        const page = await browser.newPage({
          userAgent:
            storeConfig.requestHeaders?.["user-agent"] ??
            storeConfig.requestHeaders?.["User-Agent"] ??
            process.env.MONITOR_USER_AGENT ??
            "TCGMonitor/0.1 (+https://github.com/pomy16/grandline123; purchase-assist monitoring; respects robots.txt)"
        });
        try {
          await page.goto(new URL(listingUrl, storeConfig.baseUrl).toString(), {
            waitUntil: "domcontentloaded",
            timeout: Number(process.env.REQUEST_TIMEOUT_MS ?? 10_000)
          });
          renderedPages.push(await page.content());
        } finally {
          await page.close();
        }
      }
    } finally {
      await browser.close();
    }

    const products: NormalizedProduct[] = [];
    for (let index = 0; index < renderedPages.length; index += 1) {
      products.push(
        ...productsFromHtmlDocument(renderedPages[index], storeConfig, storeConfig.listingUrls[index] ?? storeConfig.baseUrl, "playwright-monitor")
      );
    }
    return products.map((product) => ({
      ...product,
      rawData: { ...(typeof product.rawData === "object" && product.rawData !== null ? product.rawData : {}), source: "playwright-monitor" }
    }));
  }
}
