import { ConfigError } from "../config/config-error.js";
import type { AppConfig } from "../config/config.types.js";
import { MockProvider } from "./mock-provider.js";
import type { OcrProvider } from "./ocr-provider.js";
import { OpenAiProvider } from "./openai-provider.js";

export function createProvider(config: AppConfig): OcrProvider {
  switch (config.ocrProvider) {
    case "mock":
      return new MockProvider();
    case "openai":
      if (!config.openaiApiKey) {
        throw new ConfigError(
          "OPENAI_API_KEY is required when OCR_PROVIDER=openai",
        );
      }
      return new OpenAiProvider(config.openaiApiKey);
  }
}
