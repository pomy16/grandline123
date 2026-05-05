import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  notificationLog: { create: vi.fn() },
  scanLog: { create: vi.fn() }
}));

vi.mock("../prisma", () => ({ prisma: prismaMock }));

import { buildDiscordPayload, retryDelayFromDiscordRateLimit, sendWebhook } from "./discord";

describe("Discord webhook payload formatting", () => {
  beforeEach(() => {
    vi.stubEnv("DISCORD_SEND_DELAY_MS", "0");
    vi.stubEnv("DISCORD_MAX_RETRIES", "2");
    vi.stubEnv("DISCORD_RATE_LIMIT_BACKOFF_MS", "1");
    prismaMock.notificationLog.create.mockReset();
    prismaMock.scanLog.create.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

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

  it("parses Discord retry delay from retry_after response body", () => {
    const response = new Response(JSON.stringify({ retry_after: 0.25 }), { status: 429 });

    expect(retryDelayFromDiscordRateLimit(response, JSON.stringify({ retry_after: 0.25 }))).toBe(250);
  });

  it("parses Discord retry delay from Retry-After header", () => {
    const response = new Response("", { status: 429, headers: { "retry-after": "0.5" } });

    expect(retryDelayFromDiscordRateLimit(response, "")).toBe(500);
  });

  it("uses fallback Discord backoff when no retry delay is available", () => {
    vi.stubEnv("DISCORD_RATE_LIMIT_BACKOFF_MS", "1234");
    const response = new Response("", { status: 429 });

    expect(retryDelayFromDiscordRateLimit(response, "")).toBe(1234);
  });

  it("retries HTTP 429 with retry_after and marks notification sent when retry succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ retry_after: 0.001 }), { status: 429, statusText: "Too Many Requests" }))
      .mockResolvedValueOnce(new Response(null, { status: 204, statusText: "No Content" }));
    vi.stubGlobal("fetch", fetchMock);

    const delivery = await sendWebhook({
      webhookUrl: "https://discord.com/api/webhooks/secret/token",
      webhookName: "high-priority",
      target: "HIGH_PRIORITY",
      payload: { content: "test" }
    });

    expect(delivery.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(prismaMock.notificationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SENT",
          response: expect.objectContaining({ attempts: 2, rateLimited: true })
        })
      })
    );
    expect(prismaMock.scanLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          severity: "WARN",
          context: expect.objectContaining({ webhookName: "high-priority", retryDelayMs: 1, attempt: 1 })
        })
      })
    );
    expect(JSON.stringify(prismaMock.scanLog.create.mock.calls)).not.toContain("https://discord.com/api/webhooks/secret/token");
  });

  it("marks notification failed only after Discord rate limit retries are exhausted", async () => {
    vi.stubEnv("DISCORD_MAX_RETRIES", "1");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ retry_after: 0.001 }), { status: 429, statusText: "Too Many Requests" }))
      .mockResolvedValueOnce(new Response("still limited", { status: 429, statusText: "Too Many Requests" }));
    vi.stubGlobal("fetch", fetchMock);

    const delivery = await sendWebhook({
      webhookUrl: "https://discord.com/api/webhooks/secret/token",
      webhookName: "high-priority",
      target: "HIGH_PRIORITY",
      payload: { content: "test" }
    });

    expect(delivery.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(prismaMock.notificationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          response: expect.objectContaining({ attempts: 2, rateLimited: true })
        })
      })
    );
  });
});
