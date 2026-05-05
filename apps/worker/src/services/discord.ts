import { createHash } from "node:crypto";
import type { AlertPriority, EventType, Game, WebhookTarget } from "@tcg-monitor/shared";
import { prisma } from "../prisma";

const colors: Record<EventType, number> = {
  NEW_PRODUCT: 0x3b82f6,
  RESTOCK: 0x22c55e,
  PRICE_DROP: 0x14b8a6,
  PRICE_INCREASE: 0xf97316,
  SOLD_OUT: 0xef4444,
  PREORDER_OPENED: 0xa855f7,
  PRODUCT_UPDATED: 0xeab308
};

export function buildDiscordPayload(input: {
  eventType: EventType;
  productTitle: string;
  storeName: string;
  price?: string | null;
  oldPrice?: string | null;
  stockStatus?: string | null;
  imageUrl?: string | null;
  productUrl: string;
  publicCartUrl?: string | null;
  category?: string | null;
  game?: Game | null;
  priority?: AlertPriority | null;
}) {
  const quickActions = [
    `[Open product](${input.productUrl})`,
    ...(input.publicCartUrl ? [`[Add to cart](${input.publicCartUrl})`] : [])
  ].join(" | ");

  return {
    embeds: [
      {
        title: input.productTitle,
        url: input.productUrl,
        color: colors[input.eventType],
        timestamp: new Date().toISOString(),
        thumbnail: input.imageUrl ? { url: input.imageUrl } : undefined,
        fields: [
          { name: "Store", value: input.storeName, inline: true },
          { name: "Event", value: input.eventType, inline: true },
          { name: "Price", value: input.price ?? "Unknown", inline: true },
          ...(input.oldPrice ? [{ name: "Old price", value: input.oldPrice, inline: true }] : []),
          { name: "Stock", value: input.stockStatus ?? "Unknown", inline: true },
          { name: "Category", value: input.category ?? "Uncategorized", inline: true },
          { name: "Game", value: input.game ?? "UNKNOWN", inline: true },
          { name: "Priority", value: input.priority ?? "NORMAL", inline: true },
          { name: "Quick actions", value: quickActions, inline: false }
        ],
        footer: { text: "TCG Monitor - purchase assist only" }
      }
    ]
  };
}

const routeLocks = new Map<string, Promise<unknown>>();
const lastSendAtByRoute = new Map<string, number>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function discordSendDelayMs() {
  return Number(process.env.DISCORD_SEND_DELAY_MS ?? 500);
}

function discordMaxRetries() {
  return Number(process.env.DISCORD_MAX_RETRIES ?? 2);
}

function discordRateLimitBackoffMs() {
  return Number(process.env.DISCORD_RATE_LIMIT_BACKOFF_MS ?? 2_500);
}

function routeKey(webhookUrl: string, target: WebhookTarget) {
  return `${target}:${createHash("sha256").update(webhookUrl).digest("hex").slice(0, 16)}`;
}

async function throttleRoute(key: string) {
  const delayMs = discordSendDelayMs();
  if (delayMs <= 0) return;
  const lastSendAt = lastSendAtByRoute.get(key) ?? 0;
  const waitMs = Math.max(lastSendAt + delayMs - Date.now(), 0);
  if (waitMs > 0) await sleep(waitMs);
  lastSendAtByRoute.set(key, Date.now());
}

async function withRouteThrottle<T>(key: string, task: () => Promise<T>) {
  const previous = routeLocks.get(key) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(async () => {
      await throttleRoute(key);
      return task();
    });
  routeLocks.set(
    key,
    next.finally(() => {
      if (routeLocks.get(key) === next) routeLocks.delete(key);
    })
  );
  return next;
}

function redactWebhookUrl(value: string, webhookUrl: string) {
  return value.split(webhookUrl).join("[redacted-discord-webhook-url]");
}

async function readResponseText(response: Response, webhookUrl: string) {
  const text = await response.text().catch(() => "");
  return redactWebhookUrl(text, webhookUrl);
}

export function retryDelayFromDiscordRateLimit(response: Pick<Response, "headers">, bodyText: string) {
  try {
    const parsed = JSON.parse(bodyText) as { retry_after?: unknown };
    if (typeof parsed.retry_after === "number" && Number.isFinite(parsed.retry_after)) return Math.max(Math.ceil(parsed.retry_after * 1000), 0);
    if (typeof parsed.retry_after === "string" && parsed.retry_after.trim()) {
      const value = Number(parsed.retry_after);
      if (Number.isFinite(value)) return Math.max(Math.ceil(value * 1000), 0);
    }
  } catch {
    // Fall through to the Retry-After header.
  }

  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(Math.ceil(seconds * 1000), 0);
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(date - Date.now(), 0);
  }

  return discordRateLimitBackoffMs();
}

async function postDiscordWebhook(params: {
  webhookUrl: string;
  target: WebhookTarget;
  webhookName?: string | null;
  eventId?: string;
  productId?: string;
  payload: unknown;
}) {
  const maxRetries = Math.max(discordMaxRetries(), 0);
  let lastResponse: { ok: boolean; status: number; statusText: string; body: string; durationMs: number; attempts: number; rateLimited: boolean } | null = null;
  let rateLimitedEver = false;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.DISCORD_TIMEOUT_MS ?? 10_000));
    try {
      const response = await fetch(params.webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(params.payload),
        signal: controller.signal
      });
      const body = await readResponseText(response, params.webhookUrl);
      const durationMs = Date.now() - startedAt;
      if (response.status === 429) rateLimitedEver = true;
      lastResponse = { ok: response.ok, status: response.status, statusText: response.statusText, body, durationMs, attempts: attempt, rateLimited: rateLimitedEver };

      if (response.ok) return lastResponse;
      if (response.status !== 429 || attempt > maxRetries) return lastResponse;

      const retryDelayMs = retryDelayFromDiscordRateLimit(response, body);
      await prisma.scanLog.create({
        data: {
          severity: "WARN",
          message: `Discord rate limit for ${params.target}; retrying delivery.`,
          context: {
            target: params.target,
            webhookName: params.webhookName ?? null,
            attempt,
            maxRetries,
            retryDelayMs,
            outcome: "retrying",
            eventId: params.eventId,
            productId: params.productId,
            status: response.status,
            statusText: response.statusText
          }
        }
      });
      await sleep(retryDelayMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  return lastResponse ?? { ok: false, status: 0, statusText: "No response", body: "", durationMs: 0, attempts: maxRetries + 1, rateLimited: false };
}

export async function sendWebhook(params: {
  webhookUrl: string;
  target: WebhookTarget;
  webhookName?: string | null;
  eventId?: string;
  productId?: string;
  payload: unknown;
  payloadHash?: string;
}) {
  const payloadHash = params.payloadHash ?? createHash("sha256").update(JSON.stringify(params.payload)).digest("hex");
  const startedAt = Date.now();
  const key = routeKey(params.webhookUrl, params.target);

  try {
    const delivery = await withRouteThrottle(key, () => postDiscordWebhook(params));
    const durationMs = Date.now() - startedAt;

    await prisma.notificationLog.create({
      data: {
        eventId: params.eventId,
        productId: params.productId,
        target: params.target,
        status: delivery.ok ? "SENT" : "FAILED",
        payloadHash,
        response: {
          status: delivery.status,
          statusText: delivery.statusText,
          durationMs,
          attempts: delivery.attempts,
          rateLimited: delivery.rateLimited,
          body: delivery.body.slice(0, 500)
        },
        sentAt: delivery.ok ? new Date() : null,
        error: delivery.ok ? null : `Discord returned ${delivery.status}: ${delivery.body.slice(0, 160)}`
      }
    });

    if (delivery.rateLimited) {
      await prisma.scanLog.create({
        data: {
          severity: delivery.ok ? "INFO" : "ERROR",
          message: delivery.ok ? `Discord rate limit recovered for ${params.target}.` : `Discord rate limit exhausted for ${params.target}.`,
          context: {
            eventId: params.eventId,
            productId: params.productId,
            target: params.target,
            webhookName: params.webhookName ?? null,
            attempts: delivery.attempts,
            finalStatus: delivery.status,
            outcome: delivery.ok ? "sent" : "failed"
          }
        }
      });
    }

    if (!delivery.ok) {
      await prisma.scanLog.create({
        data: {
          severity: "ERROR",
          message: `Discord delivery failed for ${params.target}.`,
          context: {
            eventId: params.eventId,
            productId: params.productId,
            target: params.target,
            webhookName: params.webhookName ?? null,
            status: delivery.status,
            statusText: delivery.statusText,
            durationMs,
            attempts: delivery.attempts
          }
        }
      });
    }

    return { ok: delivery.ok, status: delivery.status, payloadHash, target: params.target };
  } catch (error) {
    const message = redactWebhookUrl(error instanceof Error ? error.message : "Unknown Discord delivery error", params.webhookUrl);
    await prisma.notificationLog.create({
      data: {
        eventId: params.eventId,
        productId: params.productId,
        target: params.target,
        status: "FAILED",
        payloadHash,
        error: message,
        response: { durationMs: Date.now() - startedAt }
      }
    });
    await prisma.scanLog.create({
      data: {
        severity: "ERROR",
        message: `Discord delivery error for ${params.target}: ${message}`,
        context: { eventId: params.eventId, productId: params.productId, target: params.target, webhookName: params.webhookName ?? null }
      }
    });
    return { ok: false, status: 0, payloadHash, target: params.target, error: message };
  }
}
