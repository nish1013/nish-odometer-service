import type { FastifyRequest } from "fastify";
import { ApiError } from "./api-error.js";

const IMAGE_FIELD = "image";
const DATA_URL_PREFIX = /^data:image\/[\w.+-]+;base64,/i;
const BASE64 =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export async function readImage(
  request: FastifyRequest,
  maxImageBytes: number,
): Promise<Buffer> {
  const image = request.isMultipart()
    ? await fromMultipart(request)
    : fromJson(request.body);

  if (image.length > maxImageBytes) throw imageTooLarge(maxImageBytes);
  return image;
}

export function imageTooLarge(maxImageBytes: number): ApiError {
  const megabytes = +(maxImageBytes / (1024 * 1024)).toFixed(2);
  return new ApiError(
    413,
    "IMAGE_TOO_LARGE",
    `The image is larger than ${String(megabytes)} MB`,
  );
}

async function fromMultipart(request: FastifyRequest): Promise<Buffer> {
  let image: Buffer | undefined;
  for await (const part of request.parts()) {
    if (part.type !== "file") continue;
    if (part.fieldname === IMAGE_FIELD && image === undefined) {
      image = await part.toBuffer();
    } else {
      part.file.resume();
    }
  }

  if (!image || image.length === 0) throw missingImage();
  return image;
}

function fromJson(body: unknown): Buffer {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw invalidRequest(
      "The body must be multipart/form-data or a JSON object",
    );
  }

  const value: unknown = (body as Record<string, unknown>)[IMAGE_FIELD];
  if (value === undefined || value === null || value === "")
    throw missingImage();
  if (typeof value !== "string") {
    throw invalidRequest(`The "${IMAGE_FIELD}" field must be a Base64 string`);
  }

  const base64 = value.replace(DATA_URL_PREFIX, "").replace(/\s/g, "");
  if (!BASE64.test(base64)) {
    throw invalidRequest(`The "${IMAGE_FIELD}" field is not valid Base64`);
  }

  const image = Buffer.from(base64, "base64");
  if (image.length === 0) throw missingImage();
  return image;
}

function missingImage(): ApiError {
  return new ApiError(
    400,
    "MISSING_IMAGE",
    `No image in the "${IMAGE_FIELD}" field`,
  );
}

function invalidRequest(message: string): ApiError {
  return new ApiError(400, "INVALID_REQUEST", message);
}
