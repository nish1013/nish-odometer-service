import type { FastifyReply, FastifyRequest } from "fastify";
import type { OcrProvider } from "../reading/ocr-provider.js";
import type { ErrorCode, RequestFacts } from "./http.types.js";

const FACTS = new WeakMap<FastifyRequest, RequestFacts>();

export function factsFor(request: FastifyRequest): RequestFacts {
  let facts = FACTS.get(request);
  if (!facts) {
    facts = {};
    FACTS.set(request, facts);
  }
  return facts;
}

export function recordError(request: FastifyRequest, code: ErrorCode): void {
  factsFor(request).errorCode = code;
}

export function logRequest(provider: OcrProvider) {
  return (
    request: FastifyRequest,
    reply: FastifyReply,
    done: () => void,
  ): void => {
    request.log.info(
      {
        status: reply.statusCode,
        provider: provider.name,
        model: provider.model,
        ...factsFor(request),
      },
      "request done",
    );
    done();
  };
}
