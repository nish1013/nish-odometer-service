import type {
  Confidence,
  OcrAnswer,
  Reading,
  ReadingLimits,
  Unit,
  UnitShown,
} from "./reading.types.js";

const READING_FORMAT = /^\d+(\.\d)?$/;

export function decide(
  answer: OcrAnswer,
  limits: ReadingLimits,
): Reading | null {
  if (!answer.odometerFound || answer.tripMeterOnly) return null;
  if (!answer.whichNumberClear) return null;

  const reading = parseReading(answer.digits);
  if (reading === null || reading > limits.maxReading) return null;

  return {
    reading,
    unit: toUnit(answer.unitShown),
    confidence: toConfidence(reading, answer.otherPossibleReadings),
  };
}

function parseReading(digits: string): number | null {
  const trimmed = digits.trim();
  if (!READING_FORMAT.test(trimmed)) return null;
  return Number(trimmed);
}

function toUnit(shown: UnitShown): Unit {
  return shown === "none" ? "unknown" : shown;
}

function toConfidence(reading: number, others: string[]): Confidence {
  const doubt = others.some((other) => parseReading(other) !== reading);
  return doubt ? "low" : "high";
}
