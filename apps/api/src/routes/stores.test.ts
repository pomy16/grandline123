import { createServer } from "node:http";
import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storeCreate: vi.fn()
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    store: {
      create: mocks.storeCreate
    }
  }
}));

vi.mock("../lib/queue", () => ({
  scanQueue: {
    add: vi.fn()
  }
}));

describe("stores routes", () => {
  let url = "";
  let server: ReturnType<typeof createServer>;

  beforeAll(async () => {
    const { storesRouter } = await import("./stores");
    const app = express();
    app.use(express.json());
    app.use((_request, _response, next) => {
      _request.user = { userId: "test-user", email: "test@example.com" };
      next();
    });
    app.use("/api/stores", storesRouter);
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind.");
    url = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  it("rejects unsafe listing URLs before creating a store", async () => {
    const response = await fetch(`${url}/api/stores`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Unsafe Store",
        baseUrl: "https://shop.example",
        listingUrls: "https://shop.example/cart/add?id=1",
        pollingIntervalSeconds: 300
      })
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("not safe as a scan source")
    });
    expect(mocks.storeCreate).not.toHaveBeenCalled();
  });
});
