import type { OcrProvider } from "../../src/ocr/ocr-provider.js";
import type { OcrAnswer } from "../../src/reading/reading.types.js";

export class FakeProvider implements OcrProvider {
  readonly name = "fake";

  constructor(private readonly respond: () => Promise<OcrAnswer>) {}

  read(): Promise<OcrAnswer> {
    return this.respond();
  }
}
