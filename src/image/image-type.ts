import type { ImageType } from "./image.types.js";

const SIGNATURES: readonly [ImageType, readonly number[]][] = [
  ["jpeg", [0xff, 0xd8, 0xff]],
  ["png", [0x89, 0x50, 0x4e, 0x47]],
];

export function detectImageType(bytes: Buffer): ImageType | null {
  const match = SIGNATURES.find(([, signature]) =>
    signature.every((byte, index) => bytes[index] === byte),
  );
  return match ? match[0] : null;
}
