import type { FastifyReply, FastifyRequest } from "fastify";
import { UnsupportedTypeError } from "../image/unsupported-type-error.js";
import { UnreadableImageError } from "../reading/unreadable-image-error.js";
import { ApiError } from "./api-error.js";
import { imageTooLarge } from "./image-input.js";

type ErrorHandler = (
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
) => FastifyReply;

const TOO_LARGE_CODES = new Set([
  "FST_ERR_CTP_BODY_TOO_LARGE",
  "FST_REQ_FILE_TOO_LARGE",
]);

export function createErrorHandler(maxImageBytes: number): ErrorHandler {
  return (error, request, reply) => {
    const apiError = toApiError(error, maxImageBytes);
    if (apiError.status >= 500)
      request.log.error({ err: error }, "request failed");
    return reply.status(apiError.status).send(apiError.toBody());
  };
}

export function handleNotFound(
  request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  const error = new ApiError(
    404,
    "NOT_FOUND",
    `No route for ${request.method} ${request.url}`,
  );
  return reply.status(error.status).send(error.toBody());
}

function toApiError(error: unknown, maxImageBytes: number): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof UnsupportedTypeError) {
    return new ApiError(415, "UNSUPPORTED_TYPE", error.message);
  }
  if (error instanceof UnreadableImageError) {
    return new ApiError(422, "UNREADABLE_IMAGE", error.message);
  }
  if (isFrameworkError(error)) {
    if (TOO_LARGE_CODES.has(error.code ?? ""))
      return imageTooLarge(maxImageBytes);
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return new ApiError(
        400,
        "INVALID_REQUEST",
        "The request body could not be read",
      );
    }
  }
  return new ApiError(500, "INTERNAL_ERROR", "Unexpected error");
}

function isFrameworkError(error: unknown): error is FrameworkError {
  return (
    error instanceof Error &&
    typeof (error as FrameworkError).statusCode === "number"
  );
}

interface FrameworkError extends Error {
  statusCode: number;
  code?: string;
}
