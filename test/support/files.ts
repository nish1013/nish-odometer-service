import { readFileSync } from "node:fs";

const padded = (head: Buffer): Buffer =>
  Buffer.concat([head, Buffer.alloc(64)]);
const IMG_A = readFileSync(
  new URL(
    "../../images/33c24909-e9dd-46d3-8e7f-c44fd9896537.jpeg",
    import.meta.url,
  ),
);

export const GIF = padded(Buffer.from("GIF89a"));
export const PDF = padded(Buffer.from("%PDF-1.7"));
export const HEIC = padded(
  Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypheic")]),
);
export const BROKEN_JPEG = padded(Buffer.from([0xff, 0xd8, 0xff]));

export function jpegOfSize(bytes: number): Buffer {
  return Buffer.concat([IMG_A, Buffer.alloc(bytes - IMG_A.length)]);
}
