import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const logsRouter = Router();

function pagination(query: Record<string, unknown>, fallbackPageSize = 50) {
  const page = Math.max(Number(query.page ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize ?? fallbackPageSize), 5), 200);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

logsRouter.get("/", async (request, response) => {
  const { page, pageSize, skip } = pagination(request.query);
  const q = typeof request.query.q === "string" ? request.query.q.trim() : "";
  const where: Prisma.ScanLogWhereInput = {
      storeId: typeof request.query.storeId === "string" ? request.query.storeId : undefined,
      severity: typeof request.query.severity === "string" && request.query.severity.length > 0 ? (request.query.severity as never) : undefined,
      message: q ? { contains: q, mode: "insensitive" } : undefined
  };
  const [logs, total] = await Promise.all([
    prisma.scanLog.findMany({
      where,
      include: { store: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize
    }),
    prisma.scanLog.count({ where })
  ]);
  response.json({ data: logs, meta: { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) } });
});

logsRouter.get("/scan-jobs", async (request, response) => {
  const { page, pageSize, skip } = pagination(request.query, 25);
  const where: Prisma.ScanJobWhereInput = {
    storeId: typeof request.query.storeId === "string" && request.query.storeId.length > 0 ? request.query.storeId : undefined,
    status: typeof request.query.status === "string" && request.query.status.length > 0 ? (request.query.status as never) : undefined
  };
  const [jobs, total] = await Promise.all([
    prisma.scanJob.findMany({
      where,
      include: { store: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize
    }),
    prisma.scanJob.count({ where })
  ]);
  response.json({ data: jobs, meta: { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) } });
});

logsRouter.get("/notifications", async (request, response) => {
  const { page, pageSize, skip } = pagination(request.query, 25);
  const where: Prisma.NotificationLogWhereInput = {
    status: typeof request.query.status === "string" && request.query.status.length > 0 ? (request.query.status as never) : undefined,
    target: typeof request.query.target === "string" && request.query.target.length > 0 ? (request.query.target as never) : undefined
  };
  const [logs, total] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      include: {
        product: { include: { store: true } },
        event: true
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize
    }),
    prisma.notificationLog.count({ where })
  ]);
  response.json({ data: logs, meta: { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) } });
});
