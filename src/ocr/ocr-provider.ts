import type { ImageType } from "../image/image.types.js";
import type { OcrAnswer } from "../reading/reading.types.js";

export interface OcrProvider {
  readonly name: string;
  readonly model: string;
  read(request: OcrRequest): Promise<OcrAnswer>;
}

export interface OcrRequest {
  image: Buffer;
  imageType: ImageType;
  signal: AbortSignal;
}
