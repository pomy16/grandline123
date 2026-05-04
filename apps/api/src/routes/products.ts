import { Router } from "express";
import { prisma } from "../lib/prisma";
import { scanQueue } from "../lib/queue";

export const productsRouter = Router();

productsRouter.get("/", async (request, response) => {
  const { q, storeId, game, stockStatus, category, minPrice, maxPrice, foundFrom, foundTo, includeIgnored } = request.query;
  const products = await prisma.product.findMany({
    where: {
      ignored: includeIgnored === "true" ? undefined : false,
      storeId: typeof storeId === "string" ? storeId : undefined,
      game: typeof game === "string" ? (game as never) : undefined,
      stockStatus: typeof stockStatus === "string" ? (stockStatus as never) : undefined,
      category: typeof category === "string" && category.length > 0 ? { contains: category, mode: "insensitive" } : undefined,
      price:
        typeof minPrice === "string" || typeof maxPrice === "string"
          ? {
              gte: typeof minPrice === "string" && minPrice.length > 0 ? Number(minPrice) : undefined,
              lte: typeof maxPrice === "string" && maxPrice.length > 0 ? Number(maxPrice) : undefined
            }
          : undefined,
      firstSeenAt:
        typeof foundFrom === "string" || typeof foundTo === "string"
          ? {
              gte: typeof foundFrom === "string" && foundFrom.length > 0 ? new Date(foundFrom) : undefined,
              lte: typeof foundTo === "string" && foundTo.length > 0 ? new Date(foundTo) : undefined
            }
          : undefined,
      OR:
        typeof q === "string" && q.length > 0
          ? [
              { title: { contains: q, mode: "insensitive" } },
              { normalizedTitle: { contains: q.toLowerCase(), mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { ean: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } }
            ]
          : undefined
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
