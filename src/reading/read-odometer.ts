import { measureBlur } from "../image/blur.js";
import type { ImageType } from "../image/image.types.js";
import { detectImageType } from "../image/image-type.js";
import { UnsupportedTypeError } from "../image/unsupported-type-error.js";
import { OcrUnavailableError } from "../ocr/ocr-unavailable-error.js";
import { decide } from "./reading-rules.js";
import type {
  OcrAnswer,
  Reading,
  ReadingFacts,
  ReadingService,
} from "./reading.types.js";
import { UnreadableImageError } from "./unreadable-image-error.js";

export async function readOdometer(
  image: Buffer,
  service: ReadingService,
  facts: ReadingFacts = {},
): Promise<Reading> {
  const imageType = detectImageType(image);
  facts.imageBytes = image.length;
  if (imageType === null) throw new UnsupportedTypeError();
  facts.imageType = imageType;

  const blurScore = await measureBlur(image).catch((error: unknown) => {
    throw new UnreadableImageError({ cause: error });
  });
  facts.blurScore = blurScore;

  const started = performance.now();
  let answer: OcrAnswer;
  try {
    answer = await askProvider(service, image, imageType);
  } finally {
    facts.ocrLatencyMs = Math.round(performance.now() - started);
  }

  const reading = decide(answer, blurScore, service.limits);
  if (reading === null) throw new UnreadableImageError();
  facts.confidence = reading.confidence;
  return reading;
}

async function askProvider(
  { provider, timeoutMs }: ReadingService,
  image: Buffer,
  imageType: ImageType,
): Promise<OcrAnswer> {
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new OcrUnavailableError(`no answer within ${String(timeoutMs)} ms`),
      );
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      provider.read({ image, imageType, signal: controller.signal }),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}
