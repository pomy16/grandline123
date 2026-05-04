import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env";

export const redisConnection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null
});

export const scanQueue = new Queue("store-scans", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: env.queueJobAttempts,
    backoff: {
      type: "exponential",
      delay: env.queueBackoffMs
    },
    removeOnComplete: 100,
    removeOnFail: 250
  }
});
