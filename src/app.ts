import multipart from "@fastify/multipart";
import Fastify, {
  LogController,
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import type { AppConfig } from "./config/config.types.js";
import { createErrorHandler, handleNotFound } from "./http/error-handler.js";
import { registerReadingRoute } from "./http/reading.route.js";
import { logRequest } from "./http/request-facts.js";
import type { OcrProvider } from "./reading/ocr-provider.js";

export async function buildApp(
  config: AppConfig,
  provider: OcrProvider,
  options: FastifyServerOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    ...options,
    bodyLimit: config.maxBodyBytes,
    logController: new LogController({
      disableRequestLogging: true,
      requestIdLogLabel: "requestId",
    }),
  });
  await app.register(multipart, {
    limits: { fileSize: config.maxImageBytes },
  });
  app.setErrorHandler(createErrorHandler(config.maxImageBytes));
  app.setNotFoundHandler(handleNotFound);
  app.addHook("onResponse", logRequest(provider));
  app.addHook("onSend", async (_request, reply) => {
    reply.header("x-ocr-provider", `${provider.name}/${provider.model}`);
  });
  registerReadingRoute(
    app,
    {
      provider,
      timeoutMs: config.ocrTimeoutMs,
      limits: { maxReading: config.maxReading, blurCutoff: config.blurCutoff },
    },
    config.maxImageBytes,
  );
  return app;
}
