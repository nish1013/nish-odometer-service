export interface ErrorBody {
  error: ErrorCode;
  message: string;
}

export type ErrorCode =
  | "INVALID_REQUEST"
  | "MISSING_IMAGE"
  | "NOT_FOUND"
  | "UNREADABLE_IMAGE"
  | "INTERNAL_ERROR";
