import { ConfigError } from "./config-error.js";
import type { AppConfig, OcrProviderName } from "./config.types.js";

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
    maxReading: parseMaxReading(env.MAX_READING),
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

function parseMaxReading(value: string | undefined): number {
  if (value === undefined) return 999999.9;
  const max = Number(value);
  if (value.trim() === "" || !Number.isFinite(max) || max <= 0) {
    throw new ConfigError(
      `MAX_READING must be a positive number, got "${value}"`,
    );
  }
  return max;
}
