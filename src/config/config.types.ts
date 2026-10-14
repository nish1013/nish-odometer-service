export interface AppConfig {
  port: number;
  ocrProvider: OcrProviderName;
  openaiApiKey: string | undefined;
  maxReading: number;
}

export type OcrProviderName = "mock" | "openai";
