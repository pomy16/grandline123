import { describe, expect, it } from "vitest";
import type { StoreConfig } from "@tcg-monitor/shared";
import { productLinks, productsFromHtmlDocument, productsFromProductCards, publicCartLink } from "./html-monitor";
import { isPurchaseAssistUrl, isValidSourceCandidateUrl, productFromUnknown, uniqueProducts } from "./parser-utils";

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

  it("rejects cart, add, basket, and checkout URLs as product URLs", () => {
    expect(isPurchaseAssistUrl("https://www.dracik.cz/basket/add/?product_id=64044", store.baseUrl)).toBe(true);
    expect(isPurchaseAssistUrl("https://shop.example/cart/add?id=1", store.baseUrl)).toBe(true);
    expect(isPurchaseAssistUrl("https://shop.example/checkout", store.baseUrl)).toBe(true);
    expect(isValidSourceCandidateUrl("https://shop.example/cart/add?id=1", store)).toBe(false);
    expect(productLinks('<a href="/basket/add/?product_id=64044">Buy</a><a href="/pokemon-booster">Pokemon Booster</a>', store)).toEqual([
      "https://shop.example/pokemon-booster"
    ]);
    expect(productFromUnknown({ name: "Pokemon Booster", url: "/basket/add/?product_id=64044" }, store, "html-monitor-jsonld")).toBeNull();
  });

  it("stores public add-to-cart links only as purchase-assist metadata on valid products", () => {
    const product = productFromUnknown(
      {
        name: "Pokemon TCG Booster Box",
        productUrl: "/pokemon-booster-box",
        addToCartUrl: "/basket/add/?product_id=64044",
        price: "1 499 Kč"
      },
      store,
      "html-monitor-jsonld"
    );

    expect(product).toMatchObject({
      canonicalUrl: "https://shop.example/pokemon-booster-box",
      publicCartUrl: "https://shop.example/basket/add/?product_id=64044"
    });
  });

  it("skips generic homepage/category entries instead of persisting fake products", () => {
    expect(productFromUnknown({ name: "Demo Store", url: "https://shop.example/" }, store, "html-monitor-jsonld")).toBeNull();
    expect(productFromUnknown({ name: "Pokemon", url: "https://shop.example/products" }, store, "html-monitor-jsonld")).toBeNull();
  });

  it("keeps Knihy Dobrovsky-style product JSON-LD valid", () => {
    const product = productsFromHtmlDocument(
      `<script type="application/ld+json">
        {"@type":"Product","name":"Pokémon TCG: Scarlet & Violet booster","url":"/pokemon-tcg/scarlet-violet-booster-123","image":"https://shop.example/img.jpg","offers":{"price":"119","priceCurrency":"CZK","availability":"https://schema.org/InStock"}}
      </script>`,
      { ...store, name: "Knihy Dobrovský", baseUrl: "https://www.knihydobrovsky.cz", listingUrls: ["https://www.knihydobrovsky.cz/pokemon-tcg"], currency: "CZK" },
      "https://www.knihydobrovsky.cz/pokemon-tcg",
      "html-monitor-jsonld"
    );

    expect(product[0]).toMatchObject({
      title: "Pokémon TCG: Scarlet & Violet booster",
      canonicalUrl: "https://www.knihydobrovsky.cz/pokemon-tcg/scarlet-violet-booster-123",
      price: 119,
      game: "POKEMON"
    });
  });

  it("allows Knihy Dobrovsky category URLs as source candidates but rejects them as products", () => {
    const knihy = { ...store, name: "Knihy Dobrovský", baseUrl: "https://www.knihydobrovsky.cz", listingUrls: ["https://www.knihydobrovsky.cz/pokemon-tcg"], currency: "CZK" };
    for (const path of ["/pokemon-tcg", "/booster", "/konverzacni-karty", "/publisher/detail/pokemon-company-7205"]) {
      expect(isValidSourceCandidateUrl(`https://www.knihydobrovsky.cz${path}`, knihy)).toBe(true);
      expect(productFromUnknown({ "@type": "Thing", name: "Pokémon TCG", url: path }, knihy, "discovery-metadata")).toBeNull();
    }
  });

  it("rejects navigation, load-more, and stock labels as product titles", () => {
    for (const title of ["Načíst dalších", "Načíst dalších 24", "Další", "Více", "Zobrazit další", "Nedostupné", "Skladem", "Vyprodáno", "Předobjednávka"]) {
      expect(productFromUnknown({ "@type": "Product", name: title, url: "/hra/demo-produkt-123", image: "/img.jpg" }, store, "html-monitor-jsonld")).toBeNull();
    }
  });

  it("can find a public cart shortcut without treating it as a product link", () => {
    const html = '<a href="/pokemon-booster">Pokemon Booster</a><a href="/basket/add/?product_id=64044">Do kosiku</a>';

    expect(productLinks(html, store)).toEqual(["https://shop.example/pokemon-booster"]);
    expect(publicCartLink(html, store)).toBe("https://shop.example/basket/add/?product_id=64044");
  });

  it("extracts product cards from rendered category DOM", () => {
    const products = productsFromProductCards(
      `
        <article class="product">
          <a href="/pokemon-tcg/prismatic-evolutions-booster">
            <img src="/img/pokemon.jpg" alt="Pokémon TCG Prismatic Evolutions Booster" />
            <span>Pokémon TCG Prismatic Evolutions Booster</span>
          </a>
          <strong>129 Kč</strong>
          <span>Skladem</span>
        </article>
      `,
      { ...store, currency: "CZK" },
      "https://shop.example/products",
      "playwright-monitor"
    );

    expect(products[0]).toMatchObject({
      title: "Pokémon TCG Prismatic Evolutions Booster",
      canonicalUrl: "https://shop.example/pokemon-tcg/prismatic-evolutions-booster",
      imageUrl: "/img/pokemon.jpg",
      price: 129,
      stockStatus: "IN_STOCK",
      game: "POKEMON"
    });
  });

  it("skips rendered category controls and labels from product-card extraction", () => {
    const products = productsFromProductCards(
      `
        <a href="/pokemon-tcg">Pokémon TCG</a>
        <a href="/konverzacni-karty">Konverzační karty</a>
        <a href="/pokemon-tcg?page=2">Načíst dalších 24</a>
        <a href="/hra/pokemon-tcg-prismatic-evolutions-booster-123"><span>Nedostupné</span></a>
      `,
      { ...store, name: "Knihy Dobrovský", baseUrl: "https://www.knihydobrovsky.cz", listingUrls: ["https://www.knihydobrovsky.cz/pokemon-tcg"], currency: "CZK" },
      "https://www.knihydobrovsky.cz/pokemon-tcg",
      "playwright-monitor"
    );

    expect(products).toEqual([]);
  });
});
