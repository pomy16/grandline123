import { workerConfig } from "../config";
import { logger } from "../lib/logger";
import { prisma } from "../prisma";

export async function runRetentionCleanup(now = new Date()) {
  const olderThan = new Date(now.getTime() - workerConfig.logRetentionDays * 24 * 60 * 60 * 1000);
  const [scanLogs, notifications, scanJobs] = await prisma.$transaction([
    prisma.scanLog.deleteMany({ where: { createdAt: { lt: olderThan } } }),
    prisma.notificationLog.deleteMany({ where: { createdAt: { lt: olderThan } } }),
    prisma.scanJob.deleteMany({ where: { createdAt: { lt: olderThan }, status: { in: ["SUCCEEDED", "FAILED", "SKIPPED"] } } })
  ]);

  logger.info("Retention cleanup completed.", {
    olderThan: olderThan.toISOString(),
    scanLogsDeleted: scanLogs.count,
    notificationLogsDeleted: notifications.count,
    scanJobsDeleted: scanJobs.count
  });

  return { scanLogsDeleted: scanLogs.count, notificationLogsDeleted: notifications.count, scanJobsDeleted: scanJobs.count };
}

export function startRetentionCleanup() {
  const timer = setInterval(() => {
    runRetentionCleanup().catch((error) => logger.warn("Scheduled retention cleanup failed.", { error }));
  }, workerConfig.cleanupIntervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
