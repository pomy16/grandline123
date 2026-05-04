import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env";

export const redisConnection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null
});

export const scanQueue = new Queue("store-scans", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5_000
    },
    removeOnComplete: 100,
    removeOnFail: 250
  }
});
