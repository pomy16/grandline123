import { describe, expect, it, vi } from "vitest";
import { hashPassword, signSession, verifyPassword, verifySession } from "./auth";

describe("admin auth helpers", () => {
  it("hashes and verifies passwords with scrypt", () => {
    const hash = hashPassword("correct horse battery staple");
    expect(hash).not.toContain("correct horse battery staple");
    expect(verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("signs, verifies, and expires session tokens", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T12:00:00Z"));
    const token = signSession({ userId: "user-1", email: "admin@example.com" }, "secret");
    expect(verifySession(token, "secret", 60)).toEqual({ userId: "user-1", email: "admin@example.com" });
    vi.setSystemTime(new Date("2026-05-04T12:02:00Z"));
    expect(verifySession(token, "secret", 60)).toBeNull();
    vi.useRealTimers();
  });
});
