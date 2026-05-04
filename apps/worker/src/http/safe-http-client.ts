import type { StoreConfig } from "@tcg-monitor/shared";

export type FetchKind = "API" | "HTML" | "SITEMAP" | "RSS" | "PLAYWRIGHT";

export interface SafeFetchResult {
  url: string;
  status: number;
  contentType: string;
  body: string;
  durationMs: number;
}

export class MonitorRequestError extends Error {
  constructor(
    message: string,
    readonly details: {
      kind: FetchKind;
      url: string;
      status?: number;
      durationMs?: number;
    }
  ) {
    super(message);
    this.name = "MonitorRequestError";
  }
}

const defaultUserAgent =
  process.env.MONITOR_USER_AGENT ??
  "TCGMonitor/0.1 (+https://github.com/pomy16/grandline123; purchase-assist monitoring; respects robots.txt)";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function headerValue(headers: Record<string, string> | null | undefined, key: string) {
  const match = Object.entries(headers ?? {}).find(([name]) => name.toLowerCase() === key.toLowerCase());
  return match?.[1];
}

function robotsPathAllowed(robotsText: string, targetUrl: string, userAgent: string) {
  const path = new URL(targetUrl).pathname || "/";
  const groups: Array<{ agents: string[]; disallow: string[]; allow: string[] }> = [];
  let current: { agents: string[]; disallow: string[]; allow: string[] } | null = null;

  for (const rawLine of robotsText.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line || !line.includes(":")) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      current = { agents: [value.toLowerCase()], disallow: [], allow: [] };
      groups.push(current);
      continue;
    }
    if (!current) continue;
    if (key === "disallow") current.disallow.push(value);
    if (key === "allow") current.allow.push(value);
  }

  const agent = userAgent.toLowerCase().split(/[ /]/)[0];
  const matchingGroups = groups.filter((group) => group.agents.some((candidate) => candidate === "*" || agent.includes(candidate)));
  const rules = matchingGroups.length > 0 ? matchingGroups : groups.filter((group) => group.agents.includes("*"));
  let best: { type: "allow" | "disallow"; length: number } | null = null;

  for (const rule of rules) {
    for (const allow of rule.allow) {
      if (allow && path.startsWith(allow) && (!best || allow.length > best.length)) best = { type: "allow", length: allow.length };
    }
    for (const disallow of rule.disallow) {
      if (disallow && path.startsWith(disallow) && (!best || disallow.length > best.length)) best = { type: "disallow", length: disallow.length };
    }
  }

  return best?.type !== "disallow";
}

export class SafeHttpClient {
  private robotsCache = new Map<string, boolean>();

  constructor(
    private readonly storeConfig: StoreConfig,
    private readonly options = {
      timeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 10_000),
      maxRetries: Number(process.env.MAX_RETRIES ?? 3),
      baseDelayMs: Number(process.env.RETRY_BASE_DELAY_MS ?? 750)
    }
  ) {}

  private headers() {
    const headers = { ...(this.storeConfig.requestHeaders ?? {}) };
    if (!headerValue(headers, "user-agent")) headers["user-agent"] = defaultUserAgent;
    if (!headerValue(headers, "accept")) headers.accept = "application/json,text/html,application/xml,text/xml;q=0.9,*/*;q=0.8";
    return headers;
  }

  async assertRobotsAllowed(url: string) {
    if (process.env.RESPECT_ROBOTS_TXT === "false") return;
    const parsed = new URL(url, this.storeConfig.baseUrl);
    const cacheKey = `${parsed.origin}${parsed.pathname}`;
    if (this.robotsCache.has(cacheKey)) {
      if (!this.robotsCache.get(cacheKey)) throw new Error(`robots.txt disallows monitoring ${parsed.toString()}`);
      return;
    }

    const robotsUrl = `${parsed.origin}/robots.txt`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), Math.min(this.options.timeoutMs, 5_000));
      const response = await fetch(robotsUrl, {
        headers: this.headers(),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!response.ok) {
        this.robotsCache.set(cacheKey, true);
        return;
      }
      const text = await response.text();
      const allowed = robotsPathAllowed(text, parsed.toString(), headerValue(this.headers(), "user-agent") ?? defaultUserAgent);
      this.robotsCache.set(cacheKey, allowed);
      if (!allowed) throw new Error(`robots.txt disallows monitoring ${parsed.toString()}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("robots.txt disallows")) throw error;
      this.robotsCache.set(cacheKey, true);
    }
  }

  async fetchText(url: string, kind: FetchKind): Promise<SafeFetchResult> {
    const targetUrl = new URL(url, this.storeConfig.baseUrl).toString();
    await this.assertRobotsAllowed(targetUrl);

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt += 1) {
      const startedAt = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

      try {
        const response = await fetch(targetUrl, {
          headers: this.headers(),
          signal: controller.signal
        });
        const body = await response.text();
        const result = {
          url: targetUrl,
          status: response.status,
          contentType: response.headers.get("content-type") ?? "",
          body,
          durationMs: Date.now() - startedAt
        };
        if (response.ok) return result;
        if (![408, 429, 500, 502, 503, 504].includes(response.status)) {
          throw new MonitorRequestError(`${kind} monitor request failed with ${response.status} for ${targetUrl}`, {
            kind,
            url: targetUrl,
            status: response.status,
            durationMs: result.durationMs
          });
        }
        lastError = new MonitorRequestError(`${kind} monitor retryable HTTP ${response.status} for ${targetUrl}`, {
          kind,
          url: targetUrl,
          status: response.status,
          durationMs: result.durationMs
        });
      } catch (error) {
        lastError = error;
      } finally {
        clearTimeout(timeout);
      }

      if (attempt < this.options.maxRetries) {
        await sleep(this.options.baseDelayMs * 2 ** attempt);
      }
    }

    throw lastError instanceof Error ? lastError : new MonitorRequestError(`${kind} monitor request failed for ${targetUrl}`, { kind, url: targetUrl });
  }
}
