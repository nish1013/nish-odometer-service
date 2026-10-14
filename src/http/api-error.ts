import type { ErrorBody, ErrorCode } from "./http.types.js";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  toBody(): ErrorBody {
    return { error: this.code, message: this.message };
  }
}
