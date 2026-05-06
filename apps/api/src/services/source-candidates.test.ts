import { describe, expect, it } from "vitest";
import { addScanSourceUrl, isSafeScanSourceUrl, promotePrimarySourceUrl, removeScanSourceUrl } from "./source-candidates";

const baseUrl = "https://www.knihydobrovsky.cz";

describe("source candidate scan source helpers", () => {
  it("adds a candidate source without duplicating existing URLs", () => {
    expect(addScanSourceUrl(["https://www.knihydobrovsky.cz/booster"], "/booster", baseUrl)).toEqual([
      "https://www.knihydobrovsky.cz/booster"
    ]);
    expect(addScanSourceUrl(["https://www.knihydobrovsky.cz/booster"], "/pokemon-tcg?sort=3", baseUrl)).toEqual([
      "https://www.knihydobrovsky.cz/booster",
      "https://www.knihydobrovsky.cz/pokemon-tcg?sort=3"
    ]);
  });

  it("promotes a source to the first scan URL while preserving the rest", () => {
    expect(
      promotePrimarySourceUrl(
        ["https://www.knihydobrovsky.cz/booster", "https://www.knihydobrovsky.cz/pokemon-tcg?sort=3"],
        "https://www.knihydobrovsky.cz/publisher/detail/pokemon-company-7205",
        baseUrl
      )
    ).toEqual([
      "https://www.knihydobrovsky.cz/publisher/detail/pokemon-company-7205",
      "https://www.knihydobrovsky.cz/booster",
      "https://www.knihydobrovsky.cz/pokemon-tcg?sort=3"
    ]);
  });

  it("removes a scan source but keeps at least one source", () => {
    expect(
      removeScanSourceUrl(
        ["https://www.knihydobrovsky.cz/booster", "https://www.knihydobrovsky.cz/pokemon-tcg?sort=3"],
        "https://www.knihydobrovsky.cz/booster",
        baseUrl
      )
    ).toEqual(["https://www.knihydobrovsky.cz/pokemon-tcg?sort=3"]);
    expect(() => removeScanSourceUrl(["https://www.knihydobrovsky.cz/booster"], "/booster", baseUrl)).toThrow("at least one scan source");
  });

  it("rejects unsafe scan source candidates from stale discovery data", () => {
    expect(isSafeScanSourceUrl("https://www.tcgkarty.cz/", "https://www.tcgkarty.cz")).toBe(false);
    expect(isSafeScanSourceUrl("https://www.tcgkarty.cz/spustili-jsme-sablonu-new-york", "https://www.tcgkarty.cz")).toBe(false);
    expect(isSafeScanSourceUrl("https://www.tcgkarty.cz/ochrana-osobnich-udaju-cookie-lista", "https://www.tcgkarty.cz")).toBe(false);
    expect(isSafeScanSourceUrl("https://www.tcgkarty.cz/osobni-udaje-heureka", "https://www.tcgkarty.cz")).toBe(false);
    expect(isSafeScanSourceUrl("https://www.tcgkarty.cz/o-nas", "https://www.tcgkarty.cz")).toBe(false);
    expect(isSafeScanSourceUrl("http://tolarie.cz/clanky_videa/one-piece-op-11-a-fist-of-divine-speed-prerelease/", "http://tolarie.cz")).toBe(false);
    expect(isSafeScanSourceUrl("https://www.tcgkarty.cz/tcg-pokemon", "https://www.tcgkarty.cz")).toBe(true);

    expect(() => addScanSourceUrl(["https://www.tcgkarty.cz/tcg-pokemon"], "https://www.tcgkarty.cz/", "https://www.tcgkarty.cz")).toThrow("not safe");
    expect(() => promotePrimarySourceUrl(["https://www.tcgkarty.cz/tcg-pokemon"], "https://www.tcgkarty.cz/spustili-jsme-sablonu-new-york", "https://www.tcgkarty.cz")).toThrow("not safe");
  });
});
