import { readFileSync } from "node:fs";
import { loadConfig } from "../src/config/config.js";
import { createProvider } from "../src/ocr/create-provider.js";
import { readOdometer } from "../src/reading/read-odometer.js";
import type { Reading, ReadingService } from "../src/reading/reading.types.js";
import { UnreadableImageError } from "../src/reading/unreadable-image-error.js";
import type { Label, Outcome } from "./harness.types.js";

const root = new URL("../", import.meta.url);
const labels = JSON.parse(
  readFileSync(new URL("harness/labels.json", root), "utf8"),
) as Label[];

const config = loadConfig({ ...process.env, OCR_PROVIDER: "openai" });
const provider = createProvider(config);
const service: ReadingService = {
  provider,
  timeoutMs: config.ocrTimeoutMs,
  limits: { maxReading: config.maxReading, blurCutoff: config.blurCutoff },
};

const outcomes: Outcome[] = [];
for (const label of labels) {
  const image = readFileSync(new URL(label.file, root));
  outcomes.push(judge(label, await read(image)));
}

const count = (key: keyof Outcome) => outcomes.filter((o) => o[key]).length;
const wrongHigh = count("wrongHigh");

console.log(`provider ${provider.name}, model ${provider.model}\n`);
for (const o of outcomes) {
  console.log(
    `${o.wrongHigh ? "WRONG HIGH" : "ok        "}  ${o.label.name}  ${o.result}`,
  );
}
console.log(`
wrong high (blocks release)   ${String(wrongHigh)}
correct reading               ${String(count("readingRight"))} / ${String(count("readingKnown"))}
correct unit                  ${String(count("unitRight"))} / ${String(outcomes.length)}
low where expected            ${String(count("lowAsExpected"))} / ${String(labels.filter((l) => l.confidence === "low").length)}
readable photo rejected       ${String(count("rejected"))}`);

process.exitCode = wrongHigh === 0 ? 0 : 1;

async function read(image: Buffer): Promise<Reading | null> {
  try {
    return await readOdometer(image, service);
  } catch (error) {
    if (error instanceof UnreadableImageError) return null;
    throw error;
  }
}

function judge(label: Label, reading: Reading | null): Outcome {
  if (reading === null) {
    return {
      label,
      result: "422",
      wrongHigh: false,
      readingKnown: label.reading !== null,
      readingRight: false,
      unitRight: false,
      lowAsExpected: false,
      rejected: true,
    };
  }
  const readingKnown = label.reading !== null;
  const readingRight = label.reading === reading.reading;
  const high = reading.confidence === "high";
  return {
    label,
    result: `200 ${String(reading.reading)} ${reading.unit} ${reading.confidence}`,
    wrongHigh:
      high && (label.confidence === "low" || (readingKnown && !readingRight)),
    readingKnown,
    readingRight,
    unitRight: label.unit === reading.unit,
    lowAsExpected: label.confidence === "low" && !high,
    rejected: false,
  };
}
