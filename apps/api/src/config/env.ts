export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  jwtSecret: process.env.JWT_SECRET ?? "change-me-in-production",
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 10_000),
  maxRetries: Number(process.env.MAX_RETRIES ?? 3),
  defaultPollingIntervalSeconds: Number(process.env.DEFAULT_POLLING_INTERVAL_SECONDS ?? 300)
};
