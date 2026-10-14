export interface ServiceConfig {
  port: number;
  maxReading: number;
  maxImageBytes: number;
  maxBodyBytes: number;
  ocrTimeoutMs: number;
  blurCutoff: number;
}

export interface MockProviderConfig {
  ocrProvider: "mock";
}

export interface OpenAiProviderConfig {
  ocrProvider: "openai";
  openaiApiKey: string;
}

export type ProviderConfig = MockProviderConfig | OpenAiProviderConfig;
export type AppConfig = ServiceConfig & ProviderConfig;
export type OcrProviderName = ProviderConfig["ocrProvider"];
