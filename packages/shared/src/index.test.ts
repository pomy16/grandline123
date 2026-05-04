import { describe, expect, it } from "vitest";
import { inferGame, keywordRuleMatchesProduct, normalizeTitle, normalizeUrl, parsePrice, productIdentityKey } from "./index";

describe("shared normalization utilities", () => {
  it("normalizes accented and punctuated titles", () => {
    expect(normalizeTitle("Pokémon TCG: Elite Trainer Box!")).toBe("pokemon tcg elite trainer box");
  });

  it("parses common European and US price formats", () => {
    expect(parsePrice("€129,99")).toBe(129.99);
    expect(parsePrice("$1,249.95")).toBe(1249.95);
  });

  it("normalizes URLs and strips fragments", () => {
    expect(normalizeUrl("/product?a=2&b=1#details", "https://example.com")).toBe("https://example.com/product?a=2&b=1");
  });

  it("infers the target game from product titles", () => {
    expect(inferGame("One Piece Card Game Starter Deck")).toBe("ONE_PIECE");
    expect(inferGame("Pokemon TCG Booster Box")).toBe("POKEMON");
  });

  it("builds a stable product identity key", () => {
    expect(
      productIdentityKey(
        {
          canonicalUrl: "https://example.com/a",
          normalizedTitle: "pokemon booster box",
          sku: "PKM-1",
          ean: null
        },
        "store-1"
      )
    ).toContain("store-1");
  });

  it("matches keyword rules with include, exclude, game, and price filters", () => {
    expect(
      keywordRuleMatchesProduct(
        {
          includeKeywords: ["booster box"],
          excludeKeywords: ["damaged"],
          game: "POKEMON",
          minPrice: 50,
          maxPrice: 150
        },
        {
          title: "Pokemon TCG Booster Box",
          normalizedTitle: "pokemon tcg booster box",
          price: 119.99,
          game: "POKEMON"
        }
      )
    ).toBe(true);
  });
});
