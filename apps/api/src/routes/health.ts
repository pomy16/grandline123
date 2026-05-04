import { Router } from "express";
import type { Response } from "express";
import { prisma } from "../lib/prisma";
import { scanQueue } from "../lib/queue";
import { env } from "../config/env";

export const healthRouter = Router();

healthRouter.get("/live", (_request, response) => {
  response.json({
    status: "ok",
    service: "tcg-monitor-api",
    timestamp: new Date().toISOString()
  });
});

async function readyResponse(response: Response) {
  await prisma.$queryRaw`SELECT 1`;
  await scanQueue.getJobCounts("waiting", "active", "delayed", "failed");
  response.json({
    status: "ok",
    service: "tcg-monitor-api",
    dependencies: {
      database: "ok",
      queue: "ok"
    },
    timestamp: new Date().toISOString()
  });
}

healthRouter.get("/", async (_request, response) => {
  await readyResponse(response);
});

healthRouter.get("/ready", async (_request, response) => {
  await readyResponse(response);
});

healthRouter.get("/worker", async (_request, response) => {
  const counts = await scanQueue.getJobCounts("waiting", "active", "delayed", "failed", "completed");
  response.json({
    status: counts.failed > 0 ? "degraded" : "ok",
    service: "tcg-monitor-worker-queue",
    queue: {
      name: scanQueue.name,
      counts,
      attempts: env.queueJobAttempts,
      backoffMs: env.queueBackoffMs
    },
    timestamp: new Date().toISOString()
  });
});
