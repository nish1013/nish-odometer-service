import { ConfigError } from "./config-error.js";
import type { AppConfig, OcrProviderName } from "./config.types.js";

const MEGABYTE = 1024 * 1024;
const PROVIDERS: readonly OcrProviderName[] = ["mock", "openai"];

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const ocrProvider = parseProvider(env.OCR_PROVIDER);
  const openaiApiKey = env.OPENAI_API_KEY;
  if (ocrProvider === "openai" && !openaiApiKey) {
    throw new ConfigError(
      "OPENAI_API_KEY is required when OCR_PROVIDER=openai",
    );
  }

  return {
    port: parsePort(env.PORT),
    ocrProvider,
    openaiApiKey,
    maxReading: parsePositive("MAX_READING", env.MAX_READING, 999999.9),
    maxImageBytes: toBytes(parsePositive("MAX_IMAGE_MB", env.MAX_IMAGE_MB, 10)),
    maxBodyBytes: toBytes(parsePositive("MAX_BODY_MB", env.MAX_BODY_MB, 14)),
  };
}

function parseProvider(value: string | undefined): OcrProviderName {
  if (value === undefined) return "mock";
  const provider = PROVIDERS.find((name) => name === value);
  if (!provider) {
    throw new ConfigError(
      `OCR_PROVIDER must be one of ${PROVIDERS.join(", ")}, got "${value}"`,
    );
  }
  return provider;
}

function parsePort(value: string | undefined): number {
  if (value === undefined) return 3000;
  const port = Number(value);
  if (!/^\d+$/.test(value) || port > 65535) {
    throw new ConfigError(
      `PORT must be a whole number 0-65535, got "${value}"`,
    );
  }
  return port;
}

function parsePositive(
  name: string,
  value: string | undefined,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (value.trim() === "" || !Number.isFinite(number) || number <= 0) {
    throw new ConfigError(`${name} must be a positive number, got "${value}"`);
  }
  return number;
}

function toBytes(megabytes: number): number {
  return Math.floor(megabytes * MEGABYTE);
}
