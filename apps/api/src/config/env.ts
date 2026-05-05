import { readNumber, readRequiredString, readUrl, requireProductionSecret } from "../lib/env";
import { loadLocalEnv } from "../lib/load-local-env";

loadLocalEnv();
const source = process.env;

export const env = {
  nodeEnv: source.NODE_ENV ?? "development",
  port: readNumber(source, { key: "API_PORT", defaultValue: 4000, min: 1, max: 65_535 }),
  databaseUrl: readUrl(source, { key: "DATABASE_URL", required: true, protocols: ["postgresql:", "postgres:"] }),
  redisUrl: readUrl(source, { key: "REDIS_URL", defaultValue: "redis://localhost:6379", protocols: ["redis:", "rediss:"] }),
  jwtSecret: requireProductionSecret(source, "JWT_SECRET", ["change-me", "change-me-in-production"]),
  sessionTtlSeconds: readNumber(source, { key: "SESSION_TTL_SECONDS", defaultValue: 24 * 60 * 60, min: 300 }),
  requestTimeoutMs: readNumber(source, { key: "REQUEST_TIMEOUT_MS", defaultValue: 10_000, min: 1_000 }),
  maxRetries: readNumber(source, { key: "MAX_RETRIES", defaultValue: 3, min: 0, max: 10 }),
  queueJobAttempts: readNumber(source, { key: "QUEUE_JOB_ATTEMPTS", defaultValue: 3, min: 1, max: 10 }),
  queueBackoffMs: readNumber(source, { key: "QUEUE_BACKOFF_MS", defaultValue: 5_000, min: 100 }),
  defaultPollingIntervalSeconds: readNumber(source, { key: "DEFAULT_POLLING_INTERVAL_SECONDS", defaultValue: 300, min: 60 }),
  notificationCooldownSeconds: readNumber(source, { key: "NOTIFICATION_COOLDOWN_SECONDS", defaultValue: 900, min: 0 }),
  logRetentionDays: readNumber(source, { key: "LOG_RETENTION_DAYS", defaultValue: 30, min: 1 }),
  adminEmail: readRequiredString(source, "ADMIN_EMAIL", { productionOnly: true }),
  adminPassword: readRequiredString(source, "ADMIN_PASSWORD", { productionOnly: true, minLength: source.NODE_ENV === "production" ? 12 : 1 })
};
