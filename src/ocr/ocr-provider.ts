import type { OcrAnswer } from "../reading/reading.types.js";

export interface OcrProvider {
  readonly name: string;
  read(image: Buffer): Promise<OcrAnswer>;
}
