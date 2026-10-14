import type { FastifyInstance } from "fastify";
import { readOdometer } from "../reading/read-odometer.js";
import type { ReadingService } from "../reading/reading.types.js";
import { readImage } from "./image-input.js";

export function registerReadingRoute(
  app: FastifyInstance,
  service: ReadingService,
  maxImageBytes: number,
): void {
  app.post("/odometer/reading", async (request) => {
    const image = await readImage(request, maxImageBytes);
    return readOdometer(image, service);
  });
}
