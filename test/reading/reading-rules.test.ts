import { describe, expect, it } from "vitest";
import { decide, hasNothingToRead } from "../../src/reading/reading-rules.js";
import type { OcrAnswer } from "../../src/reading/reading.types.js";
import { sureAnswer } from "../support/answers.js";

const LIMITS = { maxReading: 999999.9, blurCutoff: 40 };
const SHARP = 900;

const read = (overrides: Partial<OcrAnswer>) =>
  decide(sureAnswer(overrides), SHARP, LIMITS);

describe("digits", () => {
  it.each([
    ["62690.5", 62690.5, "D8 one decimal kept"],
    ["0", 0, "a new car reads 0"],
    ["999999.9", 999999.9, "at the maximum"],
    ["012345", 12345, "leading zeros are padding"],
  ])("%s -> %s (%s)", (digits, expected) => {
    expect(read({ digits })?.reading).toBe(expected);
  });

  it.each([
    ["62690.55", "C1 more than one decimal"],
    ["-120", "C1 negative"],
    ["1000000", "C1 above the maximum"],
    ["62?90", "C1 a digit cannot be read"],
    ["1545 10", "C1 only digits and one dot"],
    ["", "C1 no digits"],
    [".5", "C1 no whole part"],
  ])("%s -> unreadable (%s)", (digits) => {
    expect(read({ digits })).toBeNull();
  });
});

describe("which number", () => {
  it("C2 trip meter only -> unreadable", () => {
    expect(read({ tripMeterOnly: true })).toBeNull();
  });

  it("S6 no odometer -> unreadable", () => {
    expect(read({ odometerFound: false })).toBeNull();
  });

  it("S6 unclear which number -> unreadable", () => {
    expect(read({ whichNumberClear: false })).toBeNull();
  });
});

describe("unit", () => {
  it.each([
    ["miles", "miles"],
    ["km", "km"],
    ["none", "unknown"],
  ] as const)("S4 shown %s -> %s", (unitShown, unit) => {
    expect(read({ unitShown })?.unit).toBe(unit);
  });
});

describe("confidence", () => {
  it("S5 no other reading -> high", () => {
    expect(read({})?.confidence).toBe("high");
  });

  it("S5 other reading same as digits -> high", () => {
    expect(read({ otherPossibleReadings: ["62690.5"] })?.confidence).toBe(
      "high",
    );
  });

  it("C3 another possible reading -> low", () => {
    const answer = { digits: "15451.0", otherPossibleReadings: ["154510"] };
    expect(read(answer)?.confidence).toBe("low");
  });

  it("C3 blur score below the cut-off, sure AI model -> low", () => {
    expect(decide(sureAnswer(), 39.9, LIMITS)?.confidence).toBe("low");
  });

  it("D11 blur score equal to the cut-off -> not blurred", () => {
    expect(decide(sureAnswer(), 40, LIMITS)?.confidence).toBe("high");
  });

  it("C3 unreadable other reading -> low", () => {
    expect(read({ otherPossibleReadings: ["626?0.5"] })?.confidence).toBe(
      "low",
    );
  });
});

describe("nothing to read", () => {
  it("S6 blur score 0.99 -> nothing to read", () => {
    expect(hasNothingToRead(0.99)).toBe(true);
  });

  it("blur score 1 -> readable", () => {
    expect(hasNothingToRead(1)).toBe(false);
  });
});
