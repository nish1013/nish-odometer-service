import sharp from "sharp";

const SCORE_WIDTH = 800;

export async function measureBlur(image: Buffer): Promise<number> {
  const { data, info } = await sharp(image)
    .rotate()
    .resize({ width: SCORE_WIDTH })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return laplacianVariance(data, info.width, info.height);
}

function laplacianVariance(
  pixels: Buffer,
  width: number,
  height: number,
): number {
  let sum = 0;
  let sumOfSquares = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const value =
        at(pixels, i - width) +
        at(pixels, i + width) +
        at(pixels, i - 1) +
        at(pixels, i + 1) -
        4 * at(pixels, i);
      sum += value;
      sumOfSquares += value * value;
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return sumOfSquares / count - mean * mean;
}

function at(pixels: Buffer, index: number): number {
  return pixels[index] ?? 0;
}
