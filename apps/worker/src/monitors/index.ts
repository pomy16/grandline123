import type { MonitorMode, StoreMonitor } from "@tcg-monitor/shared";
import { ApiMonitor } from "./api-monitor";
import { HtmlMonitor } from "./html-monitor";
import { MockMonitor } from "./mock-monitor";
import { PlaywrightMonitor } from "./playwright-monitor";
import { RssMonitor } from "./rss-monitor";
import { SitemapMonitor } from "./sitemap-monitor";

export function createMonitor(mode: MonitorMode): StoreMonitor {
  if (mode === "MOCK") return new MockMonitor();
  if (mode === "API") return new ApiMonitor();
  if (mode === "HTML") return new HtmlMonitor();
  if (mode === "SITEMAP") return new SitemapMonitor();
  if (mode === "RSS") return new RssMonitor();
  if (mode === "PLAYWRIGHT") return new PlaywrightMonitor();
  return new MockMonitor();
}
