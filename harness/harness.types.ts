import type { Confidence, Unit } from "../src/reading/reading.types.js";

export interface Label {
  name: string;
  file: string;
  reading: number | null;
  unit: Unit;
  confidence: Confidence;
}

export interface Outcome {
  label: Label;
  result: string;
  wrongHigh: boolean;
  readingKnown: boolean;
  readingRight: boolean;
  unitRight: boolean;
  lowAsExpected: boolean;
  rejected: boolean;
}
