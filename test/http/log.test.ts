import { Writable } from "node:stream";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MockProvider } from "../../src/ocr/mock-provider.js";
import type { OcrProvider } from "../../src/ocr/ocr-provider.js";
import { OpenAiProvider } from "../../src/ocr/openai-provider.js";
import { postFile, testApp } from "../support/http.js";
import { GIF, jpegOfSize } from "../support/files.js";
import { IMG_A } from "../support/samples.js";

let app: FastifyInstance;
let output: string;

afterEach(() => app.close());

async function loggedApp(provider: OcrProvider = new MockProvider()) {
  output = "";
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      output += chunk.toString();
      done();
    },
  });
  app = await testApp(provider, {}, { logger: { stream } });
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

describe("no key in logs", () => {
  it("wrong OpenAI key -> 503, log has no part of the key", async () => {
    const message = "Incorrect API key provided: sk-wrong*************abcd.";
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: {
                message,
                type: "invalid_request_error",
                code: "invalid_api_key",
              },
            }),
            { status: 401, headers: { "content-type": "application/json" } },
          ),
        ),
      ),
    );
    await loggedApp(new OpenAiProvider("sk-wrong1234567890abcd"));

    const res = await postFile(app, "image", IMG_A);
    vi.unstubAllGlobals();

    expect(res.statusCode).toBe(503);
    expect(output).toContain("401 invalid_api_key invalid_request_error");
    expect(output).not.toContain("sk-");
    expect(res.body).not.toContain("sk-");
  });
});
