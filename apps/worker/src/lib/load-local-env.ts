import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

function findEnvFile(start: string) {
  let current = start;
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = join(current, ".env");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

export function loadLocalEnv() {
  if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") return;
  const envFile = findEnvFile(process.cwd());
  if (!envFile) return;

  for (const rawLine of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    const name = key.trim();
    if (!name || process.env[name] !== undefined) continue;
    const value = rest.join("=").trim().replace(/^["']|["']$/g, "");
    process.env[name] = value;
  }
}
