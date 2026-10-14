import type { OcrProvider } from "../ocr/ocr-provider.js";
import { decide } from "./reading-rules.js";
import type { Reading, ReadingLimits } from "./reading.types.js";
import { UnreadableImageError } from "./unreadable-image-error.js";

export async function readOdometer(
  image: Buffer,
  provider: OcrProvider,
  limits: ReadingLimits,
): Promise<Reading> {
  const answer = await provider.read(image);
  const reading = decide(answer, limits);
  if (reading === null) throw new UnreadableImageError();
  return reading;
}
