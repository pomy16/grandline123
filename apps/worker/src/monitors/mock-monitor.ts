import type { NormalizedProduct, StoreConfig, StoreMonitor } from "@tcg-monitor/shared";
import { inferGame, normalizeTitle, normalizeUrl } from "@tcg-monitor/shared";

export class MockMonitor implements StoreMonitor {
  async scan(storeConfig: StoreConfig): Promise<NormalizedProduct[]> {
    const baseUrl = storeConfig.baseUrl || "https://example.invalid";
    const products = [
      {
        title: "Pokemon TCG Scarlet & Violet Booster Box",
        url: "/products/pokemon-sv-booster-box",
        imageUrl: "https://placehold.co/400x400?text=Pokemon+Booster+Box",
        price: 119.99,
        stockStatus: "IN_STOCK" as const,
        isAvailable: true,
        isPreorder: false,
        sku: "MOCK-PKM-SV-BB",
        ean: "000000000001",
        category: "Booster Box"
      },
      {
        title: "One Piece Card Game Starter Deck Demo",
        url: "/products/one-piece-starter-deck",
        imageUrl: "https://placehold.co/400x400?text=One+Piece+Starter",
        price: 14.99,
        stockStatus: "PREORDER" as const,
        isAvailable: true,
        isPreorder: true,
        sku: "MOCK-OP-ST",
        ean: "000000000002",
        category: "Starter Deck"
      }
    ];

    return products.map((product) => {
      const canonicalUrl = normalizeUrl(product.url, baseUrl);
      return {
        ...product,
        url: canonicalUrl,
        canonicalUrl,
        normalizedTitle: normalizeTitle(product.title),
        currency: storeConfig.currency,
        game: inferGame(product.title),
        rawData: {
          source: "mock-monitor",
          complianceNote: "No external store request was performed."
        }
      };
    });
  }
}
