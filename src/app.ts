import multipart from "@fastify/multipart";
import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import type { AppConfig } from "./config/config.types.js";
import { handleError, handleNotFound } from "./http/error-handler.js";
import { registerReadingRoute } from "./http/reading.route.js";
import type { OcrProvider } from "./ocr/ocr-provider.js";

export async function buildApp(
  config: AppConfig,
  provider: OcrProvider,
  options: FastifyServerOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify(options);
  await app.register(multipart);
  app.setErrorHandler(handleError);
  app.setNotFoundHandler(handleNotFound);
  registerReadingRoute(app, provider, { maxReading: config.maxReading });
  return app;
}
