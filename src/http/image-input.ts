import type { FastifyRequest } from "fastify";
import { ApiError } from "./api-error.js";

const IMAGE_FIELD = "image";

export async function readImage(request: FastifyRequest): Promise<Buffer> {
  if (!request.isMultipart()) {
    throw new ApiError(
      400,
      "INVALID_REQUEST",
      "Body must be multipart/form-data",
    );
  }

  let image: Buffer | undefined;
  for await (const part of request.parts()) {
    if (part.type !== "file") continue;
    if (part.fieldname === IMAGE_FIELD && image === undefined) {
      image = await part.toBuffer();
    } else {
      part.file.resume();
    }
  }

  if (!image || image.length === 0) {
    throw new ApiError(
      400,
      "MISSING_IMAGE",
      `No file in the "${IMAGE_FIELD}" field`,
    );
  }
  return image;
}
