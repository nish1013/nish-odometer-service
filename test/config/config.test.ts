import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config/config.js";

describe("loadConfig", () => {
  it("S10 OCR_PROVIDER unset -> mock", () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      ocrProvider: "mock",
      openaiApiKey: undefined,
      maxReading: 999999.9,
      maxImageBytes: 10 * 1024 * 1024,
      maxBodyBytes: 14 * 1024 * 1024,
    });
  });

  it("S10 openai, no key -> names OPENAI_API_KEY", () => {
    expect(() => loadConfig({ OCR_PROVIDER: "openai" })).toThrow(
      /OPENAI_API_KEY/,
    );
  });

  it("S10 openai, empty key -> names OPENAI_API_KEY", () => {
    const env = { OCR_PROVIDER: "openai", OPENAI_API_KEY: "" };
    expect(() => loadConfig(env)).toThrow(/OPENAI_API_KEY/);
  });

  it("S10 openai with key -> openai", () => {
    const env = { OCR_PROVIDER: "openai", OPENAI_API_KEY: "sk-test" };
    expect(loadConfig(env).ocrProvider).toBe("openai");
  });

  it.each(["foo", "", "Mock", " mock"])(
    "S10 OCR_PROVIDER %j -> names OCR_PROVIDER",
    (value) => {
      expect(() => loadConfig({ OCR_PROVIDER: value })).toThrow(/OCR_PROVIDER/);
    },
  );

  it.each(["abc", "", "3000.5", "-1", "65536"])(
    "PORT %j -> names PORT",
    (value) => {
      expect(() => loadConfig({ PORT: value })).toThrow(/PORT/);
    },
  );

  it.each(["abc", "", "0", "-5"])(
    "MAX_READING %j -> names MAX_READING",
    (value) => {
      expect(() => loadConfig({ MAX_READING: value })).toThrow(/MAX_READING/);
    },
  );

  it.each(["MAX_IMAGE_MB", "MAX_BODY_MB"])('%s "0" -> names it', (name) => {
    expect(() => loadConfig({ [name]: "0" })).toThrow(name);
  });

  it("S11 MAX_IMAGE_MB=5 -> 5 MB in bytes", () => {
    expect(loadConfig({ MAX_IMAGE_MB: "5" }).maxImageBytes).toBe(
      5 * 1024 * 1024,
    );
  });

  it("reads PORT and MAX_READING", () => {
    const config = loadConfig({ PORT: "8080", MAX_READING: "500000" });
    expect(config).toMatchObject({ port: 8080, maxReading: 500000 });
  });
});
