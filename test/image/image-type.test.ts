import { describe, expect, it } from "vitest";
import { detectImageType } from "../../src/image/image-type.js";
import { BLANK_WALL_PNG, IMG_A } from "../support/samples.js";
import { GIF, HEIC, PDF } from "../support/files.js";

describe("detectImageType", () => {
  it("D4 JPEG by first bytes", () => {
    expect(detectImageType(IMG_A)).toBe("jpeg");
  });

  it("D4 PNG by first bytes", () => {
    expect(detectImageType(BLANK_WALL_PNG)).toBe("png");
  });

  it.each([
    ["GIF", GIF],
    ["PDF", PDF],
    ["HEIC", HEIC],
    ["empty", Buffer.alloc(0)],
    ["JPEG cut to 2 bytes", Buffer.from([0xff, 0xd8])],
  ])("D4 %s -> null", (_name, bytes) => {
    expect(detectImageType(bytes)).toBeNull();
  });
});
