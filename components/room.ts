// The background: the corner of a room. The wall has a light wallpaper of small paw
// prints and fish bones; below it a prewar Brooklyn-style baseboard (illustrated in
// light, fine lines) and a hardwood strip floor in fine dotted lines, both fading
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
// The baseboard, drawn after a real prewar Brooklyn one: two rounded beads stacked at the
// top with a groove between, a recessed band in shade, a small third bead, a flat board,
// a little step, and a taller lower face down to the floor. Bands from the top down;
// heights in the cat's units; `ink` is how dark each band is (0 paper, 1 solid). Faces are
// clean paper; edges, grooves and undersides are fine dotted lines, so it stays light.
const BASEBOARD: { h: number; ink: number }[] = [
  { h: 1, ink: 0.5 }, // where the wall meets the top bead (1-high bands are drawn as even dotted lines)
  { h: 4, ink: 0 }, // top bead
  { h: 1, ink: 0.22 }, // its rounded underside
  { h: 1, ink: 0.5 }, // groove
  { h: 4, ink: 0 }, // second bead
  { h: 1, ink: 0.28 }, // its underside
  { h: 4, ink: 0.13 }, // recessed band, in shade
  { h: 1, ink: 0.4 }, // top edge of the small bead
  { h: 2, ink: 0 }, // small bead
  { h: 1, ink: 0.22 }, // its underside
  { h: 8, ink: 0 }, // flat board
  { h: 1, ink: 0.45 }, // little step
  { h: 13, ink: 0 }, // lower face
  { h: 1, ink: 0.5 }, // crisp edge at the floor
];
const WALLPAPER = {
  spacingX: 84, // between motifs in a row
  spacingY: 74, // between rows; odd rows shift half a step (a half-drop repeat)
  pawSize: 26,
  fishSize: 32,
};
// How much ink, 0 (paper) to 1 (solid).
const TONE = {
  motif: 0.32, // wallpaper is printed at about a third density, so it stays light
  fishLine: 0.5, // fish bone lines are dotted at half density, so they're as light as the paws
  floor: 0.05, // the boards themselves: nearly clean
};
// The corner fades out toward the sides: full near the cat, gone by `fadeTo` from its center.
const FADE = { from: 200, to: 620 };
// Hardwood strip flooring, as in a prewar Brooklyn apartment: narrow boards running away
// from the wall, drawn in perspective (seams fan out toward you from a vanishing point
// above the floor line), with staggered joints where boards end. In the cat's units.
const FLOORBOARDS = {
  width: 15, // a board's width where it meets the wall
  vanish: 700, // how far above the floor line the seams converge (far: gentle perspective)
  plank: 0.11, // board length, in perspective depth units (1 = at the wall)
  line: 0.45, // how dark seams and joints are
};
const hash = (n: number) => {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

// A soft shadow on the floor where the cushion sits (its bottom is at the cat's y 340).
const BED_SHADOW = { y: 340, rx: 155, ry: 13, ink: 0.22 };

// Even 1D dot order for thin lines: any fraction comes out evenly spaced along a row.
const LINE_DOTS = [0, 4, 2, 6, 1, 5, 3, 7];

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

/**
 * A fish skeleton in fine lines, pointing left: outlined head with an eye, a spine,
 * ribs angled back from it, and a forked tail. Drawn in the canvas's current stroke
 * color; the wallpaper prints these as fine dotted lines, about as light as the paw prints.
 */
function drawFishBone(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const half = size / 2;
  const headEnd = x - half + size * 0.3;
  const tailStart = x + half - size * 0.17;
  ctx.lineWidth = Math.max(1.6, size * 0.055);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  // Head: a rounded wedge.
  ctx.moveTo(headEnd, y - size * 0.19);
  ctx.quadraticCurveTo(x - half + size * 0.02, y - size * 0.14, x - half, y);
  ctx.quadraticCurveTo(x - half + size * 0.02, y + size * 0.14, headEnd, y + size * 0.19);
  ctx.closePath();
  // Spine.
  ctx.moveTo(headEnd, y);
  ctx.lineTo(tailStart, y);
  // Ribs: pairs angled back toward the tail, getting shorter.
  const ribs = 4;
  for (let i = 0; i < ribs; i++) {
    const rx = headEnd + (tailStart - headEnd) * ((i + 0.6) / (ribs + 0.2));
    const len = size * (0.2 - i * 0.03);
    const back = size * 0.07;
    ctx.moveTo(rx, y);
    ctx.lineTo(rx + back, y - len);
    ctx.moveTo(rx, y);
    ctx.lineTo(rx + back, y + len);
  }
  // Tail: a forked fin.
  ctx.moveTo(tailStart, y);
  ctx.lineTo(x + half, y - size * 0.17);
  ctx.lineTo(x + half - size * 0.06, y);
  ctx.lineTo(x + half, y + size * 0.17);
  ctx.closePath();
  ctx.stroke();
  // Eye.
  ctx.beginPath();
  ctx.arc(x - half + size * 0.13, y - size * 0.03, Math.max(0.8, size * 0.03), 0, Math.PI * 2);
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
  // Each baseboard band as pixel rows (at least 1px, so the fine lines never vanish).
  const bands = BASEBOARD.map((b) => ({ px: Math.max(1, Math.round(b.h * s)), ink: b.ink, line: b.h === 1 }));
  const baseTop = floorY - bands.reduce((sum, b) => sum + b.px, 0);
  const baseRows: { ink: number; line: boolean }[] = [];
  for (const b of bands) for (let i = 0; i < b.px; i++) baseRows.push({ ink: b.ink, line: b.line });

  // 1. Wallpaper motifs, drawn as shapes, then snapped to 1-bit below.
  ctx.clearRect(0, 0, w, h);
  // Paw prints are filled in black (printed as a light dither); fish bones are drawn in
  // red (printed as dotted lines). The color only tells the two apart below.
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#f00";
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
      else {
        ctx.fillStyle = "#f00";
        drawFishBone(ctx, x, ySnapped, WALLPAPER.fishSize * s);
        ctx.fillStyle = "#000";
      }
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
      const motif = motifs[i + 3];
      const isLine = motifs[i] > 127; // red: fish bone lines
      const threshold = (row[x & 7] + 0.5) / 64;
      let ink = isLine ? motif > 110 && TONE.fishLine > threshold : motif > 127 && TONE.motif > threshold;
      if (!ink && y >= baseTop) {
        const side = 1 - smoothstep(FADE.from * s, FADE.to * s, Math.abs(x + 0.5 - cx));
        let tone = 0;
        if (y < floorY) {
          const band = baseRows[Math.floor(y - baseTop)];
          if (band?.line) {
            // Thin lines use an even dot spacing along the row (the 2D pattern's rows vary
            // in density, so the same line could come out light on one screen, dark on another).
            ink = band.ink * side > (LINE_DOTS[x & 7] + 0.5) / 8;
            const c = ink ? INK : PAPER;
            d[i] = c[0];
            d[i + 1] = c[1];
            d[i + 2] = c[2];
            d[i + 3] = 255;
            continue;
          }
          tone = band?.ink ?? 0;
        } else {
          const toward = 1 - smoothstep(0, 320 * s, y - floorY); // the floor fades toward you
          tone = TONE.floor * toward;
          // Floorboards: is this pixel on a seam between boards, or a joint where one ends?
          const vanish = FLOORBOARDS.vanish * s;
          const depth = y + 0.5 - (floorY - vanish);
          const pitch = (FLOORBOARDS.width * s * depth) / vanish; // board width at this row, px
          const u = (x + 0.5 - cx) / pitch;
          const seam = Math.abs(u - Math.round(u)) * pitch < 0.55;
          const z = vanish / depth + hash(Math.floor(u)) * FLOORBOARDS.plank;
          const zf = z / FLOORBOARDS.plank;
          const joint = Math.abs(zf - Math.round(zf)) * FLOORBOARDS.plank * ((depth * depth) / vanish) < 0.55;
          if (seam || joint) tone = Math.max(tone, FLOORBOARDS.line * toward);
          // The bed's shadow, darkest right under its edge and fading out.
          const sd = Math.hypot((x + 0.5 - cx) / (BED_SHADOW.rx * s), (y + 0.5 - (cat.top + BED_SHADOW.y * s)) / (BED_SHADOW.ry * s));
          tone += BED_SHADOW.ink * (1 - smoothstep(0.35, 1, sd));
        }
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
