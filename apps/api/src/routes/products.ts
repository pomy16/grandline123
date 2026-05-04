import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { scanQueue } from "../lib/queue";

export const productsRouter = Router();

const productSortFields = new Set(["title", "price", "stockStatus", "firstSeenAt", "lastSeenAt", "lastChangedAt", "game", "category"]);

function pagination(query: Record<string, unknown>) {
  const page = Math.max(Number(query.page ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize ?? 25), 5), 100);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

productsRouter.get("/", async (request, response) => {
  const { q, storeId, game, stockStatus, category, minPrice, maxPrice, foundFrom, foundTo, includeIgnored } = request.query;
  const { page, pageSize, skip } = pagination(request.query);
  const sortBy = typeof request.query.sortBy === "string" && productSortFields.has(request.query.sortBy) ? request.query.sortBy : "lastSeenAt";
  const sortOrder = request.query.sortOrder === "asc" ? "asc" : "desc";
  const where: Prisma.ProductWhereInput = {
    ignored: includeIgnored === "true" ? undefined : false,
    storeId: typeof storeId === "string" && storeId.length > 0 ? storeId : undefined,
    game: typeof game === "string" && game.length > 0 ? (game as never) : undefined,
    stockStatus: typeof stockStatus === "string" && stockStatus.length > 0 ? (stockStatus as never) : undefined,
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
  };
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { store: true },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: pageSize
    }),
    prisma.product.count({ where })
  ]);
  response.json({ data: products, meta: { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) } });
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
