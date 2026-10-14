export interface ErrorBody {
  error: ErrorCode;
  message: string;
}

export type ErrorCode =
  | "INVALID_REQUEST"
  | "MISSING_IMAGE"
  | "NOT_FOUND"
  | "IMAGE_TOO_LARGE"
  | "UNSUPPORTED_TYPE"
  | "UNREADABLE_IMAGE"
  | "INTERNAL_ERROR";
