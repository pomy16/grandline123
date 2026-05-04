type EnvSource = Record<string, string | undefined>;

type NumberRule = {
  key: string;
  defaultValue: number;
  min?: number;
  max?: number;
};

type UrlRule = {
  key: string;
  defaultValue?: string;
  required?: boolean;
  protocols?: string[];
};

function isProduction(source: EnvSource) {
  return source.NODE_ENV === "production";
}

export function readRequiredString(source: EnvSource, key: string, options: { minLength?: number; productionOnly?: boolean } = {}) {
  const value = source[key]?.trim();
  const required = !options.productionOnly || isProduction(source);
  if (!value && required) {
    throw new Error(`Missing required environment variable ${key}.`);
  }
  if (value && options.minLength && value.length < options.minLength) {
    throw new Error(`Environment variable ${key} must be at least ${options.minLength} characters.`);
  }
  return value ?? "";
}

export function readNumber(source: EnvSource, rule: NumberRule) {
  const raw = source[rule.key];
  const value = raw === undefined || raw === "" ? rule.defaultValue : Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Environment variable ${rule.key} must be a number.`);
  if (rule.min !== undefined && value < rule.min) throw new Error(`Environment variable ${rule.key} must be at least ${rule.min}.`);
  if (rule.max !== undefined && value > rule.max) throw new Error(`Environment variable ${rule.key} must be at most ${rule.max}.`);
  return value;
}

export function readUrl(source: EnvSource, rule: UrlRule) {
  const raw = source[rule.key]?.trim() || rule.defaultValue || "";
  if (!raw) {
    if (rule.required || isProduction(source)) throw new Error(`Missing required environment variable ${rule.key}.`);
    return "";
  }
  try {
    const parsed = new URL(raw);
    if (rule.protocols && !rule.protocols.includes(parsed.protocol)) {
      throw new Error(`Environment variable ${rule.key} must use ${rule.protocols.join(" or ")}.`);
    }
    return parsed.toString();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Environment variable")) throw error;
    throw new Error(`Environment variable ${rule.key} must be a valid URL.`);
  }
}

export function requireProductionSecret(source: EnvSource, key: string, unsafeDefaults: string[]) {
  const value = readRequiredString(source, key, { minLength: isProduction(source) ? 32 : 1 });
  if (isProduction(source) && unsafeDefaults.includes(value)) {
    throw new Error(`Environment variable ${key} must be changed from the development default in production.`);
  }
  return value;
}
