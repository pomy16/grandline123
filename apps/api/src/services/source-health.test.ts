import { describe, expect, it } from "vitest";
import { MonitorMode } from "@prisma/client";
import { bestSourceCandidate, sourceCandidateRecommendation, sourceHealthSummary } from "./source-health";

const store = {
  baseUrl: "https://shop.example",
  mode: MonitorMode.PLAYWRIGHT,
  listingUrls: ["https://shop.example/pokemon"]
};

describe("source health scoring", () => {
  it("recommends safe active candidates with relevant products and tolerable noise", () => {
    const recommendation = sourceCandidateRecommendation(
      {
        id: "candidate-1",
        url: "https://shop.example/pokemon/boosters",
        status: "ACTIVE",
        monitorMode: MonitorMode.PLAYWRIGHT,
        productsFound: 12,
        metadata: { rawProductCandidateCount: 20, validatedProductCount: 12, skippedNonTargetProducts: 6 }
      },
      store
    );

    expect(recommendation.status).toBe("RECOMMENDED");
    expect(recommendation.relevant).toBe(12);
    expect(recommendation.skipped).toBe(6);
  });

  it("keeps noisy active candidates explicit instead of silently recommending them", () => {
    const recommendation = sourceCandidateRecommendation(
      {
        id: "candidate-2",
        url: "https://shop.example/pokemon",
        status: "ACTIVE",
        monitorMode: MonitorMode.PLAYWRIGHT,
        productsFound: 4,
        metadata: { validatedProductCount: 4, skippedNonTargetProducts: 40 }
      },
      store
    );

    expect(recommendation.status).toBe("NOISY");
    expect(recommendation.reason).toContain("review");
  });

  it("does not select unsafe or empty candidates as best source", () => {
    const best = bestSourceCandidate(
      [
        { id: "unsafe", url: "https://shop.example/cart/add?id=1", status: "ACTIVE", monitorMode: MonitorMode.PLAYWRIGHT, productsFound: 99 },
        { id: "empty", url: "https://shop.example/pokemon", status: "EMPTY", monitorMode: MonitorMode.PLAYWRIGHT, productsFound: 0 },
        { id: "good", url: "https://shop.example/pokemon/boosters", status: "ACTIVE", monitorMode: MonitorMode.PLAYWRIGHT, productsFound: 5 }
      ],
      store
    );

    expect(best?.id).toBe("good");
    expect(sourceHealthSummary([], store).bestReason).toContain("No validated");
  });
});
