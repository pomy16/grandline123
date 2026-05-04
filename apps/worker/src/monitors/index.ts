import type { MonitorMode, StoreMonitor } from "@tcg-monitor/shared";
import { MockMonitor } from "./mock-monitor";

class NotImplementedMonitor implements StoreMonitor {
  constructor(private readonly mode: MonitorMode) {}

  async scan() {
    throw new Error(`${this.mode} monitor is planned for Phase 4. Phase 1 only enables MOCK scans.`);
  }
}

export function createMonitor(mode: MonitorMode): StoreMonitor {
  if (mode === "MOCK") return new MockMonitor();
  return new NotImplementedMonitor(mode);
}
