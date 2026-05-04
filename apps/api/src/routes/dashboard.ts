import { Router } from "express";
import { prisma } from "../lib/prisma";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (_request, response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalStores,
    activeStores,
    productsFoundToday,
    alertsSentToday,
    restocksDetected,
    priceDropsDetected,
    failedScans,
    latestEvents
  ] = await Promise.all([
    prisma.store.count(),
    prisma.store.count({ where: { active: true } }),
    prisma.product.count({ where: { firstSeenAt: { gte: today } } }),
    prisma.notificationLog.count({ where: { status: "SENT", createdAt: { gte: today } } }),
    prisma.productEvent.count({ where: { type: "RESTOCK", createdAt: { gte: today } } }),
    prisma.productEvent.count({ where: { type: "PRICE_DROP", createdAt: { gte: today } } }),
    prisma.scanJob.count({ where: { status: "FAILED", createdAt: { gte: today } } }),
    prisma.productEvent.findMany({
      include: { product: { include: { store: true } } },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  response.json({
    data: {
      totalStores,
      activeStores,
      productsFoundToday,
      alertsSentToday,
      restocksDetected,
      priceDropsDetected,
      failedScans,
      latestEvents
    }
  });
});
