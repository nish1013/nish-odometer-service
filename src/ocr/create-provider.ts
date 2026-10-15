import type { ProviderConfig } from "../config/config.types.js";
import { MockProvider } from "./mock-provider.js";
import type { OcrProvider } from "../reading/ocr-provider.js";
import { OpenAiProvider } from "./openai-provider.js";

export function createProvider(config: ProviderConfig): OcrProvider {
  switch (config.ocrProvider) {
    case "mock":
      return new MockProvider();
    case "openai":
      return new OpenAiProvider(config.openaiApiKey);
  }
}
