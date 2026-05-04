import { createServer } from "node:http";
import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }])
  }
}));

vi.mock("../lib/queue", () => ({
  scanQueue: {
    name: "store-scans",
    getJobCounts: vi.fn().mockResolvedValue({ waiting: 0, active: 0, delayed: 0, failed: 0, completed: 0 })
  }
}));

vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/app");
vi.stubEnv("JWT_SECRET", "test-secret");

describe("health routes", () => {
  let url = "";
  let server: ReturnType<typeof createServer>;

  beforeAll(async () => {
    const { healthRouter } = await import("./health");
    const app = express();
    app.use("/health", healthRouter);
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind.");
    url = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  it("returns live status without dependency checks", async () => {
    const response = await fetch(`${url}/health/live`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok", service: "tcg-monitor-api" });
  });

  it("returns ready status with dependency details", async () => {
    const response = await fetch(`${url}/health/ready`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      dependencies: { database: "ok", queue: "ok" }
    });
  });
});
