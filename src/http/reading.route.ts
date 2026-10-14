import type { FastifyInstance } from "fastify";
import type { OcrProvider } from "../ocr/ocr-provider.js";
import { readOdometer } from "../reading/read-odometer.js";
import type { ReadingLimits } from "../reading/reading.types.js";
import { readImage } from "./image-input.js";

export function registerReadingRoute(
  app: FastifyInstance,
  provider: OcrProvider,
  limits: ReadingLimits,
): void {
  app.post("/odometer/reading", async (request) => {
    const image = await readImage(request);
    return readOdometer(image, provider, limits);
  });
}
