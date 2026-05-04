import { Router } from "express";
import { prisma } from "../lib/prisma";

export const eventsRouter = Router();

eventsRouter.get("/", async (request, response) => {
  const events = await prisma.productEvent.findMany({
    where: {
      type: typeof request.query.type === "string" ? (request.query.type as never) : undefined
    },
    include: { product: { include: { store: true } } },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  response.json({ data: events });
});
