import type {
  FastifyInstance,
  FastifyServerOptions,
  LightMyRequestResponse,
} from "fastify";
import { buildApp } from "../../src/app.js";
import { loadConfig } from "../../src/config/config.js";
import { MockProvider } from "../../src/ocr/mock-provider.js";
import type { OcrProvider } from "../../src/ocr/ocr-provider.js";

const BOUNDARY = "----odometer-test";
const URL = "/odometer/reading";

export function testApp(
  provider: OcrProvider = new MockProvider(),
  env: NodeJS.ProcessEnv = {},
  options: FastifyServerOptions = {},
): Promise<FastifyInstance> {
  return buildApp(loadConfig({ PORT: "0", ...env }), provider, options);
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
  return postRaw(
    app,
    `multipart/form-data; boundary=${BOUNDARY}`,
    Buffer.concat([head, file, tail]),
  );
}

export function postJson(
  app: FastifyInstance,
  body: unknown,
): Promise<LightMyRequestResponse> {
  return postRaw(app, "application/json", JSON.stringify(body));
}

export function postRaw(
  app: FastifyInstance,
  contentType: string,
  payload: string | Buffer,
): Promise<LightMyRequestResponse> {
  return app.inject({
    method: "POST",
    url: URL,
    headers: { "content-type": contentType },
    payload,
  });
}
