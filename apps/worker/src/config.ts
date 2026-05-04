export const workerConfig = {
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 10_000),
  maxRetries: Number(process.env.MAX_RETRIES ?? 3),
  repeatedFailurePauseThreshold: Number(process.env.REPEATED_FAILURE_PAUSE_THRESHOLD ?? 5)
};
