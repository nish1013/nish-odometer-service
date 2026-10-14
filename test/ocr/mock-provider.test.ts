import { describe, expect, it } from "vitest";
import { MockProvider } from "../../src/ocr/mock-provider.js";
import { BLANK_WALL, IMG_A, IMG_B, IMG_C, IMG_D } from "../support/samples.js";

const mock = new MockProvider();
const request = (image: Buffer) => ({
  image,
  imageType: "jpeg" as const,
  signal: new AbortController().signal,
});

describe("MockProvider", () => {
  it.each([
    ["img-A", IMG_A, "62690.5"],
    ["img-B", IMG_B, "15451.0"],
    ["img-C", IMG_C, "205265"],
    ["img-D", IMG_D, "161967"],
  ])("D14 %s -> its fixed answer", async (_name, image, digits) => {
    expect((await mock.read(request(image))).digits).toBe(digits);
  });

  it("D14 not a sample -> no odometer", async () => {
    expect((await mock.read(request(BLANK_WALL))).odometerFound).toBe(false);
  });
});
