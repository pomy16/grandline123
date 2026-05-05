import { describe, expect, it, vi } from "vitest";
import type { StoreConfig } from "@tcg-monitor/shared";
import { createMonitor } from "./index";
import { MockMonitor } from "./mock-monitor";
import { HtmlMonitor } from "./html-monitor";
import { assertNoMockProductsForRealStore } from "../services/monitor-safety";

const baseStore: StoreConfig = {
  id: "store-1",
  name: "Real Store",
  baseUrl: "https://example.com",
  listingUrls: ["https://example.com/products"],
  mode: "HTML",
  pollingIntervalSeconds: 300,
  currency: "CZK",
  active: true
};

describe("real monitor safety", () => {
  it("does not fall back to MockMonitor for unknown monitor modes", () => {
    expect(() => createMonitor("UNKNOWN_MODE" as never)).toThrow("Unsupported monitor mode");
  });

  it("allows MockMonitor only for MOCK stores", async () => {
    await expect(new MockMonitor().scan(baseStore)).rejects.toThrow("MockMonitor can only scan MOCK stores");
  });

  it("rejects mock products for non-MOCK stores", () => {
    expect(() =>
      assertNoMockProductsForRealStore(
        { mode: "HTML" },
        [
          {
            title: "Pokemon TCG Scarlet & Violet Booster Box",
            normalizedTitle: "pokemon tcg scarlet violet booster box",
            url: "https://example.com/products/pokemon-sv-booster-box",
            canonicalUrl: "https://example.com/products/pokemon-sv-booster-box",
            price: 119.99,
            currency: "CZK",
            stockStatus: "IN_STOCK",
            isAvailable: true,
            isPreorder: false,
            game: "POKEMON",
            rawData: { source: "mock-monitor" }
          }
        ]
      )
    ).toThrow("Safety violation");
  });

  it("fails HTML scans on HTTP 403 instead of returning mock products", async () => {
    vi.stubEnv("RESPECT_ROBOTS_TXT", "false");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ "content-type": "text/html" }),
      text: async () => "Forbidden"
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(new HtmlMonitor().scan(baseStore)).rejects.toThrow("HTML monitor request failed with 403");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/products",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: expect.any(String)
        })
      })
    );

    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("stops safely when robots.txt disallows the listing URL", async () => {
    vi.unstubAllEnvs();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "text/plain" }),
      text: async () => "User-agent: *\nDisallow: /products"
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(new HtmlMonitor().scan(baseStore)).rejects.toThrow("robots.txt disallows monitoring");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});
