import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { OcrUnavailableError } from "../../src/reading/ocr-unavailable-error.js";
import type { OcrAnswer } from "../../src/reading/reading.types.js";
import { sureAnswer } from "../support/answers.js";
import { FakeProvider } from "../support/fake-provider.js";
import { BROKEN_JPEG } from "../support/files.js";
import { postFile, testApp } from "../support/http.js";
import { BLANK_WALL, IMG_A, IMG_B } from "../support/samples.js";

let app: FastifyInstance;
let provider: FakeProvider;

afterEach(() => app.close());

async function appWith(
  respond: (call: number) => Promise<OcrAnswer>,
  env: NodeJS.ProcessEnv = {},
) {
  provider = new FakeProvider(respond);
  app = await testApp(provider, env);
}

const sure = () => Promise.resolve(sureAnswer());
const unavailable = () =>
  Promise.reject(new OcrUnavailableError("server error"));
const hang = () => new Promise<OcrAnswer>(() => undefined);

describe("S5 blurred photo", () => {
  it("C3 blurred img-B, sure AI model -> 200 low", async () => {
    await appWith(sure);
    const res = await postFile(app, "image", IMG_B);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ confidence: "low" });
  });

  it("sharp img-A, sure AI model -> high", async () => {
    await appWith(sure);
    expect((await postFile(app, "image", IMG_A)).json()).toMatchObject({
      confidence: "high",
    });
  });

  it("S6 blank photo, AI model sure of a reading -> 422, provider not called", async () => {
    await appWith(sure);
    const res = await postFile(app, "image", BLANK_WALL);
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ error: "UNREADABLE_IMAGE" });
    expect(provider.calls).toBe(0);
  });

  it("C4 JPEG bytes that do not decode -> 422, provider not called", async () => {
    await appWith(sure);
    const res = await postFile(app, "image", BROKEN_JPEG);
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ error: "UNREADABLE_IMAGE" });
    expect(provider.calls).toBe(0);
  });
});

describe("S12 OCR service down", () => {
  it("C4 provider error -> 503", async () => {
    await appWith(unavailable);
    const res = await postFile(app, "image", IMG_A);
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ error: "OCR_UNAVAILABLE" });
  });

  it("C4 no answer within the timeout -> 503, call aborted", async () => {
    await appWith(hang, { OCR_TIMEOUT_MS: "50" });
    const res = await postFile(app, "image", IMG_A);
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ error: "OCR_UNAVAILABLE" });
    expect(provider.lastSignal?.aborted).toBe(true);
  });

  it("provider back -> 200, as in S1", async () => {
    await appWith((call) => (call === 1 ? unavailable() : sure()));
    expect((await postFile(app, "image", IMG_A)).statusCode).toBe(503);
    expect((await postFile(app, "image", IMG_A)).statusCode).toBe(200);
  });
});
