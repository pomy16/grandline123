import { describe, expect, it } from "vitest";
import { formatDuration, formatMoney, truncateMiddle } from "./format";

describe("web smoke utilities", () => {
  it("formats dashboard values without browser APIs", () => {
    expect(formatDuration(1250)).toBe("1.3 s");
    expect(formatMoney("129.99", "EUR")).toBe("129.99 EUR");
    expect(truncateMiddle("abcdefghijklmnopqrstuvwxyz", 11)).toBe("abcd...wxyz");
  });
});
