import { Router } from "express";
import { prisma } from "../lib/prisma";

export const healthRouter = Router();

healthRouter.get("/", async (_request, response) => {
  await prisma.$queryRaw`SELECT 1`;
  response.json({
    status: "ok",
    service: "tcg-monitor-api",
    timestamp: new Date().toISOString()
  });
});
