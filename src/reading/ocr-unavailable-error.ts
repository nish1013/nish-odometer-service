export class OcrUnavailableError extends Error {
  constructor(reason: string, options?: ErrorOptions) {
    super(`The OCR provider is unavailable: ${reason}`, options);
    this.name = "OcrUnavailableError";
  }
}
