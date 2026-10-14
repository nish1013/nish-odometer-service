import { ConfigError } from "../config/config-error.js";
import type { AppConfig } from "../config/config.types.js";
import { MockProvider } from "./mock-provider.js";
import type { OcrProvider } from "./ocr-provider.js";

export function createProvider(config: AppConfig): OcrProvider {
  switch (config.ocrProvider) {
    case "mock":
      return new MockProvider();
    case "openai":
      throw new ConfigError(
        "OCR_PROVIDER=openai is not supported by this version",
      );
  }
}
