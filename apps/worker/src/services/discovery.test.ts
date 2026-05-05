import { describe, expect, it } from "vitest";
import { isRelevantTargetProduct, type StoreConfig } from "@tcg-monitor/shared";
import { productsFromHtmlDocument } from "../monitors/html-monitor";
import { candidateStatusFromValidatedProducts } from "./discovery";

const knihy: StoreConfig = {
  id: "knihy",
  name: "Knihy Dobrovský",
  baseUrl: "https://www.knihydobrovsky.cz",
  listingUrls: ["https://www.knihydobrovsky.cz/pokemon-tcg"],
  mode: "PLAYWRIGHT",
  pollingIntervalSeconds: 300,
  currency: "CZK",
  active: false
};

describe("discovery product quality", () => {
  it("counts only validated real products for discovery status", () => {
    const products = productsFromHtmlDocument(
      `
        <a href="/pokemon-tcg">Pokémon TCG</a>
        <a href="/booster">Booster</a>
        <a href="/konverzacni-karty">Konverzační karty</a>
        <button>Načíst dalších 24</button>
        <script type="application/ld+json">
          {"@type":"Product","name":"Pokémon TCG Booster Pack","url":"/hra/pokemon-tcg-booster-pack-123456","image":"https://www.knihydobrovsky.cz/img.jpg","offers":{"price":"129","priceCurrency":"CZK"}}
        </script>
      `,
      knihy,
      "https://www.knihydobrovsky.cz/pokemon-tcg",
      "discovery-metadata"
    );

    const relevantProducts = products.filter(isRelevantTargetProduct);

    expect(relevantProducts).toHaveLength(1);
    expect(relevantProducts[0].title).toBe("Pokémon TCG Booster Pack");
    expect(candidateStatusFromValidatedProducts(relevantProducts.length)).toBe("ACTIVE");
  });

  it("does not mark category-only discovery output as target found", () => {
    const products = productsFromHtmlDocument(
      `
        <a href="/pokemon-tcg">Pokémon TCG</a>
        <a href="/booster">Booster</a>
        <a href="/konverzacni-karty">Konverzační karty</a>
        <a href="/pokemon-tcg?page=2">Další</a>
      `,
      knihy,
      "https://www.knihydobrovsky.cz/pokemon-tcg",
      "discovery-metadata"
    );

    expect(products).toHaveLength(0);
    expect(candidateStatusFromValidatedProducts(products.length)).toBe("EMPTY");
  });

  it("does not mark accessory-only discovery output as target found", () => {
    const products = productsFromHtmlDocument(
      `
        <script type="application/ld+json">
          {"@type":"Product","name":"Pokémon Hrací podložka - Frosted Forest","url":"/darky/pokemon-up-gs-frosted-forest-hraci-podlozka-531371083","image":"https://www.knihydobrovsky.cz/img.jpg","offers":{"price":"599","priceCurrency":"CZK"}}
        </script>
      `,
      knihy,
      "https://www.knihydobrovsky.cz/pokemon-tcg",
      "discovery-metadata"
    );
    const relevantProducts = products.filter(isRelevantTargetProduct);

    expect(products).toHaveLength(1);
    expect(relevantProducts).toHaveLength(0);
    expect(candidateStatusFromValidatedProducts(relevantProducts.length)).toBe("EMPTY");
  });
});
