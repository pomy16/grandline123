import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const eventsRouter = Router();

function pagination(query: Record<string, unknown>) {
  const page = Math.max(Number(query.page ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize ?? 25), 5), 100);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

eventsRouter.get("/", async (request, response) => {
  const { page, pageSize, skip } = pagination(request.query);
  const q = typeof request.query.q === "string" ? request.query.q.trim() : "";
  const where: Prisma.ProductEventWhereInput = {
    type: typeof request.query.type === "string" && request.query.type.length > 0 ? (request.query.type as never) : undefined,
    notificationSent:
      request.query.notificationSent === "true" ? true : request.query.notificationSent === "false" ? false : undefined,
    product: {
      storeId: typeof request.query.storeId === "string" && request.query.storeId.length > 0 ? request.query.storeId : undefined,
      title: q ? { contains: q, mode: "insensitive" } : undefined
    }
  };
  const [events, total] = await Promise.all([
    prisma.productEvent.findMany({
      where,
      include: { product: { include: { store: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize
    }),
    prisma.productEvent.count({ where })
  ]);
  response.json({ data: events, meta: { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) } });
});
