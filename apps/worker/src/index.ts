import { prisma } from "./prisma";
import { redisConnection, scanWorker } from "./queues/scan-worker";

scanWorker.on("completed", (job) => {
  console.log(`Worker completed job ${job.id} (${job.name}).`);
});

scanWorker.on("failed", (job, error) => {
  console.error(`Worker failed job ${job?.id ?? "unknown"} (${job?.name ?? "unknown"}):`, error.message);
});

console.log("TCG Monitor worker is running. Phase 1 enables MOCK scans only.");

async function shutdown(signal: string) {
  console.log(`Received ${signal}; shutting down worker gracefully.`);
  await scanWorker.close();
  await redisConnection.quit();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
