type LogLevel = "debug" | "info" | "warn" | "error";

function serializeError(error: unknown) {
  if (!(error instanceof Error)) return error;
  return {
    name: error.name,
    message: error.message,
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack
  };
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      if (/webhook|token|secret|password|authorization/i.test(key)) return [key, "[REDACTED]"];
      return [key, redact(entry)];
    })
  );
}

export function log(level: LogLevel, message: string, context: Record<string, unknown> = {}) {
  const payload = {
    level,
    message,
    service: "tcg-monitor-api",
    timestamp: new Date().toISOString(),
    ...(redact(context) as Record<string, unknown>)
  };
  const line = JSON.stringify(payload, (_key, value) => (value instanceof Error ? serializeError(value) : value));
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context)
};
