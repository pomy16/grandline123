import { describe, expect, it } from "vitest";
import { CZ_STORE_PRESETS, buildStorePresetNotes, resolvePresetWebhookId } from "./cz-store-presets";

describe("Czech store presets", () => {
  it("defines one idempotent preset per requested Czech store", () => {
    expect(CZ_STORE_PRESETS.map((preset) => preset.slug)).toEqual([
      "cz-alza",
      "cz-dracik",
      "cz-smarty",
      "cz-pompo",
      "cz-cardstore",
      "cz-luxor",
      "cz-tolarie",
      "cz-knihy-dobrovsky"
    ]);
    expect(new Set(CZ_STORE_PRESETS.map((preset) => preset.id)).size).toBe(CZ_STORE_PRESETS.length);
  });

  it("keeps all real store presets paused and safely spaced by default", () => {
    expect(CZ_STORE_PRESETS.every((preset) => preset.active === false)).toBe(true);
    expect(CZ_STORE_PRESETS.every((preset) => preset.currency === "CZK" && preset.country === "CZ" && preset.language === "cs")).toBe(true);
    expect(CZ_STORE_PRESETS.every((preset) => preset.pollingIntervalSeconds >= 60 && preset.pollingIntervalSeconds !== 3600)).toBe(true);
  });

  it("uses the requested polling intervals", () => {
    expect(Object.fromEntries(CZ_STORE_PRESETS.map((preset) => [preset.slug, preset.pollingIntervalSeconds]))).toEqual({
      "cz-alza": 300,
      "cz-dracik": 180,
      "cz-smarty": 180,
      "cz-pompo": 300,
      "cz-cardstore": 180,
      "cz-luxor": 180,
      "cz-tolarie": 180,
      "cz-knihy-dobrovsky": 300
    });
  });

  it("does not contain Discord webhook URLs or secrets", () => {
    expect(JSON.stringify(CZ_STORE_PRESETS)).not.toMatch(/discord(?:app)?\.com\/api\/webhooks/i);
  });

  it("assigns store webhooks by webhook record name", () => {
    const preset = CZ_STORE_PRESETS.find((candidate) => candidate.slug === "cz-alza");
    expect(preset).toBeDefined();

    const assignedId = resolvePresetWebhookId(preset!, new Map([["cz-alza", "existing-webhook-id"]]));
    expect(assignedId).toBe("existing-webhook-id");
    expect(resolvePresetWebhookId(preset!, new Map())).toBeNull();
  });

  it("documents missing webhook records in notes", () => {
    const preset = CZ_STORE_PRESETS[0];
    expect(buildStorePresetNotes(preset, false)).toContain(`No Discord webhook record named ${preset.webhookName}`);
    expect(buildStorePresetNotes(preset, true)).toContain(`Store-specific Discord route: ${preset.webhookName}`);
  });
});
