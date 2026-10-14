export interface AppConfig {
  port: number;
  ocrProvider: OcrProviderName;
  openaiApiKey: string | undefined;
  maxReading: number;
  maxImageBytes: number;
  maxBodyBytes: number;
  ocrTimeoutMs: number;
  blurCutoff: number;
}

export type OcrProviderName = "mock" | "openai";
