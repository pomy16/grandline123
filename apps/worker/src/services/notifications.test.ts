import { describe, expect, it } from "vitest";
import { actionableNotificationSkipReason, routeCandidates, targetFallbackWebhookWhere } from "./notifications";

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

  it("routes product tests like normal store product events, not TEST/default random routes", () => {
    expect(
      labels(
        routeCandidates({
          eventType: "NEW_PRODUCT",
          productGame: "POKEMON",
          priority: "NORMAL",
          storeWebhookId: "alza-webhook"
        })
      )
    ).toEqual(["webhook:alza-webhook"]);
  });

  it("falls back without allowing unrelated store-specific DEFAULT webhooks", () => {
    expect(targetFallbackWebhookWhere("DEFAULT")).toEqual({
      target: "DEFAULT",
      active: true,
      stores: { none: {} }
    });
  });

  it("keeps Najada and Professor Onyx store-specific routes isolated by webhook id", () => {
    expect(
      labels(
        routeCandidates({
          eventType: "NEW_PRODUCT",
          productGame: "POKEMON",
          priority: "NORMAL",
          storeWebhookId: "cz-najada-webhook"
        })
      )
    ).toEqual(["webhook:cz-najada-webhook"]);
    expect(
      labels(
        routeCandidates({
          eventType: "NEW_PRODUCT",
          productGame: "POKEMON",
          priority: "NORMAL",
          storeWebhookId: "cz-professor-onyx-webhook"
        })
      )
    ).toEqual(["webhook:cz-professor-onyx-webhook"]);
  });

  it("suppresses non-actionable unavailable new products but allows restocks", () => {
    expect(
      actionableNotificationSkipReason({
        eventType: "NEW_PRODUCT",
        stockStatus: "OUT_OF_STOCK",
        isAvailable: false,
        isPreorder: false,
        price: 199,
        publicCartUrl: null
      })
    ).toContain("out of stock");
    expect(
      actionableNotificationSkipReason({
        eventType: "NEW_PRODUCT",
        stockStatus: "UNKNOWN",
        isAvailable: false,
        isPreorder: false,
        price: null,
        publicCartUrl: null
      })
    ).toContain("UNKNOWN stock");
    expect(
      actionableNotificationSkipReason({
        eventType: "RESTOCK",
        stockStatus: "IN_STOCK",
        isAvailable: true,
        isPreorder: false,
        price: null,
        publicCartUrl: null
      })
    ).toBeNull();
  });
});
