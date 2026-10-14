import { readFileSync } from "node:fs";

const padded = (head: Buffer): Buffer =>
  Buffer.concat([head, Buffer.alloc(64)]);
const BLANK_WALL = readFileSync(
  new URL("../fixtures/blank-wall.jpeg", import.meta.url),
);

export const GIF = padded(Buffer.from("GIF89a"));
export const PDF = padded(Buffer.from("%PDF-1.7"));
export const HEIC = padded(
  Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypheic")]),
);
export const BROKEN_JPEG = padded(Buffer.from([0xff, 0xd8, 0xff]));

export function jpegOfSize(bytes: number): Buffer {
  return Buffer.concat([BLANK_WALL, Buffer.alloc(bytes - BLANK_WALL.length)]);
}
