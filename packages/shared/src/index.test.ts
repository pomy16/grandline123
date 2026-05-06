import { describe, expect, it } from "vitest";
import {
  inferGame,
  isLikelyAccessoryProduct,
  isLikelySealedTcgProductTitle,
  isNonProductContentTitle,
  keywordRuleMatchesProduct,
  normalizeTitle,
  normalizeUrl,
  parsePrice,
  productIdentityKey
} from "./index";

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

  it("rejects accessory products from sealed-product alert matching", () => {
    const accessory = {
      title: "Pokémon Ultra PRO: Deck Protector obaly na karty 65 ks - Snorlax Munchlax -",
      normalizedTitle: "pokemon ultra pro deck protector obaly na karty 65 ks snorlax munchlax",
      price: 269,
      game: "POKEMON" as const
    };

    expect(isLikelyAccessoryProduct(accessory.title)).toBe(true);
    expect(
      keywordRuleMatchesProduct(
        {
          includeKeywords: ["pokemon", "booster", "elite trainer box"],
          excludeKeywords: [],
          game: "POKEMON"
        },
        accessory
      )
    ).toBe(false);
  });

  it("keeps sealed collections eligible for alert matching", () => {
    expect(isLikelyAccessoryProduct("Pokémon TCG Mega Venusaur ex Premium Collection")).toBe(false);
  });

  it("rejects real-world non-products and accessories before alert matching", () => {
    for (const title of [
      "Bestseller",
      "Na prodejně",
      "Nedostupné",
      "Pokémon Hrací podložka - Frosted Forest",
      "Pokémon: Kroužkové album na stránkové obaly 25 x 31,5 cm - Pikachu Mimikyu",
      "Pokémon Bojová figurka - Horsea & Litwick",
      "Pokémon Bojová figurka - Pikachu & Goomy",
      "Pokémon TCG: Scarlet Violet 01 - Mini Album + booster",
      "číst celé",
      "Detail",
      "Slide",
      "Sběratelské karty",
      "Jednotlivé karty",
      "Boostery",
      "Booster boxy",
      "pokémon karty",
      "Jak začít sbírat Yu-Gi-Oh! karty v Česku",
      "Tcgkarty.cz na Firmy.cz",
      "UP Plastový toploader 35pt (25 ks) - Obaly na karty",
      "Gamegenic: Casual Album 18-Pocket Black - Alba na karty",
      "One Piece: Grand Ship Collection Model Kit - Going Merry"
    ]) {
      expect(isLikelySealedTcgProductTitle(title)).toBe(false);
      expect(
        keywordRuleMatchesProduct(
          {
            includeKeywords: ["pokemon", "pokémon", "booster", "collection", "tcg"],
            excludeKeywords: [],
            game: "BOTH"
          },
          {
            title,
            normalizedTitle: normalizeTitle(title),
            price: 199,
            game: inferGame(title)
          }
        )
      ).toBe(false);
    }
  });

  it("marks article/profile labels as non-product content", () => {
    expect(isNonProductContentTitle("Jak začít sbírat Yu-Gi-Oh! karty v Česku")).toBe(true);
    expect(isNonProductContentTitle("Tcgkarty.cz na Firmy.cz")).toBe(true);
    expect(isNonProductContentTitle("číst celé")).toBe(true);
    expect(isNonProductContentTitle("Detail")).toBe(true);
    expect(isNonProductContentTitle("Slide")).toBe(true);
    expect(isNonProductContentTitle("Sběratelské karty")).toBe(true);
    expect(isNonProductContentTitle("Jednotlivé karty")).toBe(true);
    expect(isNonProductContentTitle("Boostery")).toBe(true);
  });

  it("allows target sealed TCG products through the relevance gate", () => {
    for (const title of [
      "Pokémon TCG: Poké Ball Tin 2025",
      "Pokémon TCG: Surging Sparks - Booster",
      "Pokémon TCG: ME02.5 Ascended Heroes - Mini Tin",
      "Pokémon TCG: White Flare - Booster Bundle",
      "Pokémon TCG: Elite Trainer Box",
      "Pokémon TCG: Enhanced Booster Display",
      "Pokémon TCG: 2-Pack Blister",
      "Pokémon TCG: Cynthia’s Garchomp ex Premium Collection"
    ]) {
      expect(isLikelySealedTcgProductTitle(title)).toBe(true);
    }
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
