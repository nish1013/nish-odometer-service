import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { OcrAnswer } from "../reading/reading.types.js";
import { OCR_ANSWER_SCHEMA } from "./ocr-answer.schema.js";
import type { OcrProvider, OcrRequest } from "../reading/ocr-provider.js";
import { OcrUnavailableError } from "../reading/ocr-unavailable-error.js";
import { OPENAI_PROMPT } from "./openai-prompt.js";

const MODEL = "gpt-4.1-mini";

export class OpenAiProvider implements OcrProvider {
  readonly name = "openai";
  readonly model = MODEL;
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey, maxRetries: 0 });
  }

  async read({ image, imageType, signal }: OcrRequest): Promise<OcrAnswer> {
    const response = await this.client.responses
      .parse(
        {
          model: MODEL,
          temperature: 0,
          instructions: OPENAI_PROMPT,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_image",
                  image_url: `data:image/${imageType};base64,${image.toString("base64")}`,
                  detail: "high",
                },
              ],
            },
          ],
          text: { format: zodTextFormat(OCR_ANSWER_SCHEMA, "odometer_answer") },
        },
        { signal },
      )
      .catch((error: unknown) => {
        throw new OcrUnavailableError(`request failed, ${describe(error)}`);
      });

    if (!response.output_parsed)
      throw new OcrUnavailableError("no answer, or a refusal");
    return response.output_parsed;
  }
}

// OpenAI's error messages can echo part of the API key, so only the status, code and type are kept.
function describe(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    return [error.status, error.code, error.type].filter(Boolean).join(" ");
  }
  return error instanceof Error ? error.name : "unknown error";
}
