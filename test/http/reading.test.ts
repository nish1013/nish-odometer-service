import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { sureAnswer } from "../support/answers.js";
import { FakeProvider } from "../support/fake-provider.js";
import { postFile, testApp } from "../support/http.js";
import { BLANK_WALL, IMG_A, IMG_B, IMG_C, IMG_D } from "../support/samples.js";

let app: FastifyInstance;

afterEach(() => app.close());

async function readWithMock(image: Buffer) {
  app = await testApp();
  return postFile(app, "image", image);
}

async function readWithAnswer(answer: Parameters<typeof sureAnswer>[0]) {
  app = await testApp(
    new FakeProvider(() => Promise.resolve(sureAnswer(answer))),
  );
  return postFile(app, "image", IMG_A);
}

describe("S1 read an uploaded photo", () => {
  it("img-A -> 62690.5 miles high", async () => {
    const res = await readWithMock(IMG_A);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      reading: 62690.5,
      unit: "miles",
      confidence: "high",
    });
  });

  it("img-D -> 161967", async () => {
    const res = await readWithMock(IMG_D);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ reading: 161967 });
  });
});

describe("S3 ignore other numbers", () => {
  it("img-A -> never the range 111", async () => {
    expect((await readWithMock(IMG_A)).json()).toMatchObject({
      reading: 62690.5,
    });
  });

  it("img-B -> never the range 104", async () => {
    expect((await readWithMock(IMG_B)).json()).not.toMatchObject({
      reading: 104,
    });
  });

  it("img-C -> 205265, not a dial mark", async () => {
    expect((await readWithMock(IMG_C)).json()).toMatchObject({
      reading: 205265,
    });
  });

  it("img-D -> never the clock 831", async () => {
    expect((await readWithMock(IMG_D)).json()).toMatchObject({
      reading: 161967,
    });
  });

  it("trip meter only -> 422", async () => {
    const res = await readWithAnswer({ digits: "831.4", tripMeterOnly: true });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ error: "UNREADABLE_IMAGE" });
  });
});

describe("S4 report the unit", () => {
  it.each([
    ["img-A shows mi", IMG_A, "miles"],
    ["img-B shows miles", IMG_B, "miles"],
    ["img-D shows none", IMG_D, "unknown"],
    ["img-C, unit only on the dial", IMG_C, "unknown"],
  ])("%s -> %s", async (_name, image, unit) => {
    expect((await readWithMock(image)).json()).toMatchObject({ unit });
  });

  it("odometer shows km -> km", async () => {
    expect((await readWithAnswer({ unitShown: "km" })).json()).toMatchObject({
      unit: "km",
    });
  });
});

describe("S5 flag an unsure reading", () => {
  it("img-A -> high", async () => {
    expect((await readWithMock(IMG_A)).json()).toMatchObject({
      confidence: "high",
    });
  });

  it("img-B, another possible reading -> 200 low", async () => {
    const res = await readWithMock(IMG_B);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ confidence: "low" });
  });
});

describe("S6 clear error when no mileage is found", () => {
  it("blank wall -> 422", async () => {
    const res = await readWithMock(BLANK_WALL);
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({
      error: "UNREADABLE_IMAGE",
      message: "Could not extract a mileage reading from the provided image",
    });
  });

  it("unclear which number -> 422, no guess", async () => {
    const res = await readWithAnswer({ whichNumberClear: false });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ error: "UNREADABLE_IMAGE" });
  });

  it("C1 a digit cannot be read -> 422", async () => {
    const res = await readWithAnswer({ digits: "62?90" });
    expect(res.statusCode).toBe(422);
  });
});

describe("S7 no image sent", () => {
  it("multipart with no image field -> 400", async () => {
    app = await testApp();
    const res = await postFile(app, "photo", IMG_A);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "MISSING_IMAGE" });
  });

  it("empty image field -> 400", async () => {
    app = await testApp();
    const res = await postFile(app, "image", Buffer.alloc(0));
    expect(res.json()).toMatchObject({ error: "MISSING_IMAGE" });
  });
});

describe("D19 every error is JSON", () => {
  it("every response names the provider", async () => {
    app = await testApp();
    const res = await app.inject({ method: "GET", url: "/nope" });
    expect(res.headers["x-ocr-provider"]).toBe("mock/fixtures");
  });

  it("GET /nope -> 404", async () => {
    app = await testApp();
    const res = await app.inject({ method: "GET", url: "/nope" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({
      error: "NOT_FOUND",
      message: "No route for GET /nope",
    });
  });

  it("crash -> 500, no stack in the body", async () => {
    app = await testApp(
      new FakeProvider(() => Promise.reject(new Error("secret detail"))),
    );
    const res = await postFile(app, "image", IMG_A);
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({
      error: "INTERNAL_ERROR",
      message: "Unexpected error",
    });
    expect(res.body).not.toContain("secret detail");
  });
});
