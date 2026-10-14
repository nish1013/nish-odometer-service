import { Writable } from "node:stream";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { MockProvider } from "../../src/ocr/mock-provider.js";
import { postFile, testApp } from "../support/http.js";
import { GIF, jpegOfSize } from "../support/files.js";
import { IMG_A } from "../support/samples.js";

let app: FastifyInstance;
let output: string;

afterEach(() => app.close());

async function loggedApp() {
  output = "";
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      output += chunk.toString();
      done();
    },
  });
  app = await testApp(new MockProvider(), {}, { logger: { stream } });
}

function requestLines(): Record<string, unknown>[] {
  return output
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .filter((line) => line.msg === "request done");
}

describe("D16 log line", () => {
  it("C5 img-A -> one line of request facts, no reading", async () => {
    await loggedApp();
    await postFile(app, "image", IMG_A);

    const lines = requestLines();
    expect(lines).toHaveLength(1);
    expect(Object.keys(lines[0] ?? {})).toEqual(
      expect.arrayContaining(["requestId", "blurScore", "ocrLatencyMs"]),
    );
    expect(lines[0]).toMatchObject({
      status: 200,
      confidence: "high",
      provider: "mock",
      model: "fixtures",
      imageType: "jpeg",
      imageBytes: IMG_A.length,
    });
    expect(output).not.toContain("62690.5");
  });

  it("415 -> error code, no OCR fields", async () => {
    await loggedApp();
    await postFile(app, "image", GIF);
    expect(requestLines()[0]).toMatchObject({
      status: 415,
      errorCode: "UNSUPPORTED_TYPE",
    });
    expect(requestLines()[0]).not.toHaveProperty("ocrLatencyMs");
  });

  it("422 -> error code and the facts gathered", async () => {
    await loggedApp();
    await postFile(app, "image", jpegOfSize(2000));
    expect(requestLines()[0]).toMatchObject({
      status: 422,
      errorCode: "UNREADABLE_IMAGE",
      blurScore: 0,
    });
  });
});
