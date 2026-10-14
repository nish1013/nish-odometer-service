import type { OcrAnswer, UnitShown } from "../reading/reading.types.js";

export const NO_ODOMETER: OcrAnswer = {
  odometerFound: false,
  whichNumberClear: false,
  digits: "",
  otherPossibleReadings: [],
  unitShown: "none",
  tripMeterOnly: false,
};

export const MOCK_ANSWERS: ReadonlyMap<string, OcrAnswer> = new Map([
  [
    "3a352570450ccea9592eab81bb1fae1b9dc87e7b2f26115aa8a301c8aba69e20",
    answer("62690.5", [], "miles"),
  ],
  [
    "6d5c805d1e71cefe0ef3bc2251a53ad2feecc56bed2f4f4bc64cc3f276b02565",
    answer("15451.0", ["154510"], "miles"),
  ],
  [
    "4e3b869663ab2b0cdf4448d64ce8412cfcc9dc2be5c6665f8c60b745c9dc7a0e",
    answer("205265", [], "none"),
  ],
  [
    "4a793bddd8291b5cf832406f2c48888ca1fcd020f86a6f9e65e9ef2668ba9638",
    answer("161967", [], "none"),
  ],
]);

function answer(
  digits: string,
  otherPossibleReadings: string[],
  unitShown: UnitShown,
): OcrAnswer {
  return {
    odometerFound: true,
    whichNumberClear: true,
    digits,
    otherPossibleReadings,
    unitShown,
    tripMeterOnly: false,
  };
}
