import { afterEach, describe, expect, it, vi } from "vitest";
import { OcrUnavailableError } from "../../src/ocr/ocr-unavailable-error.js";
import { OpenAiProvider } from "../../src/ocr/openai-provider.js";
import { sureAnswer } from "../support/answers.js";
import { IMG_A } from "../support/samples.js";

const request = {
  image: IMG_A,
  imageType: "jpeg" as const,
  signal: new AbortController().signal,
};

function stubFetch(status: number, body: unknown) {
  const fetch = vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function responseWith(content: unknown) {
  return {
    id: "resp_1",
    object: "response",
    created_at: 0,
    status: "completed",
    model: "gpt-4.1-mini",
    output: [
      {
        id: "msg_1",
        type: "message",
        role: "assistant",
        status: "completed",
        content: [content],
      },
    ],
  };
}

const outputText = (text: string) => ({
  type: "output_text",
  text,
  annotations: [],
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OpenAiProvider", () => {
  it("D12 answer in the schema -> OcrAnswer", async () => {
    const fetch = stubFetch(
      200,
      responseWith(outputText(JSON.stringify(sureAnswer()))),
    );
    const answer = await new OpenAiProvider("sk-test").read(request);

    expect(answer).toEqual(sureAnswer());
    const init = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const sent = JSON.parse(init[1].body as string) as Record<string, unknown>;
    expect(sent).toMatchObject({ model: "gpt-4.1-mini", temperature: 0 });
    expect(JSON.stringify(sent)).toContain("data:image/jpeg;base64,");
  });

  it("S12 server error -> OcrUnavailableError, no retry (D13)", async () => {
    const fetch = stubFetch(500, { error: { message: "boom" } });
    await expect(
      new OpenAiProvider("sk-test").read(request),
    ).rejects.toBeInstanceOf(OcrUnavailableError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("S12 refusal -> OcrUnavailableError (D19)", async () => {
    stubFetch(200, responseWith({ type: "refusal", refusal: "I can't help" }));
    await expect(
      new OpenAiProvider("sk-test").read(request),
    ).rejects.toBeInstanceOf(OcrUnavailableError);
  });

  it("S12 answer outside the schema -> OcrUnavailableError (D19)", async () => {
    const broken = { ...sureAnswer(), unitShown: "furlongs" };
    stubFetch(200, responseWith(outputText(JSON.stringify(broken))));
    await expect(
      new OpenAiProvider("sk-test").read(request),
    ).rejects.toBeInstanceOf(OcrUnavailableError);
  });

  it("S12 answer that is not JSON -> OcrUnavailableError (D19)", async () => {
    stubFetch(200, responseWith(outputText("62690.5 miles")));
    await expect(
      new OpenAiProvider("sk-test").read(request),
    ).rejects.toBeInstanceOf(OcrUnavailableError);
  });
});
