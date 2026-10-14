import multipart from "@fastify/multipart";
import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import type { AppConfig } from "./config/config.types.js";
import { createErrorHandler, handleNotFound } from "./http/error-handler.js";
import { registerReadingRoute } from "./http/reading.route.js";
import type { OcrProvider } from "./ocr/ocr-provider.js";

export async function buildApp(
  config: AppConfig,
  provider: OcrProvider,
  options: FastifyServerOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({ ...options, bodyLimit: config.maxBodyBytes });
  await app.register(multipart, {
    limits: { fileSize: config.maxImageBytes },
  });
  app.setErrorHandler(createErrorHandler(config.maxImageBytes));
  app.setNotFoundHandler(handleNotFound);
  registerReadingRoute(app, provider, config);
  return app;
}
