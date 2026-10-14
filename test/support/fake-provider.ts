import type { OcrProvider } from "../../src/ocr/ocr-provider.js";
import type { OcrAnswer } from "../../src/reading/reading.types.js";

export class FakeProvider implements OcrProvider {
  readonly name = "fake";
  calls = 0;

  constructor(private readonly respond: () => Promise<OcrAnswer>) {}

  read(): Promise<OcrAnswer> {
    this.calls++;
    return this.respond();
  }
}
