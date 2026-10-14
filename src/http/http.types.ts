import type { ReadingFacts } from "../reading/reading.types.js";

export interface ErrorBody {
  error: ErrorCode;
  message: string;
}

export interface RequestFacts extends ReadingFacts {
  errorCode?: ErrorCode;
}

export type ErrorCode =
  | "INVALID_REQUEST"
  | "MISSING_IMAGE"
  | "NOT_FOUND"
  | "IMAGE_TOO_LARGE"
  | "UNSUPPORTED_TYPE"
  | "UNREADABLE_IMAGE"
  | "OCR_UNAVAILABLE"
  | "INTERNAL_ERROR";
