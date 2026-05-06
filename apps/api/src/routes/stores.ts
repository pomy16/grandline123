import { Router } from "express";
import { MonitorMode, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { scanQueue } from "../lib/queue";
import { addScanSourceUrl, isSafeScanSourceUrl, promotePrimarySourceUrl, removeScanSourceUrl } from "../services/source-candidates";
import { bestSourceCandidate, enrichSourceCandidates, sourceHealthSummary } from "../services/source-health";

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
    discordWebhookId: typeof body.discordWebhookId === "string" && body.discordWebhookId.length > 0 ? body.discordWebhookId : null,
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

function validateStoreInput(body: Record<string, unknown>) {
  const errors: string[] = [];
  const baseUrl = String(body.baseUrl ?? "");
  const listingUrls = parseStringList(body.listingUrls);

  if (!String(body.name ?? "").trim()) errors.push("Store name is required.");
  try {
    const parsedBase = new URL(baseUrl);
    if (!["http:", "https:"].includes(parsedBase.protocol)) errors.push("Base URL must use http or https.");
  } catch {
    errors.push("Base URL must be a valid URL.");
  }

  if (listingUrls.length === 0) errors.push("At least one listing URL is required.");
  for (const url of listingUrls) {
    if (!isSafeScanSourceUrl(url, baseUrl)) {
      errors.push(`Listing URL is not safe as a scan source: ${url}`);
    }
  }

  if (Number(body.pollingIntervalSeconds ?? 300) < 60) {
    errors.push("Polling interval must be at least 60 seconds.");
  }

  return errors;
}

function withSourceHealth<T extends { baseUrl: string; mode: MonitorMode; listingUrls: string[]; sourceCandidates?: unknown[] }>(store: T) {
  const sourceCandidates = (store.sourceCandidates ?? []) as Array<{
    id: string;
    url: string;
    status: string;
    monitorMode: MonitorMode;
    productsFound: number;
    metadata?: unknown;
    reason?: string | null;
  }>;
  const sourceStore = { baseUrl: store.baseUrl, mode: store.mode, listingUrls: store.listingUrls };
  return {
    ...store,
    sourceCandidates: enrichSourceCandidates(sourceCandidates, sourceStore),
    sourceHealth: sourceHealthSummary(sourceCandidates, sourceStore)
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
      include: { discordWebhook: true, sourceCandidates: { orderBy: [{ status: "asc" }, { updatedAt: "desc" }] }, _count: { select: { products: true, scanJobs: true, sourceCandidates: true } } },
      skip,
      take: pageSize
    }),
    prisma.store.count({ where })
  ]);
  response.json({ data: stores.map(withSourceHealth), meta: { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) } });
});

storesRouter.post("/", async (request, response) => {
  const validationErrors = validateStoreInput(request.body);
  if (validationErrors.length > 0) {
    response.status(400).json({ error: validationErrors.join(" ") });
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
      scanJobs: { take: 20, orderBy: { createdAt: "desc" } },
      sourceCandidates: { orderBy: [{ status: "asc" }, { productsFound: "desc" }, { updatedAt: "desc" }] },
      discordWebhook: true
    }
  });
  if (!store) {
    response.status(404).json({ error: "Store not found." });
    return;
  }
  response.json({ data: withSourceHealth(store) });
});

storesRouter.patch("/:id", async (request, response) => {
  const validationErrors = validateStoreInput(request.body);
  if (validationErrors.length > 0) {
    response.status(400).json({ error: validationErrors.join(" ") });
    return;
  }

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

storesRouter.post("/:id/discover", async (request, response) => {
  const scanJob = await prisma.scanJob.create({
    data: {
      storeId: request.params.id,
      status: "QUEUED",
      metadata: { type: "discovery", triggeredBy: request.user?.email ?? "api" }
    }
  });
  const job = await scanQueue.add("discover-store", { storeId: request.params.id, scanJobId: scanJob.id });
  response.status(202).json({ data: { scanJob, queueJobId: job.id } });
});

storesRouter.post("/:id/source-candidates/:candidateId/promote", async (request, response) => {
  const [candidate, currentStore] = await Promise.all([
    prisma.sourceCandidate.findFirst({
      where: { id: request.params.candidateId, storeId: request.params.id }
    }),
    prisma.store.findUnique({ where: { id: request.params.id } })
  ]);
  if (!candidate) {
    response.status(404).json({ error: "Source candidate not found." });
    return;
  }
  if (!currentStore) {
    response.status(404).json({ error: "Store not found." });
    return;
  }
  if (candidate.status !== "ACTIVE") {
    response.status(400).json({ error: "Only active source candidates can be promoted." });
    return;
  }
  if (!isSafeScanSourceUrl(candidate.url, currentStore.baseUrl)) {
    response.status(400).json({ error: "This candidate URL is not safe as a scan source." });
    return;
  }
  const listingUrls =
    candidate.monitorMode === currentStore.mode
      ? promotePrimarySourceUrl(currentStore.listingUrls, candidate.url, currentStore.baseUrl)
      : [candidate.url];

  const store = await prisma.store.update({
    where: { id: request.params.id },
    data: {
      listingUrls,
      mode: candidate.monitorMode,
      lastError: null,
      repeatedFailureCount: 0,
      autoPausedAfterFailures: false,
      sourceCandidates: {
        update: {
          where: { id: candidate.id },
          data: { promotedAt: new Date() }
        }
      }
    },
    include: { sourceCandidates: { take: 25, orderBy: [{ status: "asc" }, { productsFound: "desc" }, { updatedAt: "desc" }] } }
  });
  response.json({ data: store });
});

storesRouter.post("/:id/source-candidates/promote-best", async (request, response) => {
  const currentStore = await prisma.store.findUnique({
    where: { id: request.params.id },
    include: { sourceCandidates: true }
  });
  if (!currentStore) {
    response.status(404).json({ error: "Store not found." });
    return;
  }

  const candidate = bestSourceCandidate(currentStore.sourceCandidates, currentStore);
  if (!candidate) {
    response.status(400).json({ error: "No safe validated source candidate is available to promote." });
    return;
  }
  if (!isSafeScanSourceUrl(candidate.url, currentStore.baseUrl)) {
    response.status(400).json({ error: "Best candidate URL is not safe as a scan source." });
    return;
  }

  const listingUrls =
    candidate.monitorMode === currentStore.mode
      ? promotePrimarySourceUrl(currentStore.listingUrls, candidate.url, currentStore.baseUrl)
      : [candidate.url];

  const store = await prisma.store.update({
    where: { id: request.params.id },
    data: {
      listingUrls,
      mode: candidate.monitorMode,
      lastError: null,
      repeatedFailureCount: 0,
      autoPausedAfterFailures: false,
      sourceCandidates: {
        update: {
          where: { id: candidate.id },
          data: { promotedAt: new Date() }
        }
      }
    },
    include: { sourceCandidates: { orderBy: [{ status: "asc" }, { productsFound: "desc" }, { updatedAt: "desc" }] } }
  });
  response.json({ data: withSourceHealth(store), promotedCandidateId: candidate.id, recommendation: candidate.recommendation });
});

storesRouter.post("/:id/source-candidates/:candidateId/activate", async (request, response) => {
  const [candidate, currentStore] = await Promise.all([
    prisma.sourceCandidate.findFirst({
      where: { id: request.params.candidateId, storeId: request.params.id }
    }),
    prisma.store.findUnique({ where: { id: request.params.id } })
  ]);
  if (!candidate) {
    response.status(404).json({ error: "Source candidate not found." });
    return;
  }
  if (!currentStore) {
    response.status(404).json({ error: "Store not found." });
    return;
  }
  if (candidate.status !== "ACTIVE") {
    response.status(400).json({ error: "Only active source candidates can be added as scan sources." });
    return;
  }
  if (!isSafeScanSourceUrl(candidate.url, currentStore.baseUrl)) {
    response.status(400).json({ error: "This candidate URL is not safe as a scan source." });
    return;
  }
  if (candidate.monitorMode !== currentStore.mode) {
    response.status(400).json({ error: "Candidate monitor mode must match the store mode before it can be added as an extra scan source." });
    return;
  }

  const store = await prisma.store.update({
    where: { id: request.params.id },
    data: {
      listingUrls: addScanSourceUrl(currentStore.listingUrls, candidate.url, currentStore.baseUrl),
      lastError: null,
      repeatedFailureCount: 0,
      autoPausedAfterFailures: false
    },
    include: { sourceCandidates: { take: 25, orderBy: [{ status: "asc" }, { productsFound: "desc" }, { updatedAt: "desc" }] } }
  });
  response.json({ data: store });
});

storesRouter.post("/:id/source-candidates/:candidateId/deactivate", async (request, response) => {
  const [candidate, currentStore] = await Promise.all([
    prisma.sourceCandidate.findFirst({
      where: { id: request.params.candidateId, storeId: request.params.id }
    }),
    prisma.store.findUnique({ where: { id: request.params.id } })
  ]);
  if (!candidate) {
    response.status(404).json({ error: "Source candidate not found." });
    return;
  }
  if (!currentStore) {
    response.status(404).json({ error: "Store not found." });
    return;
  }

  let listingUrls: string[];
  try {
    listingUrls = removeScanSourceUrl(currentStore.listingUrls, candidate.url, currentStore.baseUrl);
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "Scan source could not be removed." });
    return;
  }

  const store = await prisma.store.update({
    where: { id: request.params.id },
    data: { listingUrls },
    include: { sourceCandidates: { take: 25, orderBy: [{ status: "asc" }, { productsFound: "desc" }, { updatedAt: "desc" }] } }
  });
  response.json({ data: store });
});
