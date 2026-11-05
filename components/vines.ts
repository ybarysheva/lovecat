// Pothos vines in the top of the room: a short swag across the top-left corner, a long
// strand hanging down on the left, and a short one further right (left of the treat bag).
// The vines wander rather than hang straight, and the leaves vary in size, shape, tilt and
// spacing, each on its own small curved stalk. Strands sway gently (a wave running from
// where they hang to their tip, like the tail) and the swag breathes a little.
// Drawn as SVG in the cat's ink; leaves are filled with a 1px ordered-dither pattern.

const SVG_NS = "http://www.w3.org/2000/svg";
const INK = "#1C1410";
const PAPER = "#D4C5A9";

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

// The swag across the top-left corner (CSS px from the top-left of the screen): it comes
// in from the left edge, dips, and rises back up to the top edge.
const SWAG = {
  start: { x: -10, y: 38 },
  dip: { x: 97, y: 148 }, // curve control point (the curve itself bottoms out around y 82)
  end: { x: 128, y: -6 },
  breathe: 0.06, // the dip deepens and lifts by this fraction
  periodMs: 7000,
  leafEvery: 17,
};

// Hanging strands: where they hang from (px from the left, given the screen width), how
// long they are, how much they wander, and their sway.
type StrandSpec = {
  from: (w: number) => number;
  length: number;
  lean: number; // degrees off straight down
  wander: number; // degrees of built-in waviness
  periodMs: number;
  phase: number;
  seed: number;
};
const STRANDS: StrandSpec[] = [
  { from: () => 84, length: 265, lean: 2, wander: 11, periodMs: 5600, phase: 0, seed: 11 },
  { from: (w) => Math.min(w * 0.7, w - 95), length: 105, lean: -3, wander: 9, periodMs: 4700, phase: 2.1, seed: 29 },
];
const STRAND = { amplitude: 5, leafEvery: 17, segment: 6 }; // degrees at the tip, px, px

const LEAF = { min: 8, max: 18, stroke: 1.1 };

// A small seeded random generator, so the leaves land in the same places every time.
function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/**
 * A pothos-style heart leaf pointing along +x, its base at (x0, 0), `size` px long.
 * `wide` sets its width (narrow ones look turned away), `lopsided` makes one half
 * bigger than the other, `bend` curves the tip up or down. Drawn at real size (not
 * scaled) so the leaf's dither pattern keeps 1px dots.
 */
function leafPath(x0: number, size: number, wide: number, lopsided: number, bend: number) {
  const pts = [
    [0, 0], [-0.05, -0.3], [0.3, -0.48], [0.58, -0.32],
    [0.78, -0.2], [0.93, -0.08 + bend * 0.5], [1, bend],
    [0.93, 0.08 + bend * 0.5], [0.78, 0.2], [0.58, 0.32],
    [0.3, 0.48], [-0.05, 0.3], [0, 0],
  ].map(([x, y], i) => {
    const half = i > 0 && i < 6 ? 1 + lopsided : i > 6 && i < 12 ? 1 - lopsided : 1;
    const yy = i === 5 || i === 6 || i === 7 ? y : y * (wide / 0.48) * half;
    return `${(x0 + x * size).toFixed(2)} ${(yy * size).toFixed(2)}`;
  });
  return `M${pts[0]} C${pts[1]} ${pts[2]} ${pts[3]} C${pts[4]} ${pts[5]} ${pts[6]} C${pts[7]} ${pts[8]} ${pts[9]} C${pts[10]} ${pts[11]} ${pts[12]} Z`;
}

type Point = { x: number; y: number; angle: number };
type Leaf = { el: SVGGElement; at: number; side: 1 | -1; spread: number; tilt: number; droop: number };
type Strand = { stem: SVGPathElement; leaves: Leaf[] };

function el<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number>) {
  const e = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

function ditherPattern(id: string, density: number) {
  const p = el("pattern", { id, width: 8, height: 8, patternUnits: "userSpaceOnUse" });
  p.appendChild(el("rect", { width: 8, height: 8, fill: PAPER }));
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if ((BAYER8[y][x] + 0.5) / 64 < density) p.appendChild(el("rect", { x, y, width: 1, height: 1, fill: INK }));
    }
  }
  return p;
}

/** Points along a vine hanging from (x, y): roughly straight down, wandering a little,
 *  and bending with a travelling wave over time. */
function hangingSpine(x: number, y: number, spec: StrandSpec, t: number): Point[] {
  const n = Math.ceil(spec.length / STRAND.segment);
  const pts: Point[] = [];
  const phase = (t / spec.periodMs) * Math.PI * 2 + spec.phase;
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const wander = spec.wander * Math.sin(s * Math.PI * 2.6 + spec.seed) * Math.min(1, s * 4);
    const sway = STRAND.amplitude * Math.pow(s, 0.9) * Math.sin(phase - 2.2 * s);
    const a = ((90 + spec.lean + wander + sway) * Math.PI) / 180;
    pts.push({ x, y, angle: a });
    x += Math.cos(a) * STRAND.segment;
    y += Math.sin(a) * STRAND.segment;
  }
  return pts;
}

/** Points along the corner swag (a gentle curve with a little waviness), breathing over time. */
function swagSpine(t: number): Point[] {
  const breathe = 1 + SWAG.breathe * Math.sin((t / SWAG.periodMs) * Math.PI * 2);
  const p0 = SWAG.start;
  const p2 = SWAG.end;
  const c = { x: SWAG.dip.x, y: SWAG.dip.y * breathe };
  const n = 40;
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const u = 1 - s;
    let x = u * u * p0.x + 2 * u * s * c.x + s * s * p2.x;
    let y = u * u * p0.y + 2 * u * s * c.y + s * s * p2.y;
    const dx = 2 * u * (c.x - p0.x) + 2 * s * (p2.x - c.x);
    const dy = 2 * u * (c.y - p0.y) + 2 * s * (p2.y - c.y);
    const len = Math.hypot(dx, dy) || 1;
    // A small wobble across the curve so it isn't a perfect arc.
    const wobble = 2.5 * Math.sin(s * Math.PI * 5);
    x += (-dy / len) * wobble;
    y += (dx / len) * wobble;
    pts.push({ x, y, angle: Math.atan2(dy, dx) });
  }
  return pts;
}

/** The point (and direction) at arc length `at` along a spine. */
function along(pts: Point[], at: number): Point | null {
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (d + len >= at) {
      const f = len ? (at - d) / len : 0;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, angle: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    d += len;
  }
  return null;
}

const pathOf = (pts: Point[]) => pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

/** Builds the vines inside `svg`. Call layout() when the scene changes size and frame() every frame. */
export function createVines(svg: SVGSVGElement, idPrefix: string) {
  const lit = `${idPrefix}-leaf-lit`;
  const shade = `${idPrefix}-leaf-shade`;
  let width = 0;
  let swag: Strand | null = null;
  let strands: { strand: Strand; spec: StrandSpec }[] = [];

  function makeLeaf(group: SVGGElement, at: number, side: 1 | -1, rnd: () => number, droop: number): Leaf {
    const size = LEAF.min + rnd() * (LEAF.max - LEAF.min);
    // Some leaves face us (wide), some are turned away (narrow).
    const wide = rnd() < 0.25 ? 0.22 + rnd() * 0.1 : 0.4 + rnd() * 0.16;
    const lopsided = (rnd() - 0.5) * 0.35;
    const bend = (rnd() - 0.5) * 0.18;
    // A short curved stalk from the vine to the leaf.
    const stalk = 3 + rnd() * 6;
    const curl = (rnd() - 0.5) * 6;
    const g = el("g", {});
    g.appendChild(
      el("path", {
        d: `M0 0 Q ${(stalk * 0.5).toFixed(1)} ${curl.toFixed(1)} ${stalk.toFixed(1)} 0`,
        fill: "none",
        stroke: INK,
        "stroke-width": 1.1,
        "stroke-linecap": "round",
      }),
    );
    g.appendChild(
      el("path", {
        d: leafPath(stalk - 0.5, size, wide, lopsided, bend),
        fill: `url(#${rnd() < 0.55 ? lit : shade})`,
        stroke: INK,
        "stroke-width": LEAF.stroke,
        "stroke-linejoin": "round",
      }),
    );
    // Center vein in paper, following the tip's bend.
    g.appendChild(
      el("path", {
        d: `M${(stalk + size * 0.1).toFixed(1)} 0 Q ${(stalk + size * 0.55).toFixed(1)} 0 ${(stalk + size * 0.92).toFixed(1)} ${(bend * size * 0.8).toFixed(1)}`,
        fill: "none",
        stroke: PAPER,
        "stroke-width": 0.9,
        "stroke-linecap": "round",
      }),
    );
    group.appendChild(g);
    return {
      el: g,
      at,
      side,
      spread: 0.7 + rnd() * 0.7, // how far the leaf stands out from the vine (radians)
      tilt: (rnd() - 0.5) * 0.7, // plus a bit of its own angle
      droop: droop * (0.6 + rnd() * 0.8),
    };
  }

  function makeStrand(length: number, leafEvery: number, seed: number, droop: number): Strand {
    const group = el("g", {});
    const stem = el("path", { fill: "none", stroke: INK, "stroke-width": 1.5, "stroke-linecap": "round", "stroke-linejoin": "round" });
    group.appendChild(stem);
    const rnd = random(seed);
    const leaves: Leaf[] = [];
    let side: 1 | -1 = rnd() < 0.5 ? 1 : -1;
    // Irregular spacing: mostly alternating sides, now and then two close together.
    for (let at = 4 + rnd() * leafEvery; at < length - 3; ) {
      leaves.push(makeLeaf(group, at, side, rnd, droop));
      if (rnd() < 0.8) side = side === 1 ? -1 : 1;
      at += rnd() < 0.2 ? 4 + rnd() * 5 : leafEvery * (0.6 + rnd() * 0.9);
    }
    svg.appendChild(group);
    return { stem, leaves };
  }

  function layout(w: number) {
    width = w;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const defs = el("defs", {});
    defs.appendChild(ditherPattern(lit, 0.42));
    defs.appendChild(ditherPattern(shade, 0.72));
    svg.appendChild(defs);
    // Hanging strands first, so the swag's leaves sit over the top of them.
    strands = STRANDS.map((spec) => ({ spec, strand: makeStrand(spec.length, STRAND.leafEvery, spec.seed, 0.3) }));
    swag = makeStrand(190, SWAG.leafEvery, 7, 0.55);
  }

  function place(strand: Strand, pts: Point[]) {
    strand.stem.setAttribute("d", pathOf(pts));
    for (const leaf of strand.leaves) {
      const p = along(pts, leaf.at);
      if (!p) {
        leaf.el.setAttribute("visibility", "hidden");
        continue;
      }
      leaf.el.removeAttribute("visibility");
      // Stand out from the vine on its side, tilt a little, then droop toward hanging down.
      const out = p.angle + leaf.side * leaf.spread + leaf.tilt;
      let diff = Math.PI / 2 - out;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const a = out + diff * leaf.droop;
      leaf.el.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${((a * 180) / Math.PI).toFixed(1)})`);
    }
  }

  function frame(t: number) {
    if (!swag) return;
    place(swag, swagSpine(t));
    for (const { strand, spec } of strands) place(strand, hangingSpine(spec.from(width), -6, spec, t));
  }

  return { layout, frame };
}
