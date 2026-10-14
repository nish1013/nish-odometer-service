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
}

export type UnitShown = "miles" | "km" | "none";
export type Unit = "miles" | "km" | "unknown";
export type Confidence = "low" | "high";
