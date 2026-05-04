import { describe, expect, it } from "vitest";
import type { StoreConfig } from "@tcg-monitor/shared";
import { productFromUnknown, uniqueProducts } from "./parser-utils";

const store: StoreConfig = {
  id: "store-1",
  name: "Demo Store",
  baseUrl: "https://shop.example",
  listingUrls: ["https://shop.example/products"],
  mode: "API",
  pollingIntervalSeconds: 300,
  currency: "EUR",
  active: true
};

describe("product parser normalization", () => {
  it("normalizes API product objects into monitor products", () => {
    const product = productFromUnknown(
      {
        name: "Pokémon TCG Booster Box",
        url: "/pokemon-booster",
        price: "€129,99",
        availability: "In stock",
        image: ["https://shop.example/pokemon.jpg"],
        sku: "PKM-BOX"
      },
      store,
      "api-monitor"
    );

    expect(product).toMatchObject({
      title: "Pokémon TCG Booster Box",
      normalizedTitle: "pokemon tcg booster box",
      canonicalUrl: "https://shop.example/pokemon-booster",
      price: 129.99,
      stockStatus: "IN_STOCK",
      isAvailable: true,
      game: "POKEMON",
      sku: "PKM-BOX"
    });
  });

  it("deduplicates products by canonical identity", () => {
    const first = productFromUnknown({ name: "One Piece Starter Deck", url: "/op-starter", price: 14.99 }, store, "api-monitor")!;
    const duplicate = { ...first, title: "One Piece Starter Deck Alternate Title" };
    const unique = uniqueProducts([first, duplicate]);

    expect(unique).toHaveLength(1);
    expect(unique[0].canonicalUrl).toBe("https://shop.example/op-starter");
  });
});
