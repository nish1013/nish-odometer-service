import type { OcrAnswer } from "../../src/reading/reading.types.js";

export function sureAnswer(overrides: Partial<OcrAnswer> = {}): OcrAnswer {
  return {
    odometerFound: true,
    whichNumberClear: true,
    digits: "62690.5",
    otherPossibleReadings: [],
    unitShown: "miles",
    tripMeterOnly: false,
    ...overrides,
  };
}
