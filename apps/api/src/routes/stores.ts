import { Router } from "express";
import { prisma } from "../lib/prisma";
import { scanQueue } from "../lib/queue";

export const storesRouter = Router();

storesRouter.get("/", async (_request, response) => {
  const stores = await prisma.store.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } }
  });
  response.json({ data: stores });
});

storesRouter.post("/", async (request, response) => {
  const store = await prisma.store.create({
    data: {
      name: request.body.name,
      baseUrl: request.body.baseUrl,
      listingUrls: request.body.listingUrls ?? [],
      apiEndpoint: request.body.apiEndpoint,
      mode: request.body.mode ?? "MOCK",
      pollingIntervalSeconds: request.body.pollingIntervalSeconds ?? 300,
      currency: request.body.currency ?? "EUR",
      country: request.body.country,
      language: request.body.language,
      active: request.body.active ?? false,
      requestHeaders: request.body.requestHeaders,
      selectorProductUrl: request.body.selectorProductUrl,
      selectorTitle: request.body.selectorTitle,
      selectorPrice: request.body.selectorPrice,
      selectorImage: request.body.selectorImage,
      selectorStockStatus: request.body.selectorStockStatus,
      selectorPreorderStatus: request.body.selectorPreorderStatus,
      notes: request.body.notes
    }
  });
  response.status(201).json({ data: store });
});

storesRouter.get("/:id", async (request, response) => {
  const store = await prisma.store.findUnique({
    where: { id: request.params.id },
    include: { products: { take: 20, orderBy: { lastSeenAt: "desc" } } }
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
    data: request.body
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
