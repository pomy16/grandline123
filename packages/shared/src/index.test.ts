import { describe, expect, it } from "vitest";
import { inferGame, keywordRuleMatchesProduct, normalizeTitle, normalizeUrl, parsePrice, productIdentityKey } from "./index";

describe("shared normalization utilities", () => {
  it("normalizes accented and punctuated titles", () => {
    expect(normalizeTitle("Pokémon TCG: Elite Trainer Box!")).toBe("pokemon tcg elite trainer box");
  });

  it("parses common European and US price formats", () => {
    expect(parsePrice("€129,99")).toBe(129.99);
    expect(parsePrice("$1,249.95")).toBe(1249.95);
    expect(parsePrice("1 499 Kč")).toBe(1499);
    expect(parsePrice("invalid")).toBeNull();
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

  it("rejects keyword matches when an exclude keyword is present", () => {
    expect(
      keywordRuleMatchesProduct(
        {
          includeKeywords: ["booster"],
          excludeKeywords: ["resealed"],
          game: "POKEMON",
          caseInsensitive: true
        },
        {
          title: "Pokemon booster box resealed",
          normalizedTitle: "pokemon booster box resealed",
          price: 89.99,
          game: "POKEMON"
        }
      )
    ).toBe(false);
  });

  it("supports fuzzy keyword matching for compact product titles", () => {
    expect(
      keywordRuleMatchesProduct(
        {
          includeKeywords: ["starter deck"],
          excludeKeywords: [],
          game: "ONE_PIECE",
          fuzzyMatching: true
        },
        {
          title: "One Piece StarterDeck ST-13",
          normalizedTitle: "one piece starterdeck st 13",
          price: 14.99,
          game: "ONE_PIECE"
        }
      )
    ).toBe(true);
  });

  it("does not match outside min and max price bounds", () => {
    expect(
      keywordRuleMatchesProduct(
        {
          includeKeywords: ["elite trainer box"],
          excludeKeywords: [],
          game: "POKEMON",
          minPrice: 40,
          maxPrice: 60
        },
        {
          title: "Pokemon Elite Trainer Box",
          normalizedTitle: "pokemon elite trainer box",
          price: 69.99,
          game: "POKEMON"
        }
      )
    ).toBe(false);
  });
});
