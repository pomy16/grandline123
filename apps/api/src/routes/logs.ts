import { Router } from "express";
import { prisma } from "../lib/prisma";

export const logsRouter = Router();

logsRouter.get("/", async (request, response) => {
  const logs = await prisma.scanLog.findMany({
    where: {
      storeId: typeof request.query.storeId === "string" ? request.query.storeId : undefined,
      severity: typeof request.query.severity === "string" ? (request.query.severity as never) : undefined
    },
    include: { store: true },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  response.json({ data: logs });
});

logsRouter.get("/scan-jobs", async (_request, response) => {
  const jobs = await prisma.scanJob.findMany({
    include: { store: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  response.json({ data: jobs });
});

logsRouter.get("/notifications", async (_request, response) => {
  const logs = await prisma.notificationLog.findMany({
    include: {
      product: { include: { store: true } },
      event: true
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  response.json({ data: logs });
});
