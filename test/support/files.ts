const padded = (head: Buffer): Buffer =>
  Buffer.concat([head, Buffer.alloc(64)]);

export const GIF = padded(Buffer.from("GIF89a"));
export const PDF = padded(Buffer.from("%PDF-1.7"));
export const HEIC = padded(
  Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypheic")]),
);

export function jpegOfSize(bytes: number): Buffer {
  const image = Buffer.alloc(bytes);
  image.set([0xff, 0xd8, 0xff]);
  return image;
}
