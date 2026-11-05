// The background: a quiet room with a sunbeam. Light from a window off to the upper
// left falls on the wall behind the cat and runs down onto the floor, so the cat sits
// in it. Drawn in the cat's two colors with the same 1px ordered dither: the room is a
// very light dot shading, and the sunbeam is clean paper.
//
// Everything is placed relative to the cat (its top-left corner and scale), so the
// scene lines up on any screen size.

const INK = [0x1c, 0x14, 0x10] as const;
const PAPER = [0xd4, 0xc5, 0xa9] as const;

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

// How much ink, from 0 (paper) to 1 (solid ink).
const TONE = {
  wall: 0.11, // the room in shade
  floor: 0.19,
  baseboard: 0.42,
};

// Window-shaped light, in the cat's units (the cat is 300×340).
const BEAM = {
  width: 260,
  wallHeight: 250, // from the floor line up the wall
  leftOfCat: 30, // left edge of the patch at the floor, from the cat's left edge
  lean: 0.32, // the patch leans: its top is shifted left toward the window
  floorDepth: 70, // how far the light runs onto the floor
  floorSpread: 0.9, // on the floor it fans out to the right
  mullion: 7, // the window's cross bars, as shadow lines in the light
  crossbarAt: 0.42, // height of the horizontal bar, as a fraction of the wall patch
  soft: 7, // penumbra
};

const FLOOR_AT = 300; // floor line, in the cat's coordinates (through the cushion)

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

export type CatPlacement = { left: number; top: number; scale: number };

/** Draws the room into `canvas`, sized to `width`×`height` CSS px, with the cat at `cat`. */
export function drawSunbeam(canvas: HTMLCanvasElement, width: number, height: number, cat: CatPlacement) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.createImageData(w, h);
  const d = img.data;

  const s = cat.scale;
  const floorY = cat.top + FLOOR_AT * s;
  const beamLeft = cat.left + BEAM.leftOfCat * s;
  const beamW = BEAM.width * s;
  const wallH = BEAM.wallHeight * s;
  const floorH = BEAM.floorDepth * s;
  const soft = BEAM.soft * s;
  const mull = BEAM.mullion * s;

  /** 0–1: how much sunlight falls on this point. */
  function light(x: number, y: number): number {
    let u: number; // across the window, 0..beamW
    let v: number; // 0 at the window's top .. 1 at its bottom (wall) / foot of the floor patch
    let edge: number; // distance to the patch's edge, in px
    if (y <= floorY) {
      const up = floorY - y;
      u = x - (beamLeft - BEAM.lean * up);
      v = 1 - up / wallH;
      edge = Math.min(u, beamW - u, wallH - up);
      if (v < 0) return 0;
      // Cross bars: one vertical, one horizontal.
      const toVertical = Math.abs(u - beamW / 2) - mull / 2;
      const toHorizontal = Math.abs(v - BEAM.crossbarAt) * wallH - mull / 2;
      edge = Math.min(edge, toVertical, toHorizontal);
    } else {
      const down = y - floorY;
      // On the floor the patch fans out toward the viewer.
      const spread = BEAM.floorSpread * down;
      u = x - beamLeft;
      const widthHere = beamW + spread;
      edge = Math.min(u, widthHere - u, floorH - down);
      const toVertical = Math.abs(u - widthHere / 2) - mull / 2;
      edge = Math.min(edge, toVertical);
    }
    return smoothstep(0, soft, edge);
  }

  for (let y = 0; y < h; y++) {
    const row = BAYER8[y & 7];
    const base = y < floorY - 2 ? TONE.wall : y < floorY + 1 ? TONE.baseboard : TONE.floor;
    for (let x = 0; x < w; x++) {
      const ink = base * (1 - light(x + 0.5, y + 0.5));
      const c = ink > (row[x & 7] + 0.5) / 64 ? INK : PAPER;
      const i = (y * w + x) * 4;
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}
