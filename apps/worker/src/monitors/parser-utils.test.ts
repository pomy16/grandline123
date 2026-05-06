import { describe, expect, it } from "vitest";
import { isRelevantTargetProduct, type StoreConfig } from "@tcg-monitor/shared";
import { extractPageReportedCount, productLinks, productsFromHtmlDocument, productsFromProductCards, publicCartLink } from "./html-monitor";
import { isPurchaseAssistUrl, isValidProductUrl, isValidSourceCandidateUrl, productFromUnknown, uniqueProducts } from "./parser-utils";

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

  it("flattens JSON-LD ItemList products with Offer availability and price", () => {
    const products = productsFromHtmlDocument(
      `<script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "item": {
                "@type": "Product",
                "name": "Ascended Heroes Booster Bundle",
                "sku": "IAJ6G1",
                "url": "https://www.najada.games/produkt/ascended-heroes-booster-bundle-IAJ6G1",
                "image": "https://www.najada.games/booster-bundle.webp",
                "offers": {
                  "@type": "Offer",
                  "availability": "https://schema.org/InStock",
                  "priceSpecification": [{
                    "@type": "UnitPriceSpecification",
                    "price": 2299,
                    "priceCurrency": "CZK"
                  }]
                }
              }
            }
          ]
        }
      </script>`,
      { ...store, name: "Najáda", baseUrl: "https://www.najada.games", listingUrls: ["https://www.najada.games/pokemon?in_stock=true&in_shop_stock=true"], currency: "CZK" },
      "https://www.najada.games/pokemon?in_stock=true&in_shop_stock=true",
      "playwright-monitor"
    );

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      title: "Ascended Heroes Booster Bundle",
      canonicalUrl: "https://www.najada.games/produkt/ascended-heroes-booster-bundle-IAJ6G1",
      price: 2299,
      stockStatus: "IN_STOCK",
      isAvailable: true,
      sku: "IAJ6G1",
      game: "POKEMON"
    });
    expect(isRelevantTargetProduct(products[0])).toBe(true);
  });

  it("supports Najada-style JSON-LD ItemList with Czech stock and page reported count diagnostics", () => {
    const products = productsFromHtmlDocument(
      `
        <main>Nalezeno 103 výsledků</main>
        <script type="application/ld+json">
          {
            "@type": "ItemList",
            "itemListElement": [
              {"@type":"ListItem","item":{"@type":"Product","name":"Paldea Legends Tins: Miraidon ex Plechovka","sku":"37CKV3","url":"/produkt/paldea-legends-tins-miraidon-ex-plechovka-37CKV3","image":"/tin.webp","offers":{"availability":"InStock","price":"849","priceCurrency":"CZK"}}},
              {"@type":"ListItem","item":{"@type":"Product","name":"Ascended Heroes: Erika's Tangela 2-Pack Blister","sku":"8CSRIT","url":"/produkt/ascended-heroes-erikas-tangela-2-pack-blister-8CSRIT","image":"/blister.webp","offers":{"availability":"http://schema.org/InStock","priceSpecification":{"price":"749","priceCurrency":"CZK"}}}}
            ]
          }
        </script>
      `,
      { ...store, name: "Najáda", baseUrl: "https://www.najada.games", listingUrls: ["https://www.najada.games/pokemon?in_stock=true&in_shop_stock=true"], currency: "CZK" },
      "https://www.najada.games/pokemon?in_stock=true&in_shop_stock=true",
      "playwright-monitor"
    );

    expect(products.map((product) => product.title)).toEqual([
      "Paldea Legends Tins: Miraidon ex Plechovka",
      "Ascended Heroes: Erika's Tangela 2-Pack Blister"
    ]);
    expect(products.every((product) => product.stockStatus === "IN_STOCK")).toBe(true);
    expect(products.every(isRelevantTargetProduct)).toBe(true);
    expect(products[0].rawData).toMatchObject({ pageReportedCount: 103 });
    expect(extractPageReportedCount("Nalezeno 103 výsledků")).toBe(103);
  });

  it("allows Knihy Dobrovsky category URLs as source candidates but rejects them as products", () => {
    const knihy = { ...store, name: "Knihy Dobrovský", baseUrl: "https://www.knihydobrovsky.cz", listingUrls: ["https://www.knihydobrovsky.cz/pokemon-tcg"], currency: "CZK" };
    for (const path of ["/pokemon-tcg", "/booster", "/konverzacni-karty", "/publisher/detail/pokemon-company-7205"]) {
      expect(isValidSourceCandidateUrl(`https://www.knihydobrovsky.cz${path}`, knihy)).toBe(true);
      expect(productFromUnknown({ "@type": "Thing", name: "Pokémon TCG", url: path }, knihy, "discovery-metadata")).toBeNull();
    }
    const najada = { ...store, name: "Najáda", baseUrl: "https://www.najada.games", listingUrls: ["https://www.najada.games/pokemon"] };
    expect(isValidSourceCandidateUrl("https://www.najada.games/pokemon/booster-boxy", najada)).toBe(true);
    expect(productFromUnknown({ "@type": "Product", name: "Booster boxy", url: "/pokemon/booster-boxy", image: "/category.jpg", offers: { price: "1" } }, najada, "discovery-metadata")).toBeNull();
  });

  it("keeps product URLs out of SourceCandidate scan sources while allowing real product records", () => {
    const najada = { ...store, name: "Najáda", baseUrl: "https://www.najada.games", listingUrls: ["https://www.najada.games/pokemon"] };
    const productUrl = "https://www.najada.games/produkt/ascended-heroes-booster-bundle-IAJ6G1";

    expect(isValidSourceCandidateUrl(productUrl, najada)).toBe(false);
    expect(isValidProductUrl(productUrl, najada)).toBe(true);
    expect(
      productFromUnknown(
        {
          "@type": "Product",
          name: "Ascended Heroes Booster Bundle",
          url: productUrl,
          image: "/bundle.webp",
          offers: { price: "2299", availability: "InStock" }
        },
        najada,
        "playwright-monitor"
      )
    ).toMatchObject({ title: "Ascended Heroes Booster Bundle", stockStatus: "IN_STOCK" });
  });

  it("rejects Alza category tiles with numeric category URLs as products but keeps them valid scan sources", () => {
    const alza = { ...store, name: "Alza", baseUrl: "https://www.alza.cz", listingUrls: ["https://www.alza.cz/hracky/pokemon-karty/18879069.htm"], currency: "CZK" };
    const categoryUrl = "https://www.alza.cz/hracky/pokemon-tiny-plechovky/18903052.htm";

    expect(isValidSourceCandidateUrl(categoryUrl, alza)).toBe(true);
    expect(isValidProductUrl(categoryUrl, alza)).toBe(false);
    expect(
      productFromUnknown(
        { "@type": "Product", name: "Pokémon – Tiny (plechovky)", url: categoryUrl, image: "/category.jpg", offers: { price: "1" } },
        alza,
        "playwright-monitor"
      )
    ).toBeNull();
    expect(
      productsFromProductCards(
        `<article class="product"><a href="${categoryUrl}"><img src="/tiny.jpg" alt="Pokémon – Tiny (plechovky)" /></a><strong>1 Kč</strong></article>`,
        alza,
        alza.listingUrls[0],
        "playwright-monitor"
      )
    ).toEqual([]);
  });

  it("accepts Alza product detail URLs with -d product identifiers", () => {
    const alza = { ...store, name: "Alza", baseUrl: "https://www.alza.cz", listingUrls: ["https://www.alza.cz/hracky/pokemon-karty/18879069.htm"], currency: "CZK" };
    const productUrl = "https://www.alza.cz/hracky/pokemon-tcg-mega-charizard-tin-d13221710.htm";

    expect(isValidSourceCandidateUrl(productUrl, alza)).toBe(false);
    expect(isValidProductUrl(productUrl, alza)).toBe(true);
    expect(
      productFromUnknown(
        { "@type": "Product", name: "Pokémon TCG: Mega Charizard Tin", url: productUrl, image: "/tin.jpg", offers: { price: "1599", availability: "InStock" } },
        alza,
        "playwright-monitor"
      )
    ).toMatchObject({ title: "Pokémon TCG: Mega Charizard Tin", stockStatus: "IN_STOCK" });
  });

  it("rejects homepage, article, guide, and info pages as scan source candidates", () => {
    const tcgKarty = { ...store, name: "TCG Karty", baseUrl: "https://www.tcgkarty.cz", listingUrls: ["https://www.tcgkarty.cz/tcg-pokemon"] };
    const tolarie = { ...store, name: "Tolarie", baseUrl: "https://www.tolarie.cz", listingUrls: ["https://www.tolarie.cz/koupit_produkty/katalog/48-pokemon-produkty/"] };

    expect(isValidSourceCandidateUrl("https://www.tcgkarty.cz/", tcgKarty)).toBe(false);
    expect(isValidSourceCandidateUrl("https://www.tcgkarty.cz/spustili-jsme-sablonu-new-york", tcgKarty)).toBe(false);
    expect(isValidSourceCandidateUrl("https://www.tcgkarty.cz/ochrana-osobnich-udaju-cookie-lista", tcgKarty)).toBe(false);
    expect(isValidSourceCandidateUrl("https://www.tcgkarty.cz/osobni-udaje-heureka", tcgKarty)).toBe(false);
    expect(isValidSourceCandidateUrl("https://www.tcgkarty.cz/o-nas", tcgKarty)).toBe(false);
    expect(isValidSourceCandidateUrl("http://tolarie.cz/clanky_videa/one-piece-op-11-a-fist-of-divine-speed-prerelease/", tolarie)).toBe(false);
    expect(isValidSourceCandidateUrl("https://www.tcgkarty.cz/tcg-pokemon", tcgKarty)).toBe(true);
    expect(isValidSourceCandidateUrl("https://www.tolarie.cz/koupit_produkty/katalog/48-pokemon-produkty/", tolarie)).toBe(true);
  });

  it("rejects navigation, load-more, and stock labels as product titles", () => {
    for (const title of ["Načíst dalších", "Načíst dalších 24", "Další", "Více", "Zobrazit další", "Nedostupné", "Skladem", "Vyprodáno", "Předobjednávka", "Bestseller", "Na prodejně"]) {
      expect(productFromUnknown({ "@type": "Product", name: title, url: "/hra/demo-produkt-123", image: "/img.jpg" }, store, "html-monitor-jsonld")).toBeNull();
    }
  });

  it("rejects article, guide, and external profile URLs as products", () => {
    const tcgKarty = { ...store, name: "TCG Karty", baseUrl: "https://www.tcgkarty.cz", listingUrls: ["https://www.tcgkarty.cz/"] };

    expect(
      productFromUnknown(
        { "@type": "Product", name: "Jak začít sbírat Yu-Gi-Oh! karty v Česku", url: "/jak-zacit-sbirat-yu-gi-oh-karty-v-cesku", image: "/guide.jpg" },
        tcgKarty,
        "playwright-monitor"
      )
    ).toBeNull();
    expect(
      productFromUnknown(
        { "@type": "Product", name: "Tcgkarty.cz na Firmy.cz", url: "https://www.firmy.cz/detail/13583070-tcgkarty-cz-hradec-kralove.html", image: "/profile.jpg" },
        tcgKarty,
        "playwright-monitor"
      )
    ).toBeNull();
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

  it("prefers image alt text over badges and trims stock/price noise from product-card titles", () => {
    const products = productsFromProductCards(
      `
        <article class="product">
          <a href="/hra/pokemon-tcg-scarlet-violet-09-journey-together-booster-792762991">
            <span>Bestseller</span>
            <img src="/img.jpg" alt="Pokémon TCG: Scarlet & Violet 09 Journey Together - Booster" />
          </a>
          <span>Na prodejně</span>
          <strong>149 Kč</strong>
        </article>
        <article class="product">
          <a href="/pokemon-tcg-sv10-destined-rivals-booster_z236308/">
            2 Pokémon TCG: SV10 Destined Rivals - Booster Skladem online DMOC: 249 Kč 229 Kč
          </a>
        </article>
      `,
      { ...store, name: "Knihy Dobrovský", baseUrl: "https://www.knihydobrovsky.cz", listingUrls: ["https://www.knihydobrovsky.cz/pokemon-tcg"], currency: "CZK" },
      "https://www.knihydobrovsky.cz/pokemon-tcg",
      "playwright-monitor"
    );

    expect(products.map((product) => product.title)).toEqual([
      "Pokémon TCG: Scarlet & Violet 09 Journey Together - Booster",
      "Pokémon TCG: SV10 Destined Rivals - Booster"
    ]);
  });

  it("uses target category context for ambiguous booster names without accepting non-target games", () => {
    const products = productsFromProductCards(
      `
        <article class="product">
          <a href="/produkt/snow-hazard-booster-asijsky-K35ON4">
            <img src="/snow.jpg" alt="Snow Hazard Booster (asijsky)" />
          </a>
          <strong>149 Kč</strong>
        </article>
        <article class="product">
          <a href="/produkt/lorcana-wilds-unknown-booster-box-2IBS4Q">
            <img src="/lorcana.jpg" alt="Lorcana: Wilds Unknown Booster Box" />
          </a>
          <strong>2 999 Kč</strong>
        </article>
      `,
      { ...store, name: "Najáda", baseUrl: "https://www.najada.games", listingUrls: ["https://www.najada.games/pokemon"], currency: "CZK" },
      "https://www.najada.games/pokemon",
      "playwright-monitor"
    );

    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({ title: "Snow Hazard Booster (asijsky)", game: "POKEMON" });
    expect(isRelevantTargetProduct(products[0])).toBe(true);
    expect(products[1]).toMatchObject({ title: "Lorcana: Wilds Unknown Booster Box", game: "UNKNOWN" });
    expect(isRelevantTargetProduct(products[1])).toBe(false);
  });

  it("uses Pokemon set-name hints before broad source page context", () => {
    const products = productsFromProductCards(
      `
        <article class="product">
          <a href="/mega-evolution-booster/">
            <img src="/mega.jpg" alt="Mega Evolution Booster" />
          </a>
          <strong>189 Kč</strong>
        </article>
      `,
      { ...store, name: "Professor Onyx", baseUrl: "https://www.professoronyx.com", listingUrls: ["https://www.professoronyx.com/one-piece/"], currency: "CZK" },
      "https://www.professoronyx.com/one-piece/",
      "playwright-monitor"
    );

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({ title: "Mega Evolution Booster", game: "POKEMON" });
    expect(isRelevantTargetProduct(products[0])).toBe(true);
  });

  it("does not infer Lorcana starter decks as One Piece sealed targets", () => {
    const products = productsFromProductCards(
      `
        <article class="product">
          <a href="/reign-of-jafar-ruby-and-steel-starter-deck/">
            <img src="/lorcana.jpg" alt="Reign of Jafar - Ruby and Steel Starter Deck" />
          </a>
          <span>Skladem</span>
        </article>
        <article class="product">
          <a href="/one-piece-starter-deck-st-13/">
            <img src="/op.jpg" alt="One Piece Card Game Starter Deck ST-13" />
          </a>
          <span>Skladem</span>
        </article>
      `,
      { ...store, name: "Professor Onyx", baseUrl: "https://www.professoronyx.com", listingUrls: ["https://www.professoronyx.com/starter-decky/"], currency: "CZK" },
      "https://www.professoronyx.com/starter-decky/",
      "playwright-monitor"
    );

    expect(products).toHaveLength(2);
    expect(products[0]).toMatchObject({ title: "Reign of Jafar - Ruby and Steel Starter Deck", game: "UNKNOWN" });
    expect(isRelevantTargetProduct(products[0])).toBe(false);
    expect(products[1]).toMatchObject({ title: "One Piece Card Game Starter Deck ST-13", game: "ONE_PIECE" });
    expect(isRelevantTargetProduct(products[1])).toBe(true);
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
