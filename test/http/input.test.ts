import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { sureAnswer } from "../support/answers.js";
import { FakeProvider } from "../support/fake-provider.js";
import { GIF, HEIC, PDF, jpegOfSize } from "../support/files.js";
import { postFile, postJson, postRaw, testApp } from "../support/http.js";
import { BLANK_WALL_PNG, IMG_A } from "../support/samples.js";

const MB = 1024 * 1024;
const IMG_A_BODY = { reading: 62690.5, unit: "miles", confidence: "high" };

let app: FastifyInstance;
let provider: FakeProvider;

afterEach(() => app.close());

async function spyApp(env: NodeJS.ProcessEnv = {}) {
  provider = new FakeProvider(() => Promise.resolve(sureAnswer()));
  app = await testApp(provider, env);
  return app;
}

describe("S2 Base64 image", () => {
  it("img-A as Base64 -> same as S1", async () => {
    app = await testApp();
    const res = await postJson(app, { image: IMG_A.toString("base64") });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(IMG_A_BODY);
  });

  it("img-A with data:image/jpeg;base64, prefix -> same as S1", async () => {
    app = await testApp();
    const image = `data:image/jpeg;base64,${IMG_A.toString("base64")}`;
    expect((await postJson(app, { image })).json()).toEqual(IMG_A_BODY);
  });

  it("img-A Base64 with line breaks -> same as S1", async () => {
    app = await testApp();
    const image = IMG_A.toString("base64").replace(/.{76}/g, "$&\n");
    expect((await postJson(app, { image })).json()).toEqual(IMG_A_BODY);
  });
});

describe("S7 no image sent", () => {
  it.each([
    ["{}", {}],
    ['{"image":""}', { image: "" }],
    ['{"image":null}', { image: null }],
    ["prefix only", { image: "data:image/jpeg;base64," }],
  ])("JSON %s -> 400 MISSING_IMAGE", async (_name, body) => {
    await spyApp();
    const res = await postJson(app, body);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "MISSING_IMAGE" });
    expect(provider.calls).toBe(0);
  });
});

describe("S8 file type", () => {
  it.each([
    ["GIF", GIF],
    ["PDF", PDF],
    ["HEIC from an iPhone", HEIC],
  ])("C4 %s, named photo.jpg as image/jpeg -> 415", async (_name, file) => {
    await spyApp();
    const res = await postFile(app, "image", file);
    expect(res.statusCode).toBe(415);
    expect(res.json()).toMatchObject({ error: "UNSUPPORTED_TYPE" });
    expect(provider.calls).toBe(0);
  });

  it("C4 GIF as Base64 -> 415", async () => {
    await spyApp();
    const res = await postJson(app, { image: GIF.toString("base64") });
    expect(res.statusCode).toBe(415);
  });

  it("PNG sent as image/jpeg -> 200", async () => {
    await spyApp();
    const res = await postFile(app, "image", BLANK_WALL_PNG);
    expect(res.statusCode).toBe(200);
    expect(provider.calls).toBe(1);
  });
});

describe("S9 malformed request", () => {
  it.each([
    ["not Base64", '{"image": "%%%not-base64"}'],
    ["cut off", '{"image": '],
    ["empty body", ""],
    ["image is a number", '{"image": 123}'],
    ["array body", "[]"],
  ])("JSON %s -> 400 INVALID_REQUEST", async (_name, body) => {
    await spyApp();
    const res = await postRaw(app, "application/json", body);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "INVALID_REQUEST" });
    expect(provider.calls).toBe(0);
  });

  it("D18 raw JPEG body as image/jpeg -> 400 INVALID_REQUEST", async () => {
    await spyApp();
    const res = await postRaw(app, "image/jpeg", IMG_A);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "INVALID_REQUEST" });
  });

  it("D18 text body -> 400 INVALID_REQUEST", async () => {
    await spyApp();
    const res = await postRaw(app, "text/plain", "hello");
    expect(res.json()).toMatchObject({ error: "INVALID_REQUEST" });
  });
});

describe("S11 image too large", () => {
  it("C4 default 10 MB, 12 MB upload -> 413, provider not called", async () => {
    await spyApp();
    const res = await postFile(app, "image", jpegOfSize(12 * MB));
    expect(res.statusCode).toBe(413);
    expect(res.json()).toEqual({
      error: "IMAGE_TOO_LARGE",
      message: "The image is larger than 10 MB",
    });
    expect(provider.calls).toBe(0);
  });

  it("default 10 MB, 4 MB upload -> not rejected for size", async () => {
    await spyApp();
    expect((await postFile(app, "image", jpegOfSize(4 * MB))).statusCode).toBe(
      200,
    );
  });

  it("C4 limit 5 MB, 6 MB upload -> 413", async () => {
    await spyApp({ MAX_IMAGE_MB: "5" });
    expect((await postFile(app, "image", jpegOfSize(6 * MB))).statusCode).toBe(
      413,
    );
  });

  it("limit 1 MB: exactly 1 MB passes, 1 byte more -> 413", async () => {
    await spyApp({ MAX_IMAGE_MB: "1" });
    expect((await postFile(app, "image", jpegOfSize(MB))).statusCode).toBe(200);
    expect((await postFile(app, "image", jpegOfSize(MB + 1))).statusCode).toBe(
      413,
    );
  });

  it("C4 limit 1 MB, Base64 of 1 MB + 1 byte -> 413, provider not called", async () => {
    await spyApp({ MAX_IMAGE_MB: "1" });
    const res = await postJson(app, {
      image: jpegOfSize(MB + 1).toString("base64"),
    });
    expect(res.statusCode).toBe(413);
    expect(res.json()).toMatchObject({ error: "IMAGE_TOO_LARGE" });
    expect(provider.calls).toBe(0);
  });

  it("C4 JSON body over 14 MB -> 413", async () => {
    await spyApp();
    const res = await postJson(app, {
      image: jpegOfSize(12 * MB).toString("base64"),
    });
    expect(res.statusCode).toBe(413);
    expect(res.json()).toMatchObject({ error: "IMAGE_TOO_LARGE" });
  });
});
