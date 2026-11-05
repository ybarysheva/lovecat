// Generates the cat's shaded 1-bit textures (public/tex/*.png).
//
// Each part of the cat is shaded as a lit form (light from the upper left) and turned
// into ink/paper pixels with an 8×8 ordered (Bayer) dither. One texture pixel is one
// 1×1px "cat pixel"; CSS scales them up with image-rendering: pixelated. The dither
// grid is in the cat's own coordinates, so neighbouring parts share one continuous grid.
//
// Run after changing a part's size or position in components/cat.css:
//   node scripts/dither-textures.mjs

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const INK = [0x1c, 0x14, 0x10];
const PAPER = [0xd4, 0xc5, 0xa9];
const CELL = 1; // css px per cat pixel (the size of one dither dot)

const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

// Light from the upper left, a little in front.
const L = (() => {
  const v = [-0.5, -0.65, 0.6];
  const n = Math.hypot(...v);
  return v.map((c) => c / n);
})();

const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/** Brightness (0–1) of a rounded form at box coordinates u, v (0–1). */
function sphere(u, v, squashX = 1) {
  const nx = (u - 0.5) * 2 * squashX;
  const ny = (v - 0.5) * 2;
  const r = Math.min(1, Math.hypot(nx, ny));
  const s = r > 0 ? r / Math.hypot(nx, ny) : 0;
  const x = nx * s;
  const y = ny * s;
  const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  const lambert = Math.max(0, x * L[0] + y * L[1] + z * L[2]);
  return 0.12 + 0.88 * lambert;
}

// How much ink each material uses, from fully lit (tone 1) to in shadow (tone 0).
const MATERIAL = {
  fur: (tone) => 1 - 0.42 * tone, // dark tabby fur: ~60% ink where lit, ~95% in shadow
  mid: (tone) => 0.3 + 0.5 * (1 - tone), // muzzle, inner ears
  light: (tone) => 0.12 + 0.45 * (1 - tone), // belly, blush, cloud: never so light the shape disappears
};

// Every textured part, in the cat's 300×340 coordinates (see components/cat.css).
const PARTS = [
  { name: "head", x: 92, y: 54, w: 116, h: 112, material: "fur", tone: (u, v) => sphere(u, v) },
  { name: "body", x: 64, y: 162, w: 172, h: 104, material: "fur", tone: (u, v) => sphere(u, v) * 0.92 },
  { name: "paw-l", x: 76, y: 262, w: 50, h: 22, material: "fur", tone: (u, v) => sphere(u, v) },
  { name: "paw-r", x: 174, y: 262, w: 50, h: 22, material: "fur", tone: (u, v) => sphere(u, v) * 0.85 },
  // Ears are cones: lit along their left edge.
  { name: "ear-l", x: 91, y: 22, w: 42, h: 52, material: "fur", tone: (u, v) => clamp(0.95 - 0.75 * u - 0.15 * v) },
  { name: "ear-r", x: 165, y: 22, w: 42, h: 52, material: "fur", tone: (u, v) => clamp(0.8 - 0.75 * u - 0.15 * v) },
  { name: "ear-inner-l", x: 101, y: 38, w: 22, h: 30, material: "mid", tone: (u) => clamp(0.95 - 0.6 * u) },
  { name: "ear-inner-r", x: 175, y: 38, w: 22, h: 30, material: "mid", tone: (u) => clamp(0.8 - 0.6 * u) },
  { name: "muzzle", x: 123, y: 112, w: 54, h: 38, material: "mid", tone: (u, v) => sphere(u, v) },
  { name: "blush-l", x: 97, y: 117, w: 28, h: 14, material: "light", tone: (u, v) => sphere(u, v) },
  { name: "blush-r", x: 175, y: 117, w: 28, h: 14, material: "light", tone: (u, v) => sphere(u, v) * 0.85 },
  { name: "belly", x: 107, y: 218, w: 86, h: 44, material: "light", tone: (u, v) => sphere(u, v) },
  {
    // The cushion: lit across the top, darker toward the bottom (its underside is in
    // shade), with the cat's shadow falling on it just below the body.
    name: "cloud",
    x: 6,
    y: 258,
    w: 288,
    h: 82,
    material: "light",
    tone: (u, v) => {
      const lit = sphere(u, v * 0.6, 0.45);
      const sx = (u * 288 - 150) / 105;
      const sy = (v * 82 - 8) / 26;
      const shadow = Math.max(0, 1 - Math.hypot(sx, sy));
      const underside = 0.3 * smoothstep(0.55, 1, v);
      return clamp(lit - 0.55 * Math.pow(shadow, 0.8) - underside);
    },
  },
  {
    // The tail sweeps around over time, so its shading lives in the cat's coordinates:
    // lighter toward the top, darker low and behind the body.
    name: "tail",
    // Wider than the cat (340px), since the tail swings out past its right edge.
    x: 0,
    y: 0,
    w: 340,
    h: 340,
    material: "fur",
    tone: (u, v) => clamp(0.95 - 1.6 * (v - 0.45) - 0.4 * ((u * 340) / 300 - 0.75)),
    scale: 3, // drawn as an SVG pattern image, so store it larger instead of relying on pixelated scaling
  },
  // Props outside the cat (their own coordinates; sizes are their border boxes).
  // The treat bag is a soft sack, lit from the upper left.
  { name: "bag", x: 0, y: 0, w: 40, h: 50, material: "fur", tone: (u, v) => sphere(u, v * 0.85 + 0.08, 0.9) },
  {
    // The laser pointer is a cylinder: lit down its left side.
    name: "laser",
    x: 0,
    y: 0,
    w: 14,
    h: 48,
    material: "fur",
    tone: (u, v) => {
      const nx = (u - 0.5) * 2;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx));
      return clamp((0.12 + 0.88 * Math.max(0, nx * L[0] + nz * L[2])) * (1 - 0.15 * v));
    },
  },
];

function render(part) {
  const cols = Math.ceil(part.w / CELL);
  const rows = Math.ceil(part.h / CELL);
  const k = part.scale ?? 1;
  const width = cols * k;
  const height = rows * k;
  const rgb = Buffer.alloc(width * height * 3);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = (c + 0.5) / cols;
      const v = (r + 0.5) / rows;
      const ink = MATERIAL[part.material](part.tone(u, v));
      // Threshold on the cat-wide grid so all parts' dithers line up.
      const gx = Math.floor(part.x / CELL) + c;
      const gy = Math.floor(part.y / CELL) + r;
      const threshold = (BAYER8[gy & 7][gx & 7] + 0.5) / 64;
      const color = ink > threshold ? INK : PAPER;
      for (let dy = 0; dy < k; dy++) {
        for (let dx = 0; dx < k; dx++) {
          const i = ((r * k + dy) * width + (c * k + dx)) * 3;
          rgb[i] = color[0];
          rgb[i + 1] = color[1];
          rgb[i + 2] = color[2];
        }
      }
    }
  }
  return encodePng(width, height, rgb);
}

// Minimal PNG writer: 8-bit RGB, no filtering.
function encodePng(width, height, rgb) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0;
    rgb.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "public", "tex");
fs.mkdirSync(outDir, { recursive: true });
let total = 0;
for (const part of PARTS) {
  const png = render(part);
  fs.writeFileSync(path.join(outDir, `${part.name}.png`), png);
  total += png.length;
  console.log(`${part.name}.png  ${png.length} bytes`);
}
console.log(`total ${total} bytes`);
