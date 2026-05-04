import cors from "cors";
import express from "express";
import { optionalAuth, requireAuth } from "./middleware/auth";
import { authRouter } from "./routes/auth";
import { dashboardRouter } from "./routes/dashboard";
import { eventsRouter } from "./routes/events";
import { healthRouter } from "./routes/health";
import { logsRouter } from "./routes/logs";
import { productsRouter } from "./routes/products";
import { rulesRouter } from "./routes/rules";
import { settingsRouter } from "./routes/settings";
import { storesRouter } from "./routes/stores";

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(optionalAuth);

  app.use("/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/dashboard", requireAuth, dashboardRouter);
  app.use("/api/stores", requireAuth, storesRouter);
  app.use("/api/products", requireAuth, productsRouter);
  app.use("/api/events", requireAuth, eventsRouter);
  app.use("/api/rules", requireAuth, rulesRouter);
  app.use("/api/settings", requireAuth, settingsRouter);
  app.use("/api/logs", requireAuth, logsRouter);

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    response.status(500).json({ error: message });
  });

  return app;
}
