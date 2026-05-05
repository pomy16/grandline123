import { describe, expect, it } from "vitest";
import { routeCandidates } from "./notifications";

function labels(candidates: ReturnType<typeof routeCandidates>) {
  return candidates.map((candidate) => (candidate.kind === "target" ? candidate.target : `webhook:${candidate.webhookId}`));
}

describe("Discord webhook routing priority", () => {
  it("routes test notifications to TEST before store and game fallbacks", () => {
    expect(
      labels(
        routeCandidates({
          eventType: "NEW_PRODUCT",
          productGame: "POKEMON",
          priority: "NORMAL",
          storeWebhookId: "store-webhook",
          isTest: true
        })
      )
    ).toEqual(["TEST", "webhook:store-webhook", "POKEMON", "DEFAULT"]);
  });

  it("routes product events through high priority, store, event type, rule, game, then default", () => {
    expect(
      labels(
        routeCandidates({
          eventType: "PRICE_DROP",
          productGame: "ONE_PIECE",
          priority: "CRITICAL",
          storeWebhookId: "store-webhook",
          ruleTarget: "POKEMON"
        })
      )
    ).toEqual(["HIGH_PRIORITY", "webhook:store-webhook", "PRICE_DROP", "POKEMON", "ONE_PIECE", "DEFAULT"]);
  });

  it("routes preorder events to PREORDER before game fallback", () => {
    expect(
      labels(
        routeCandidates({
          eventType: "PREORDER_OPENED",
          productGame: "BOTH"
        })
      )
    ).toEqual(["PREORDER", "POKEMON", "ONE_PIECE", "DEFAULT"]);
  });
});
