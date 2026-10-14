import type { ImageType } from "../image/image.types.js";
import type { OcrProvider } from "../ocr/ocr-provider.js";

export interface OcrAnswer {
  odometerFound: boolean;
  whichNumberClear: boolean;
  digits: string;
  otherPossibleReadings: string[];
  unitShown: UnitShown;
  tripMeterOnly: boolean;
}

export interface Reading {
  reading: number;
  unit: Unit;
  confidence: Confidence;
}

export interface ReadingLimits {
  maxReading: number;
  blurCutoff: number;
}

export interface ReadingService {
  provider: OcrProvider;
  limits: ReadingLimits;
  timeoutMs: number;
}

export interface ReadingFacts {
  imageType?: ImageType;
  imageBytes?: number;
  blurScore?: number;
  ocrLatencyMs?: number;
  confidence?: Confidence;
}

export type UnitShown = "miles" | "km" | "none";
export type Unit = "miles" | "km" | "unknown";
export type Confidence = "low" | "high";
