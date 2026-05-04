import { readNumber, readRequiredString, readUrl } from "./lib/env";

const source = process.env;

export const workerConfig = {
  nodeEnv: source.NODE_ENV ?? "development",
  databaseUrl: readUrl(source, "DATABASE_URL", "", ["postgresql:", "postgres:"]),
  redisUrl: readUrl(source, "REDIS_URL", "redis://localhost:6379", ["redis:", "rediss:"]),
  requestTimeoutMs: readNumber(source, "REQUEST_TIMEOUT_MS", 10_000, { min: 1_000 }),
  maxRetries: readNumber(source, "MAX_RETRIES", 3, { min: 0, max: 10 }),
  retryBaseDelayMs: readNumber(source, "RETRY_BASE_DELAY_MS", 750, { min: 100 }),
  queueConcurrency: readNumber(source, "QUEUE_CONCURRENCY", 3, { min: 1, max: 20 }),
  rateLimitRequestsPerMinute: readNumber(source, "RATE_LIMIT_REQUESTS_PER_MINUTE", 30, { min: 1 }),
  repeatedFailurePauseThreshold: readNumber(source, "REPEATED_FAILURE_PAUSE_THRESHOLD", 5, { min: 1 }),
  defaultPollingIntervalSeconds: readNumber(source, "DEFAULT_POLLING_INTERVAL_SECONDS", 300, { min: 60 }),
  notificationCooldownSeconds: readNumber(source, "NOTIFICATION_COOLDOWN_SECONDS", 900, { min: 0 }),
  logRetentionDays: readNumber(source, "LOG_RETENTION_DAYS", 30, { min: 1 }),
  cleanupIntervalMs: readNumber(source, "CLEANUP_INTERVAL_MS", 60 * 60 * 1000, { min: 60_000 }),
  monitorUserAgent: readRequiredString(source, "MONITOR_USER_AGENT", { productionOnly: true })
};
