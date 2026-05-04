type EnvSource = Record<string, string | undefined>;

function isProduction(source: EnvSource) {
  return source.NODE_ENV === "production";
}

export function readRequiredString(source: EnvSource, key: string, options: { productionOnly?: boolean } = {}) {
  const value = source[key]?.trim();
  const required = !options.productionOnly || isProduction(source);
  if (!value && required) throw new Error(`Missing required environment variable ${key}.`);
  return value ?? "";
}

export function readNumber(source: EnvSource, key: string, defaultValue: number, options: { min?: number; max?: number } = {}) {
  const raw = source[key];
  const value = raw === undefined || raw === "" ? defaultValue : Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Environment variable ${key} must be a number.`);
  if (options.min !== undefined && value < options.min) throw new Error(`Environment variable ${key} must be at least ${options.min}.`);
  if (options.max !== undefined && value > options.max) throw new Error(`Environment variable ${key} must be at most ${options.max}.`);
  return value;
}

export function readUrl(source: EnvSource, key: string, defaultValue: string, protocols: string[]) {
  const raw = source[key]?.trim() || defaultValue;
  if (!raw) {
    if (isProduction(source)) throw new Error(`Missing required environment variable ${key}.`);
    return "";
  }
  try {
    const parsed = new URL(raw);
    if (!protocols.includes(parsed.protocol)) throw new Error(`Environment variable ${key} must use ${protocols.join(" or ")}.`);
    return parsed.toString();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Environment variable")) throw error;
    throw new Error(`Environment variable ${key} must be a valid URL.`);
  }
}
