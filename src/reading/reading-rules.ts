import type {
  Confidence,
  OcrAnswer,
  Reading,
  ReadingLimits,
  Unit,
  UnitShown,
} from "./reading.types.js";

const READING_FORMAT = /^\d+(\.\d)?$/;
const NOTHING_TO_READ_BELOW = 1;

// The AI model reads digits into a blank image, so a photo with no detail is refused before it is asked.
export function hasNothingToRead(blurScore: number): boolean {
  return blurScore < NOTHING_TO_READ_BELOW;
}

export function decide(
  answer: OcrAnswer,
  blurScore: number,
  limits: ReadingLimits,
): Reading | null {
  if (!answer.odometerFound || answer.tripMeterOnly) return null;
  if (!answer.whichNumberClear) return null;

  const reading = parseReading(answer.digits);
  if (reading === null || reading > limits.maxReading) return null;

  return {
    reading,
    unit: toUnit(answer.unitShown),
    confidence: toConfidence(
      reading,
      answer.otherPossibleReadings,
      blurScore < limits.blurCutoff,
    ),
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

function toConfidence(
  reading: number,
  others: string[],
  blurred: boolean,
): Confidence {
  if (blurred) return "low";
  const doubt = others.some((other) => parseReading(other) !== reading);
  return doubt ? "low" : "high";
}
