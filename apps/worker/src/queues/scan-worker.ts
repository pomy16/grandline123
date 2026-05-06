import { Worker } from "bullmq";
import IORedis from "ioredis";
import { workerConfig } from "../config";
import { discoverStoreSources } from "../services/discovery";
import { sendProductTestAlert } from "../services/notifications";
import { scanStore } from "../services/scanner";

export const redisConnection = new IORedis(workerConfig.redisUrl, {
  maxRetriesPerRequest: null
});

export const scanWorker = new Worker(
  "store-scans",
  async (job) => {
    if (job.name === "scan-store") {
      return scanStore(job.data.storeId, job.data.scanJobId);
    }

    if (job.name === "discover-store") {
      return discoverStoreSources(job.data.storeId, job.data.scanJobId);
    }

    if (job.name === "test-product-alert") {
      return sendProductTestAlert(job.data.productId);
    }

    throw new Error(`Unknown queue job: ${job.name}`);
  },
  {
    connection: redisConnection,
    concurrency: workerConfig.queueConcurrency,
    limiter: {
      max: workerConfig.rateLimitRequestsPerMinute,
      duration: 60_000
    }
  }
);
