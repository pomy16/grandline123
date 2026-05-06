import { createServer } from "node:http";
import express from "express";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  productFindMany: vi.fn(),
  productUpdate: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    product: {
      findMany: mocks.productFindMany,
      update: mocks.productUpdate,
      count: vi.fn()
    },
    $transaction: mocks.transaction
  }
}));

vi.mock("../lib/queue", () => ({
  scanQueue: {
    add: vi.fn()
  }
}));

describe("products routes", () => {
  let url = "";
  let server: ReturnType<typeof createServer>;

  beforeAll(async () => {
    const { productsRouter } = await import("./products");
    const app = express();
    app.use(express.json());
    app.use((_request, _response, next) => {
      _request.user = { userId: "test-user", email: "test@example.com" };
      next();
    });
    app.use("/api/products", productsRouter);
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind.");
    url = `http://127.0.0.1:${address.port}`;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  it("rejects bulk ignore without product ids", async () => {
    const response = await fetch(`${url}/api/products/bulk-ignore`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: [] })
    });

    expect(response.status).toBe(400);
    expect(mocks.productFindMany).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("bulk ignores only existing unique products with an audit reason", async () => {
    mocks.productFindMany.mockResolvedValue([{ id: "product-1" }, { id: "product-2" }]);
    mocks.productUpdate.mockResolvedValue({});
    mocks.transaction.mockResolvedValue([]);

    const response = await fetch(`${url}/api/products/bulk-ignore`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: ["product-1", "product-1", "product-2", "missing"], reason: "historical false positive" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { requested: 3, ignored: 2 } });
    expect(mocks.productFindMany).toHaveBeenCalledWith({
      where: { id: { in: ["product-1", "product-2", "missing"] } },
      select: { id: true }
    });
    expect(mocks.productUpdate).toHaveBeenCalledTimes(2);
    expect(mocks.productUpdate).toHaveBeenCalledWith({
      where: { id: "product-1" },
      data: {
        ignored: true,
        ignoredProducts: {
          upsert: {
            where: { productId: "product-1" },
            update: { reason: "historical false positive" },
            create: { reason: "historical false positive" }
          }
        }
      }
    });
    expect(mocks.transaction).toHaveBeenCalledWith([expect.any(Promise), expect.any(Promise)]);
  });
});
