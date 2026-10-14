import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import { buildApp } from "../../src/app.js";
import type { AppConfig } from "../../src/config/config.types.js";
import { MockProvider } from "../../src/ocr/mock-provider.js";
import type { OcrProvider } from "../../src/ocr/ocr-provider.js";

const CONFIG: AppConfig = {
  port: 0,
  ocrProvider: "mock",
  openaiApiKey: undefined,
  maxReading: 999999.9,
};

const BOUNDARY = "----odometer-test";

export function testApp(
  provider: OcrProvider = new MockProvider(),
): Promise<FastifyInstance> {
  return buildApp(CONFIG, provider);
}

export function postFile(
  app: FastifyInstance,
  field: string,
  file: Buffer,
): Promise<LightMyRequestResponse> {
  const head = Buffer.from(
    `--${BOUNDARY}\r\n` +
      `Content-Disposition: form-data; name="${field}"; filename="photo.jpg"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${BOUNDARY}--\r\n`);
  return app.inject({
    method: "POST",
    url: "/odometer/reading",
    headers: { "content-type": `multipart/form-data; boundary=${BOUNDARY}` },
    payload: Buffer.concat([head, file, tail]),
  });
}
