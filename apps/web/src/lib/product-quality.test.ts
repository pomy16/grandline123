import { describe, expect, it } from "vitest";
import { wouldSkipProductNow } from "./product-quality";

describe("product quality indicators", () => {
  it("flags historical accessories and labels that the current relevance filter would skip", () => {
    expect(wouldSkipProductNow({ title: "Pokémon TCG: Scarlet Violet 01 - Mini Album + booster", game: "POKEMON", category: null })).toBe(true);
    expect(wouldSkipProductNow({ title: "Sběratelské karty", game: "UNKNOWN", category: null })).toBe(true);
  });

  it("keeps relevant sealed TCG products eligible for alerts", () => {
    expect(wouldSkipProductNow({ title: "Pokémon TCG: Surging Sparks - Booster", game: "POKEMON", category: "Sealed" })).toBe(false);
    expect(wouldSkipProductNow({ title: "One Piece TCG - Legacy of the Master Booster Box", game: "ONE_PIECE", category: "Sealed" })).toBe(false);
  });
});
