import { describe, expect, it } from "vitest";
import type { NormalizedProduct } from "@tcg-monitor/shared";
import { detectEvents, mergeIncomingWithExisting, stateHash } from "./scanner";

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
});
