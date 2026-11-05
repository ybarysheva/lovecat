// Pothos vines draped along the top of the room: a garland sagging across the top edge
// with leaves hanging off it, and a few strands hanging down at the corners. Each strand
// sways gently (a wave running from where it hangs to its tip, like the tail), and the
// garland breathes a little. Drawn as SVG in the cat's ink, with leaves filled by an
// ordered-dither pattern so they match the 1-bit look.

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

const GARLAND = {
  top: -4, // where it's pinned, just above the top edge
  sag: 34, // how far the middle hangs down
  breathe: 0.05, // the sag grows and shrinks by this fraction
  periodMs: 7000,
  leafEvery: 26,
};

// Hanging strands: where they hang from (as a fraction of the width, or px from an edge),
// how long they are, and their sway.
type StrandSpec = { from: (w: number) => number; length: number; lean: number; periodMs: number; phase: number };
const STRANDS: StrandSpec[] = [
  { from: () => 22, length: 230, lean: 3, periodMs: 5200, phase: 0 },
  { from: () => 58, length: 140, lean: -2, periodMs: 4300, phase: 1.7 },
  { from: (w) => w - 18, length: 150, lean: -3, periodMs: 4800, phase: 3.1 },
];
const STRAND = { amplitude: 5, leafEvery: 21, segment: 7 }; // degrees at the tip, px, px

const LEAF = { min: 11, max: 17, stroke: 1.1 };

// A small seeded random generator, so the leaves land in the same places every time.
function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** A pothos-style heart leaf pointing along +x, base at (x0, 0), `size` px long. Drawn at
 *  real size (not scaled) so the leaf's dither pattern keeps 1px dots. */
function leafPath(x0: number, size: number) {
  const pts = [
    [0, 0], [-0.05, -0.3], [0.3, -0.48], [0.58, -0.32],
    [0.78, -0.2], [0.93, -0.08], [1, 0],
    [0.93, 0.08], [0.78, 0.2], [0.58, 0.32],
    [0.3, 0.48], [-0.05, 0.3], [0, 0],
  ].map(([x, y]) => `${(x0 + x * size).toFixed(2)} ${(y * size).toFixed(2)}`);
  return `M${pts[0]} C${pts[1]} ${pts[2]} ${pts[3]} C${pts[4]} ${pts[5]} ${pts[6]} C${pts[7]} ${pts[8]} ${pts[9]} C${pts[10]} ${pts[11]} ${pts[12]} Z`;
}

type Point = { x: number; y: number; angle: number };
type Leaf = { el: SVGGElement; at: number; side: 1 | -1; size: number; droop: number };
type Strand = { stem: SVGPathElement; leaves: Leaf[]; spec?: StrandSpec };

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

/** Points along a chain that hangs from (x, y): straight down, bending with a travelling wave. */
function hangingSpine(x: number, y: number, spec: StrandSpec, t: number): Point[] {
  const n = Math.ceil(spec.length / STRAND.segment);
  const pts: Point[] = [];
  const phase = (t / spec.periodMs) * Math.PI * 2 + spec.phase;
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const deg = 90 + spec.lean + STRAND.amplitude * Math.pow(s, 0.9) * Math.sin(phase - 2.2 * s);
    const a = (deg * Math.PI) / 180;
    pts.push({ x, y, angle: a });
    x += Math.cos(a) * STRAND.segment;
    y += Math.sin(a) * STRAND.segment;
  }
  return pts;
}

function garlandSpine(w: number, t: number): Point[] {
  const sag = GARLAND.sag * (1 + GARLAND.breathe * Math.sin((t / GARLAND.periodMs) * Math.PI * 2));
  const left = -20;
  const right = w + 20;
  const half = (right - left) / 2;
  const mid = (left + right) / 2;
  const n = Math.max(8, Math.ceil((right - left) / 8));
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const x = left + ((right - left) * i) / n;
    const k = (x - mid) / half;
    const y = GARLAND.top + sag * (1 - k * k);
    const slope = (-2 * sag * k) / half;
    pts.push({ x, y, angle: Math.atan(slope) });
  }
  return pts;
}

/** The point at arc length `at` along a spine. */
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
  let garland: Strand | null = null;
  let strands: Strand[] = [];

  function makeLeaf(group: SVGGElement, at: number, side: 1 | -1, rnd: () => number, droop: number): Leaf {
    const size = LEAF.min + rnd() * (LEAF.max - LEAF.min);
    const g = el("g", {});
    // Short leaf stalk, then the leaf, then its center vein in paper.
    g.appendChild(el("line", { x1: 0, y1: 0, x2: size * 0.25, y2: 0, stroke: INK, "stroke-width": 1.2, "stroke-linecap": "round" }));
    const leaf = el("path", {
      d: leafPath(size * 0.22, size),
      fill: `url(#${rnd() < 0.55 ? lit : shade})`,
      stroke: INK,
      "stroke-width": LEAF.stroke,
      "stroke-linejoin": "round",
    });
    g.appendChild(leaf);
    g.appendChild(
      el("line", {
        x1: size * 0.3,
        y1: 0,
        x2: size * 0.95,
        y2: 0,
        stroke: PAPER,
        "stroke-width": 0.9,
        "stroke-linecap": "round",
      }),
    );
    group.appendChild(g);
    return { el: g, at, side, size, droop };
  }

  function makeStrand(length: number, leafEvery: number, seed: number, droop: number, spec?: StrandSpec): Strand {
    const group = el("g", {});
    const stem = el("path", { fill: "none", stroke: INK, "stroke-width": 1.6, "stroke-linecap": "round", "stroke-linejoin": "round" });
    group.appendChild(stem);
    const rnd = random(seed);
    const leaves: Leaf[] = [];
    let side: 1 | -1 = 1;
    for (let at = leafEvery * (0.4 + rnd() * 0.4); at < length - 4; at += leafEvery * (0.8 + rnd() * 0.4)) {
      leaves.push(makeLeaf(group, at, side, rnd, droop));
      side = side === 1 ? -1 : 1;
    }
    svg.appendChild(group);
    return { stem, leaves, spec };
  }

  function layout(w: number) {
    width = w;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const defs = el("defs", {});
    defs.appendChild(ditherPattern(lit, 0.42));
    defs.appendChild(ditherPattern(shade, 0.72));
    svg.appendChild(defs);
    // Hanging strands go first so the garland's leaves sit over their tops.
    strands = STRANDS.map((spec, i) => makeStrand(spec.length, STRAND.leafEvery, 101 + i * 37, 0.35, spec));
    garland = makeStrand(w + 60, GARLAND.leafEvery, 7, 0.65);
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
      // Leaves stand out from the vine on alternate sides, then droop toward hanging straight down.
      const out = p.angle + leaf.side * 1.0;
      const down = Math.PI / 2;
      let diff = down - out;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const a = out + diff * leaf.droop;
      leaf.el.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${((a * 180) / Math.PI).toFixed(1)})`);
    }
  }

  function frame(t: number) {
    if (!garland) return;
    const g = garlandSpine(width, t);
    place(garland, g);
    for (const s of strands) {
      if (!s.spec) continue;
      // Each strand hangs from the garland where it crosses the strand's x.
      const x = s.spec.from(width);
      const anchor = g.find((p) => p.x >= x) ?? g[g.length - 1];
      place(s, hangingSpine(x, anchor.y, s.spec, t));
    }
  }

  return { layout, frame };
}
