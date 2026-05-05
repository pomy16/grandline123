import type { NormalizedProduct, StoreConfig, StoreMonitor } from "@tcg-monitor/shared";
import { SafeHttpClient } from "../http/safe-http-client";
import { MonitorRequestError } from "../http/safe-http-client";
import { productsFromHtmlDocument } from "./html-monitor";

type PlaywrightModule = {
  chromium: {
    launch(options: { headless: boolean }): Promise<{
      newContext(options: {
        userAgent?: string;
        viewport: { width: number; height: number };
        locale: string;
        timezoneId?: string;
        extraHTTPHeaders?: Record<string, string>;
      }): Promise<{
        newPage(): Promise<{
          goto(url: string, options: { waitUntil: "domcontentloaded" | "networkidle"; timeout: number }): Promise<{ status(): number } | null>;
          waitForLoadState(state: "networkidle", options: { timeout: number }): Promise<void>;
          waitForSelector(selector: string, options: { timeout: number }): Promise<unknown>;
          content(): Promise<string>;
          close(): Promise<void>;
        }>;
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
  warnings: string[] = [];

  async scan(storeConfig: StoreConfig): Promise<NormalizedProduct[]> {
    this.warnings = [];
    const playwright = await loadPlaywright();
    const client = new SafeHttpClient(storeConfig);
    const browser = await playwright.chromium.launch({ headless: true });
    const renderedPages: Array<{ url: string; html: string }> = [];
    const timeout = Number(process.env.REQUEST_TIMEOUT_MS ?? 10_000);
    const headers = { ...(storeConfig.requestHeaders ?? {}) };
    const userAgent =
      headers["user-agent"] ??
      headers["User-Agent"] ??
      process.env.MONITOR_USER_AGENT ??
      "TCGMonitor/0.1 (+https://github.com/pomy16/grandline123; purchase-assist monitoring; respects robots.txt)";
    delete headers["user-agent"];
    delete headers["User-Agent"];

    try {
      for (const listingUrl of storeConfig.listingUrls) {
        const targetUrl = new URL(listingUrl, storeConfig.baseUrl).toString();
        await client.assertRobotsAllowed(targetUrl);
        const context = await browser.newContext({
          userAgent,
          viewport: { width: Number(process.env.PLAYWRIGHT_VIEWPORT_WIDTH ?? 1365), height: Number(process.env.PLAYWRIGHT_VIEWPORT_HEIGHT ?? 900) },
          locale: storeConfig.language ? `${storeConfig.language}-${storeConfig.country ?? "CZ"}` : "cs-CZ",
          timezoneId: process.env.PLAYWRIGHT_TIMEZONE ?? "Europe/Prague",
          extraHTTPHeaders: headers
        });
        const page = await context.newPage();
        try {
          const response = await page.goto(targetUrl, {
            waitUntil: "networkidle",
            timeout
          });
          const status = response?.status() ?? 200;
          if (status >= 400) {
            throw new MonitorRequestError(`PLAYWRIGHT monitor request failed with ${status} for ${targetUrl}`, {
              kind: "PLAYWRIGHT",
              url: targetUrl,
              status
            });
          }

          const selectors = [storeConfig.selectors?.productUrl, storeConfig.selectors?.title].filter(Boolean) as string[];
          for (const selector of selectors.slice(0, 1)) {
            await page.waitForSelector(selector, { timeout: Math.min(timeout, 5_000) }).catch(() => {
              this.warnings.push(`Selector ${selector} was not visible before extraction on ${targetUrl}.`);
            });
          }
          await page.waitForLoadState("networkidle", { timeout: Math.min(timeout, 5_000) }).catch(() => {
            this.warnings.push(`Network idle wait timed out on ${targetUrl}; extracting available DOM.`);
          });
          renderedPages.push({ url: targetUrl, html: await page.content() });
        } finally {
          await page.close();
          await context.close();
        }
      }
    } finally {
      await browser.close();
    }

    const products: NormalizedProduct[] = [];
    for (let index = 0; index < renderedPages.length; index += 1) {
      products.push(
        ...productsFromHtmlDocument(renderedPages[index].html, storeConfig, renderedPages[index].url, "playwright-monitor")
      );
    }
    return products.map((product) => ({
      ...product,
      rawData: { ...(typeof product.rawData === "object" && product.rawData !== null ? product.rawData : {}), source: "playwright-monitor" }
    }));
  }
}
