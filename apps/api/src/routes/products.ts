import { Router } from "express";
import { prisma } from "../lib/prisma";
import { scanQueue } from "../lib/queue";

export const productsRouter = Router();

productsRouter.get("/", async (request, response) => {
  const { q, storeId, game, stockStatus } = request.query;
  const products = await prisma.product.findMany({
    where: {
      ignored: false,
      storeId: typeof storeId === "string" ? storeId : undefined,
      game: typeof game === "string" ? (game as never) : undefined,
      stockStatus: typeof stockStatus === "string" ? (stockStatus as never) : undefined,
      title: typeof q === "string" ? { contains: q, mode: "insensitive" } : undefined
    },
    include: { store: true },
    orderBy: { lastSeenAt: "desc" },
    take: 100
  });
  response.json({ data: products });
});

productsRouter.get("/:id", async (request, response) => {
  const product = await prisma.product.findUnique({
    where: { id: request.params.id },
    include: {
      store: true,
      snapshots: { orderBy: { capturedAt: "desc" }, take: 20 },
      events: { orderBy: { createdAt: "desc" }, take: 50 }
    }
  });
  if (!product) {
    response.status(404).json({ error: "Product not found." });
    return;
  }
  response.json({ data: product });
});

productsRouter.post("/:id/ignore", async (request, response) => {
  const product = await prisma.product.update({
    where: { id: request.params.id },
    data: {
      ignored: true,
      ignoredProducts: {
        upsert: {
          where: { productId: request.params.id },
          update: { reason: request.body.reason },
          create: { reason: request.body.reason }
        }
      }
    }
  });
  response.json({ data: product });
});

productsRouter.post("/:id/unignore", async (request, response) => {
  const product = await prisma.product.update({
    where: { id: request.params.id },
    data: {
      ignored: false,
      ignoredProducts: {
        deleteMany: {}
      }
    }
  });
  response.json({ data: product });
});

productsRouter.post("/:id/test-alert", async (request, response) => {
  const job = await scanQueue.add("test-product-alert", { productId: request.params.id, target: request.body.target ?? "DEFAULT" });
  response.status(202).json({ data: { queueJobId: job.id } });
});
