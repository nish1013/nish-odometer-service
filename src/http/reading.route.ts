import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config/config.types.js";
import type { OcrProvider } from "../ocr/ocr-provider.js";
import { readOdometer } from "../reading/read-odometer.js";
import { readImage } from "./image-input.js";

export function registerReadingRoute(
  app: FastifyInstance,
  provider: OcrProvider,
  config: AppConfig,
): void {
  app.post("/odometer/reading", async (request) => {
    const image = await readImage(request, config.maxImageBytes);
    return readOdometer(image, provider, { maxReading: config.maxReading });
  });
}
