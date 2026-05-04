import { prisma } from "./prisma";
import { redisConnection, scanWorker } from "./queues/scan-worker";
import { logger } from "./lib/logger";
import { runRetentionCleanup, startRetentionCleanup } from "./services/retention";

scanWorker.on("completed", (job) => {
  logger.info("Worker completed job.", { jobId: job.id, jobName: job.name });
});

scanWorker.on("failed", (job, error) => {
  logger.error("Worker failed job.", { jobId: job?.id ?? "unknown", jobName: job?.name ?? "unknown", error });
});

const stopRetentionCleanup = startRetentionCleanup();

runRetentionCleanup().catch((error) => logger.warn("Initial retention cleanup failed.", { error }));

logger.info("TCG Monitor worker is running.", {
  modes: ["MOCK", "API", "HTML", "SITEMAP", "RSS", "PLAYWRIGHT"],
  purchaseAssistOnly: true
});

async function shutdown(signal: string) {
  logger.info("Received shutdown signal; shutting down worker gracefully.", { signal });
  const forceExit = setTimeout(() => {
    logger.error("Worker shutdown timed out; forcing exit.", { signal });
    process.exit(1);
  }, 10_000);
  forceExit.unref();
  try {
    stopRetentionCleanup();
    await scanWorker.close();
    await redisConnection.quit();
    await prisma.$disconnect();
    clearTimeout(forceExit);
    process.exit(0);
  } catch (error) {
    logger.error("Worker shutdown failed.", { error });
    process.exit(1);
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
