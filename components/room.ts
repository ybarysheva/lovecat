// The background: the corner of a room. The wall has a light wallpaper of small paw
// prints and fish bones; below it a baseboard and a lightly dithered floor, both fading
// out toward the sides. Drawn in the cat's two colors (ink motifs, 1px ordered dither
// for tones) and placed relative to the cat, so it lines up on any screen.

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

// In the cat's units (the cat is 300×340); everything scales with the cat.
const FLOOR_AT = 300; // floor line, in the cat's coordinates (through the cushion)
const BASEBOARD = 14; // height of the baseboard above the floor line
const WALLPAPER = {
  spacingX: 84, // between motifs in a row
  spacingY: 74, // between rows; odd rows shift half a step (a half-drop repeat)
  pawSize: 26,
  fishSize: 32,
};
// How much ink, 0 (paper) to 1 (solid).
const TONE = {
  motif: 0.32, // wallpaper is printed at about a third density, so it stays light
  baseboard: 0.2,
  floor: 0.1,
};
// The corner fades out toward the sides: full near the cat, gone by `fadeTo` from its center.
const FADE = { from: 200, to: 620 };

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

export type CatPlacement = { left: number; top: number; scale: number };

function drawPaw(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  // Main pad (wider at the bottom) and four toe beans in an arc above it.
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.2, size * 0.27, size * 0.22, 0, 0, Math.PI * 2);
  ctx.ellipse(x, y + size * 0.3, size * 0.31, size * 0.14, 0, 0, Math.PI * 2);
  for (const [dx, dy, r] of [
    [-0.36, -0.06, 0.12],
    [-0.14, -0.3, 0.13],
    [0.14, -0.3, 0.13],
    [0.36, -0.06, 0.12],
  ]) {
    ctx.moveTo(x + dx * size + r * size, y + dy * size);
    ctx.arc(x + dx * size, y + dy * size, r * size, 0, Math.PI * 2);
  }
  ctx.fill();
}

function drawFishBone(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const half = size / 2;
  const line = Math.max(2, size * 0.12);
  // Head (pointing left).
  ctx.beginPath();
  ctx.moveTo(x - half, y);
  ctx.lineTo(x - half + size * 0.28, y - size * 0.2);
  ctx.lineTo(x - half + size * 0.28, y + size * 0.2);
  ctx.closePath();
  ctx.fill();
  // Spine.
  ctx.fillRect(x - half + size * 0.25, y - line / 2, size * 0.6, line);
  // Ribs.
  for (let i = 0; i < 3; i++) {
    const rx = x - half + size * (0.42 + i * 0.13);
    const rh = size * (0.17 - i * 0.025);
    ctx.fillRect(rx - line / 2, y - rh, line, rh * 2);
  }
  // Tail.
  ctx.beginPath();
  ctx.moveTo(x + half - size * 0.16, y);
  ctx.lineTo(x + half, y - size * 0.17);
  ctx.lineTo(x + half, y + size * 0.17);
  ctx.closePath();
  ctx.fill();
}

/** Draws the room into `canvas`, sized to `width`×`height` CSS px, with the cat at `cat`. */
export function drawRoom(canvas: HTMLCanvasElement, width: number, height: number, cat: CatPlacement) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const s = cat.scale;
  const cx = cat.left + 150 * s;
  const floorY = cat.top + FLOOR_AT * s;
  const baseTop = floorY - BASEBOARD * s;

  // 1. Wallpaper motifs, drawn as shapes, then snapped to 1-bit below.
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#000";
  const sx = WALLPAPER.spacingX * s;
  const sy = WALLPAPER.spacingY * s;
  const margin = WALLPAPER.fishSize * s; // keep motifs clear of the baseboard
  for (let row = 0; ; row++) {
    const y = baseTop - margin - sy * (row + 0.5);
    if (y < -sy) break;
    const shift = row % 2 ? sx / 2 : 0;
    // Columns anchored on the cat's center so the pattern sits evenly around it.
    const first = Math.floor((0 - cx - shift) / sx) - 1;
    const last = Math.ceil((w - cx - shift) / sx) + 1;
    for (let col = first; col <= last; col++) {
      // Snap each motif to the 8px dither grid so every one gets exactly the same dots
      // (otherwise some come out darker than others, depending on where they land).
      const x = Math.round((cx + shift + col * sx) / 8) * 8;
      const ySnapped = Math.round(y / 8) * 8;
      // Alternate motifs along the row, offset each row so they checker.
      if ((col + row) % 2 === 0) drawPaw(ctx, x, ySnapped, WALLPAPER.pawSize * s);
      else drawFishBone(ctx, x, ySnapped, WALLPAPER.fishSize * s);
    }
  }
  const motifs = ctx.getImageData(0, 0, w, h).data;

  // 2. Combine with the baseboard and floor, in 1px ordered dither.
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const row = BAYER8[y & 7];
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let ink = motifs[i + 3] > 127 && TONE.motif > (row[x & 7] + 0.5) / 64;
      if (!ink && y >= baseTop) {
        const side = 1 - smoothstep(FADE.from * s, FADE.to * s, Math.abs(x + 0.5 - cx));
        let tone = 0;
        if (y < baseTop + 1) tone = 1; // the baseboard's top edge
        else if (y < floorY) tone = TONE.baseboard;
        else if (y < floorY + 1) tone = 0.8; // where the baseboard meets the floor
        else tone = TONE.floor * (1 - smoothstep(0, 320 * s, y - floorY)); // floor, fading toward you
        ink = tone * side > (row[x & 7] + 0.5) / 64;
      }
      const c = ink ? INK : PAPER;
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}
