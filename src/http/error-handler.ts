import type { FastifyReply, FastifyRequest } from "fastify";
import { UnreadableImageError } from "../reading/unreadable-image-error.js";
import { ApiError } from "./api-error.js";

export function handleError(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  const apiError = toApiError(error);
  if (apiError.status >= 500)
    request.log.error({ err: error }, "request failed");
  return reply.status(apiError.status).send(apiError.toBody());
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

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof UnreadableImageError) {
    return new ApiError(422, "UNREADABLE_IMAGE", error.message);
  }
  return new ApiError(500, "INTERNAL_ERROR", "Unexpected error");
}
