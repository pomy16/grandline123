import { describe, expect, it } from "vitest";
import { routeCandidates } from "./notifications";

function labels(candidates: ReturnType<typeof routeCandidates>) {
  return candidates.map((candidate) => (candidate.kind === "target" ? candidate.target : `webhook:${candidate.webhookId}`));
}

describe("Discord webhook routing priority", () => {
  it("routes test notifications only to TEST", () => {
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
    ).toEqual(["TEST"]);
  });

  it("routes error notifications only to ERROR_LOG", () => {
    expect(
      labels(
        routeCandidates({
          eventType: "NEW_PRODUCT",
          productGame: "UNKNOWN",
          priority: "CRITICAL",
          storeWebhookId: "store-webhook",
          isError: true
        })
      )
    ).toEqual(["ERROR_LOG"]);
  });

  it("routes normal store events only to the store webhook", () => {
    expect(
      labels(
        routeCandidates({
          eventType: "RESTOCK",
          productGame: "POKEMON",
          priority: "NORMAL",
          storeWebhookId: "store-webhook",
          ruleTarget: "POKEMON"
        })
      )
    ).toEqual(["webhook:store-webhook"]);
  });

  it("routes high-priority store events only to store webhook by default", () => {
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
    ).toEqual(["webhook:store-webhook"]);
  });

  it("does not let an explicit HIGH_PRIORITY rule target replace a store webhook", () => {
    expect(
      labels(
        routeCandidates({
          eventType: "NEW_PRODUCT",
          productGame: "POKEMON",
          priority: "HIGH",
          storeWebhookId: "store-webhook",
          ruleTarget: "HIGH_PRIORITY"
        })
      )
    ).toEqual(["webhook:store-webhook"]);
  });

  it("routes high-priority store events to store plus HIGH_PRIORITY when multi-route is enabled", () => {
    expect(
      labels(
        routeCandidates({
          eventType: "PRICE_DROP",
          productGame: "ONE_PIECE",
          priority: "CRITICAL",
          storeWebhookId: "store-webhook",
          ruleTarget: "POKEMON",
          multiRouteHighPriority: true
        })
      )
    ).toEqual(["webhook:store-webhook", "HIGH_PRIORITY"]);
  });

  it("uses high priority as primary fallback when store webhook is missing", () => {
    expect(
      labels(
        routeCandidates({
          eventType: "PRICE_DROP",
          productGame: "ONE_PIECE",
          priority: "CRITICAL",
          ruleTarget: "POKEMON"
        })
      )
    ).toEqual(["HIGH_PRIORITY", "PRICE_DROP", "POKEMON", "ONE_PIECE", "DEFAULT"]);
  });

  it("routes preorder fallback to PREORDER before game fallback", () => {
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
