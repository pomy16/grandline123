import { Worker } from "bullmq";
import IORedis from "ioredis";
import { workerConfig } from "../config";
import { prisma } from "../prisma";
import { buildDiscordPayload, sendWebhook } from "../services/discord";
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

    if (job.name === "test-product-alert") {
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: job.data.productId },
        include: { store: true }
      });
      const webhook = await prisma.discordWebhook.findFirst({
        where: { target: job.data.target ?? "DEFAULT", active: true }
      });
      if (!webhook) {
        throw new Error(`No active Discord webhook configured for target ${job.data.target ?? "DEFAULT"}.`);
      }

      return sendWebhook({
        webhookUrl: webhook.url,
        target: webhook.target,
        productId: product.id,
        payload: buildDiscordPayload({
          eventType: "NEW_PRODUCT",
          productTitle: product.title,
          storeName: product.store.name,
          price: product.price ? `${product.price.toString()} ${product.currency}` : null,
          stockStatus: product.stockStatus,
          imageUrl: product.imageUrl,
          productUrl: product.url,
          category: product.category
        })
      });
    }

    throw new Error(`Unknown queue job: ${job.name}`);
  },
  {
    connection: redisConnection,
    concurrency: 3,
    limiter: {
      max: 30,
      duration: 60_000
    }
  }
);
