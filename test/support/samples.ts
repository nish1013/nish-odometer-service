import { readFileSync } from "node:fs";

const load = (path: string): Buffer =>
  readFileSync(new URL(`../../${path}`, import.meta.url));

export const IMG_A = load("images/33c24909-e9dd-46d3-8e7f-c44fd9896537.jpeg");
export const IMG_B = load("images/d621e37e-7c0f-49a4-8a19-d628b1e82a33.jpeg");
export const IMG_C = load("images/dbab9932-823e-49ed-80db-1e898d836d5e.jpeg");
export const IMG_D = load("images/3ae9d173-8895-409e-844c-77b5841138d7.jpeg");
export const BLANK_WALL = load("test/fixtures/blank-wall.jpeg");
export const BLANK_WALL_PNG = load("test/fixtures/blank-wall.png");
export const STRIPES_PNG = load("test/fixtures/stripes.png");
