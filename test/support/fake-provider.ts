import type { OcrProvider, OcrRequest } from "../../src/ocr/ocr-provider.js";
import type { OcrAnswer } from "../../src/reading/reading.types.js";

export class FakeProvider implements OcrProvider {
  readonly name = "fake";
  readonly model = "fake-model";
  calls = 0;
  lastSignal: AbortSignal | undefined;

  constructor(private readonly respond: (call: number) => Promise<OcrAnswer>) {}

  read({ signal }: OcrRequest): Promise<OcrAnswer> {
    this.calls++;
    this.lastSignal = signal;
    return this.respond(this.calls);
  }
}
