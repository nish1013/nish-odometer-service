import { createHash } from "node:crypto";
import type { OcrAnswer } from "../reading/reading.types.js";
import { MOCK_ANSWERS, NO_ODOMETER } from "./mock-fixtures.js";
import type { OcrProvider, OcrRequest } from "./ocr-provider.js";

export class MockProvider implements OcrProvider {
  readonly name = "mock";
  readonly model = "fixtures";

  read({ image }: OcrRequest): Promise<OcrAnswer> {
    const hash = createHash("sha256").update(image).digest("hex");
    return Promise.resolve(MOCK_ANSWERS.get(hash) ?? NO_ODOMETER);
  }
}
