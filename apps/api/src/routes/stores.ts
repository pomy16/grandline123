import { Router } from "express";
import { MonitorMode, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { scanQueue } from "../lib/queue";

export const storesRouter = Router();

const storeSortFields = new Set(["name", "mode", "active", "lastScanAt", "nextScanAt", "repeatedFailureCount", "createdAt", "updatedAt"]);

function pagination(query: Record<string, unknown>) {
  const page = Math.max(Number(query.page ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize ?? 20), 5), 100);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function storePayload(body: Record<string, unknown>) {
  return {
    name: String(body.name ?? ""),
    baseUrl: String(body.baseUrl ?? ""),
    listingUrls: parseStringList(body.listingUrls),
    apiEndpoint: typeof body.apiEndpoint === "string" && body.apiEndpoint.length > 0 ? body.apiEndpoint : null,
    mode: typeof body.mode === "string" && body.mode in MonitorMode ? (body.mode as MonitorMode) : "MOCK",
    pollingIntervalSeconds: Number(body.pollingIntervalSeconds ?? 300),
    currency: String(body.currency ?? "EUR").toUpperCase(),
    country: typeof body.country === "string" ? body.country : null,
    language: typeof body.language === "string" ? body.language : null,
    active: Boolean(body.active),
    trusted: Boolean(body.trusted),
    publicCartUrl: typeof body.publicCartUrl === "string" && body.publicCartUrl.length > 0 ? body.publicCartUrl : null,
    requestHeaders: body.requestHeaders ? (body.requestHeaders as Prisma.InputJsonValue) : undefined,
    selectorProductUrl: typeof body.selectorProductUrl === "string" ? body.selectorProductUrl : null,
    selectorTitle: typeof body.selectorTitle === "string" ? body.selectorTitle : null,
    selectorPrice: typeof body.selectorPrice === "string" ? body.selectorPrice : null,
    selectorImage: typeof body.selectorImage === "string" ? body.selectorImage : null,
    selectorStockStatus: typeof body.selectorStockStatus === "string" ? body.selectorStockStatus : null,
    selectorPreorderStatus: typeof body.selectorPreorderStatus === "string" ? body.selectorPreorderStatus : null,
    notes: typeof body.notes === "string" ? body.notes : null
  };
}

storesRouter.get("/", async (request, response) => {
  const { page, pageSize, skip } = pagination(request.query);
  const sortBy = typeof request.query.sortBy === "string" && storeSortFields.has(request.query.sortBy) ? request.query.sortBy : "createdAt";
  const sortOrder = request.query.sortOrder === "asc" ? "asc" : "desc";
  const q = typeof request.query.q === "string" ? request.query.q.trim() : "";
  const status = typeof request.query.status === "string" ? request.query.status : "";
  const mode = typeof request.query.mode === "string" ? request.query.mode : "";
  const where: Prisma.StoreWhereInput = {
    mode: mode in MonitorMode ? (mode as MonitorMode) : undefined,
    active: status === "active" ? true : status === "paused" ? false : undefined,
    lastError: status === "error" ? { not: null } : undefined,
    OR: q
      ? [
          { name: { contains: q, mode: "insensitive" } },
          { baseUrl: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } }
        ]
      : undefined
  };
  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: { _count: { select: { products: true, scanJobs: true } } },
      skip,
      take: pageSize
    }),
    prisma.store.count({ where })
  ]);
  response.json({ data: stores, meta: { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) } });
});

storesRouter.post("/", async (request, response) => {
  if (!request.body.name || !request.body.baseUrl) {
    response.status(400).json({ error: "Store name and base URL are required." });
    return;
  }

  const store = await prisma.store.create({
    data: storePayload(request.body)
  });
  response.status(201).json({ data: store });
});

storesRouter.get("/:id", async (request, response) => {
  const store = await prisma.store.findUnique({
    where: { id: request.params.id },
    include: {
      products: { take: 20, orderBy: { lastSeenAt: "desc" } },
      scanJobs: { take: 20, orderBy: { createdAt: "desc" } }
    }
  });
  if (!store) {
    response.status(404).json({ error: "Store not found." });
    return;
  }
  response.json({ data: store });
});

storesRouter.patch("/:id", async (request, response) => {
  const store = await prisma.store.update({
    where: { id: request.params.id },
    data: storePayload(request.body)
  });
  response.json({ data: store });
});

storesRouter.delete("/:id", async (request, response) => {
  await prisma.store.delete({ where: { id: request.params.id } });
  response.status(204).send();
});

storesRouter.post("/:id/pause", async (request, response) => {
  const store = await prisma.store.update({ where: { id: request.params.id }, data: { active: false } });
  response.json({ data: store });
});

storesRouter.post("/:id/resume", async (request, response) => {
  const store = await prisma.store.update({ where: { id: request.params.id }, data: { active: true } });
  response.json({ data: store });
});

storesRouter.post("/:id/clear-error", async (request, response) => {
  const store = await prisma.store.update({
    where: { id: request.params.id },
    data: { lastError: null, repeatedFailureCount: 0, autoPausedAfterFailures: false }
  });
  response.json({ data: store });
});

storesRouter.post("/:id/scan", async (request, response) => {
  const scanJob = await prisma.scanJob.create({
    data: {
      storeId: request.params.id,
      status: "QUEUED",
      metadata: { triggeredBy: request.user?.email ?? "api" }
    }
  });
  const job = await scanQueue.add("scan-store", { storeId: request.params.id, scanJobId: scanJob.id });
  response.status(202).json({ data: { scanJob, queueJobId: job.id } });
});
