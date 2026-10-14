export class UnsupportedTypeError extends Error {
  constructor() {
    super("The image must be a JPEG or PNG");
    this.name = "UnsupportedTypeError";
  }
}
