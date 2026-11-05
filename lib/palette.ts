// The look shared by everything drawn on the page: the two colours (ink on paper) and the
// small helpers used to dither tones into them. Used by the room, vines, fly, link-preview
// image and the texture script (scripts/dither-textures.ts). The CSS has the same two
// colours as --ink and --paper in app/globals.css.

export type RGB = readonly [number, number, number];

export const INK: RGB = [0x1c, 0x14, 0x10];
export const PAPER: RGB = [0xd4, 0xc5, 0xa9];

export const hex = (c: RGB) =>
  "#" +
  c
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
export const INK_HEX = hex(INK);
export const PAPER_HEX = hex(PAPER);

/** Ink faded toward paper: 0 = full ink, 1 = paper. For printing dots in a lighter ink. */
export const fadedInk = (fade: number): RGB =>
  INK.map((c, i) => Math.round(c + (PAPER[i] - c) * fade)) as unknown as RGB;

/** 8×8 ordered-dither (Bayer) matrix: a pixel is ink when tone > (value + 0.5) / 64. */
export const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

/** Whether a pixel at (x, y) is ink for a tone from 0 (paper) to 1 (solid ink). */
export const ditherInk = (tone: number, x: number, y: number) => tone > (BAYER8[y & 7][x & 7] + 0.5) / 64;

export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/** A fixed pseudo-random number in [0, 1) for each n: the same n always gives the same value. */
export const hash = (n: number) => {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

/** A seeded random generator: the same seed always gives the same sequence. */
export function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
