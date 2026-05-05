import { describe, expect, it } from "vitest";
import { buildDiscordPayload } from "./discord";

describe("Discord webhook payload formatting", () => {
  it("formats purchase-assist alert payloads without checkout automation", () => {
    const payload = buildDiscordPayload({
      eventType: "RESTOCK",
      productTitle: "Pokemon TCG Booster Box",
      storeName: "Demo Store",
      price: "129.99 EUR",
      oldPrice: "149.99 EUR",
      stockStatus: "IN_STOCK",
      productUrl: "https://example.com/product",
      category: "Sealed",
      game: "POKEMON",
      priority: "HIGH"
    });

    expect(payload.embeds[0].title).toBe("Pokemon TCG Booster Box");
    expect(payload.embeds[0].fields).toContainEqual({ name: "Quick actions", value: "[Open product](https://example.com/product)", inline: false });
    expect(JSON.stringify(payload).toLowerCase()).not.toContain("checkout");
  });

  it("adds a manual add-to-cart shortcut only when publicCartUrl exists", () => {
    const payload = buildDiscordPayload({
      eventType: "RESTOCK",
      productTitle: "Pokemon TCG Booster Box",
      storeName: "Demo Store",
      productUrl: "https://example.com/product",
      publicCartUrl: "https://example.com/basket/add/?product_id=123"
    });

    expect(payload.embeds[0].fields).toContainEqual({
      name: "Quick actions",
      value: "[Open product](https://example.com/product) | [Add to cart](https://example.com/basket/add/?product_id=123)",
      inline: false
    });
  });
});
