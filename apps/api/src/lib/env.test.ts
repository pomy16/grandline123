import { describe, expect, it } from "vitest";
import { readNumber, readUrl, requireProductionSecret } from "./env";

describe("environment validation", () => {
  it("rejects missing production secrets", () => {
    expect(() => requireProductionSecret({ NODE_ENV: "production", JWT_SECRET: "change-me-in-production-and-still-unsafe" }, "JWT_SECRET", ["change-me-in-production-and-still-unsafe"])).toThrow(
      "must be changed"
    );
  });

  it("validates numeric bounds and URLs clearly", () => {
    expect(readNumber({ API_PORT: "4000" }, { key: "API_PORT", defaultValue: 3000, min: 1 })).toBe(4000);
    expect(() => readNumber({ API_PORT: "nope" }, { key: "API_PORT", defaultValue: 3000 })).toThrow("must be a number");
    expect(readUrl({ REDIS_URL: "redis://localhost:6379" }, { key: "REDIS_URL", protocols: ["redis:"] })).toBe("redis://localhost:6379");
    expect(() => readUrl({ REDIS_URL: "http://localhost" }, { key: "REDIS_URL", protocols: ["redis:"] })).toThrow("must use redis:");
  });
});
