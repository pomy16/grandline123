import { describe, expect, it } from "vitest";
import type { NormalizedProduct } from "@tcg-monitor/shared";
import { detectEvents, filterRelevantScanProducts, mergeIncomingWithExisting, stateHash } from "./scanner";

const incoming: NormalizedProduct = {
  title: "Pokemon TCG Booster Box",
  normalizedTitle: "pokemon tcg booster box",
  url: "https://example.com/box",
  canonicalUrl: "https://example.com/box",
  imageUrl: "https://example.com/box.jpg",
  price: 99.99,
  currency: "EUR",
  stockStatus: "IN_STOCK",
  isAvailable: true,
  isPreorder: false,
  game: "POKEMON"
};

describe("scan event generation", () => {
  it("creates NEW_PRODUCT for first-seen products", () => {
    expect(detectEvents(null, incoming)).toEqual(["NEW_PRODUCT"]);
  });

  it("detects restocks, price drops, and product updates", () => {
    expect(
      detectEvents(
        {
          title: "Pokemon TCG Booster Box",
          imageUrl: null,
          price: 129.99 as never,
          stockStatus: "OUT_OF_STOCK",
          isAvailable: false,
          isPreorder: false
        },
        incoming
      )
    ).toEqual(["RESTOCK", "PRICE_DROP", "PRODUCT_UPDATED"]);
  });

  it("generates stable state hashes for duplicate event detection", () => {
    expect(stateHash(incoming, "RESTOCK")).toBe(stateHash({ ...incoming }, "RESTOCK"));
    expect(stateHash(incoming, "RESTOCK")).not.toBe(stateHash({ ...incoming, price: 89.99 }, "RESTOCK"));
  });

  it("keeps existing price and game when a rendered card temporarily misses them", () => {
    const merged = mergeIncomingWithExisting(
      {
        price: 269 as never,
        imageUrl: "https://example.com/old.jpg",
        category: "Sealed",
        game: "POKEMON"
      },
      {
        ...incoming,
        price: null,
        imageUrl: null,
        category: null,
        game: "UNKNOWN"
      }
    );

    expect(merged).toMatchObject({
      price: 269,
      imageUrl: "https://example.com/old.jpg",
      category: "Sealed",
      game: "POKEMON"
    });
  });

  it("filters non-target products before persistence, events, and Discord alerts", () => {
    const products = [
      incoming,
      {
        ...incoming,
        title: "Pokémon Hrací podložka - Frosted Forest",
        normalizedTitle: "pokemon hraci podlozka frosted forest",
        canonicalUrl: "https://example.com/hraci-podlozka",
        url: "https://example.com/hraci-podlozka"
      },
      {
        ...incoming,
        title: "Jak začít sbírat Yu-Gi-Oh! karty v Česku",
        normalizedTitle: "jak zacit sbirat yu gi oh karty v cesku",
        canonicalUrl: "https://example.com/jak-zacit",
        url: "https://example.com/jak-zacit",
        game: "UNKNOWN" as const
      }
    ];

    const filtered = filterRelevantScanProducts(products);

    expect(filtered.accepted.map((product) => product.title)).toEqual(["Pokemon TCG Booster Box"]);
    expect(filtered.skipped.map((product) => product.title)).toEqual([
      "Pokémon Hrací podložka - Frosted Forest",
      "Jak začít sbírat Yu-Gi-Oh! karty v Česku"
    ]);
  });
});
