// Pothos vines in the top of the room: a short swag across the top-left corner, a long
// strand hanging down on the left, and a short one further right (left of the treat bag).
// The vines wander rather than hang straight, and the leaves vary in size, shape, tilt and
// spacing, each on its own small curved stalk. Only the lower ends of the two strands move,
// swaying gently (a wave running toward the tip, like the tail); the swag is still.
// Drawn as SVG in the cat's ink; leaves are filled with a 1px ordered-dither pattern.

import { ditherInk, fadedInk, hex, PAPER_HEX as PAPER, seededRandom } from "@/lib/palette";

const SVG_NS = "http://www.w3.org/2000/svg";
// The leaves' dotted fill is printed in a lighter ink (outlines and vines stay full ink).
// 0 = full ink, 1 = paper.
const LEAF_INK = hex(fadedInk(0.35));

// Everything about the plant is sized by this, so it sits in scale with the cat and the
// wallpaper (1 = the original, smaller plant).
const K = 1.4;

// The swag across the top-left corner (CSS px from the top-left of the screen): it comes
// in from the left edge and sags in an even, rounded curve before rising to the top edge.
// On wide screens it slides right, halfway toward the cat, with its left end hung from the
// top edge instead (so it doesn't float in mid-air).
const SWAG = {
  start: { x: -10 * K, y: 30 * K },
  end: { x: 150 * K, y: -6 },
  sag: 66 * K, // how far the middle hangs below the straight line between the ends
  leafEvery: 15 * K,
};

// Hanging strands: where they hang from (px from the left, given the screen width), how
// long they are, how much they wander, and their sway.
type StrandSpec = {
  from?: (w: number) => number; // not needed for a strand that comes down through the swag
  length: number;
  lean: number; // degrees off straight down
  wander: number; // degrees of built-in waviness
  periodMs: number;
  phase: number;
  seed: number;
  // Comes down from the top edge to a point on the swag, then hangs on from there, so it
  // reads as one vine crossing the swag. `length` is the part below the swag.
  throughSwag?: boolean;
  bare?: number; // px either side of where it crosses the swag with no leaves (no clump)
};
const STRANDS: StrandSpec[] = [
  { throughSwag: true, bare: 19 * K, length: 165 * K, lean: 2, wander: 11, periodMs: 5600, phase: 0, seed: 11 },
  {
    from: (w) => Math.min(w * 0.7, w - 95),
    length: 105 * K,
    lean: -3,
    wander: 9,
    periodMs: 4700,
    phase: 2.1,
    seed: 29,
  },
];
// Only the lower ends of the strands move: the sway fades in over the last `swayFrom` of
// their length, up to `amplitude` degrees at the tip.
const TOP = -6; // strands hang from just above the top edge
const STRAND = { amplitude: 4, swayFrom: 0.55, leafEvery: 17 * K, segment: 6 }; // degrees, fraction, px, px

const LEAF = { min: 8 * K, max: 18 * K }; // leaf length range, px

/**
 * A pothos-style heart leaf pointing along +x, its base at (x0, 0), `size` px long.
 * `wide` sets its width (narrow ones look turned away), `lopsided` makes one half
 * bigger than the other, `bend` curves the tip up or down. Drawn at real size (not
 * scaled) so the leaf's dither pattern keeps 1px dots.
 */
function leafPath(x0: number, size: number, wide: number, lopsided: number, bend: number) {
  const pts = [
    [0, 0],
    [-0.05, -0.3],
    [0.3, -0.48],
    [0.58, -0.32],
    [0.78, -0.2],
    [0.93, -0.08 + bend * 0.5],
    [1, bend],
    [0.93, 0.08 + bend * 0.5],
    [0.78, 0.2],
    [0.58, 0.32],
    [0.3, 0.48],
    [-0.05, 0.3],
    [0, 0],
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
      if (ditherInk(density, x, y)) p.appendChild(el("rect", { x, y, width: 1, height: 1, fill: LEAF_INK }));
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
    const end = Math.max(0, (s - (1 - STRAND.swayFrom)) / STRAND.swayFrom); // 0 until the lower part, 1 at the tip
    const sway = STRAND.amplitude * end * end * Math.sin(phase - 1.2 * s);
    const a = ((90 + spec.lean + wander + sway) * Math.PI) / 180;
    pts.push({ x, y, angle: a });
    x += Math.cos(a) * STRAND.segment;
    y += Math.sin(a) * STRAND.segment;
  }
  return pts;
}

/** Points along the corner swag, moved `shift` px right: an even sag between its two ends
 *  (a parabola off the straight line between them). */
function swagSpine(shift = 0): Point[] {
  const { sag } = SWAG;
  const lift = Math.min(1, shift / 60); // once moved off the left edge, hang that end from the top
  const p0 = { x: SWAG.start.x + shift, y: SWAG.start.y + (TOP - SWAG.start.y) * lift };
  const p1 = { x: SWAG.end.x + shift, y: SWAG.end.y };
  const n = 48;
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const x = p0.x + (p1.x - p0.x) * s;
    const y = p0.y + (p1.y - p0.y) * s + sag * 4 * s * (1 - s);
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y + sag * 4 * (1 - 2 * s);
    pts.push({ x, y, angle: Math.atan2(dy, dx) });
  }
  return pts;
}

/** Where the long strand crosses the swag: a bit left of its lowest point, so it doesn't
 *  hang dead centre. A fraction of the way along the swag, from its left end. */
const STRAND_CROSSES_AT = 0.3;
const crossing = (pts: Point[]): Point => pts[Math.round((pts.length - 1) * STRAND_CROSSES_AT)];

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

/** Builds the vines inside `svg`. Call layout() when the scene changes width and frame() every frame. */
export function createVines(svg: SVGSVGElement, idPrefix: string) {
  const lit = `${idPrefix}-leaf-lit`;
  const shade = `${idPrefix}-leaf-shade`;
  const stemFill = `${idPrefix}-stem`;
  let width = 0;
  let catLeft = 0;
  let swagPts = swagSpine(); // the swag doesn't move, so its shape is worked out per layout
  let cross = crossing(swagPts);
  let swag: Strand | null = null;
  let strands: { strand: Strand; spec: StrandSpec }[] = [];

  function makeLeaf(
    group: SVGGElement,
    at: number,
    side: 1 | -1,
    rnd: () => number,
    droop: number,
    even = false,
  ): Leaf {
    // Even leaves (the swag) stay close to one size and shape; the strands vary a lot.
    const size = even ? (12 + rnd() * 3) * K : LEAF.min + rnd() * (LEAF.max - LEAF.min);
    // Some leaves face us (wide), some are turned away (narrow).
    const wide = even ? 0.42 + rnd() * 0.08 : rnd() < 0.25 ? 0.22 + rnd() * 0.1 : 0.4 + rnd() * 0.16;
    const lopsided = (rnd() - 0.5) * (even ? 0.15 : 0.35);
    const bend = (rnd() - 0.5) * (even ? 0.08 : 0.18);
    // A short curved stalk from the vine to the leaf.
    const stalk = (3 + rnd() * 6) * K;
    const curl = (rnd() - 0.5) * 6 * K;
    const g = el("g", {});
    g.appendChild(
      el("path", {
        d: `M0 0 Q ${(stalk * 0.5).toFixed(1)} ${curl.toFixed(1)} ${stalk.toFixed(1)} 0`,
        fill: "none",
        stroke: `url(#${stemFill})`,
        "stroke-width": 1.6,
        "stroke-linecap": "round",
      }),
    );
    g.appendChild(
      el("path", {
        d: leafPath(stalk - 0.5, size, wide, lopsided, bend),
        fill: `url(#${rnd() < 0.55 ? lit : shade})`, // no outline: the dots alone make the leaf
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
      spread: even ? 0.9 + rnd() * 0.3 : 0.7 + rnd() * 0.7, // how far the leaf stands out from the vine (radians)
      tilt: (rnd() - 0.5) * (even ? 0.3 : 0.7), // plus a bit of its own angle
      droop: droop * (even ? 0.9 + rnd() * 0.2 : 0.6 + rnd() * 0.8),
    };
  }

  function makeStrand(
    length: number,
    leafEvery: number,
    seed: number,
    droop: number,
    even = false,
    bareAt?: { at: number; half: number },
  ): Strand {
    const group = el("g", {});
    const stem = el("path", {
      fill: "none",
      stroke: `url(#${stemFill})`, // dithered like the leaves, a little denser so it reads as a line
      "stroke-width": 2.2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
    group.appendChild(stem);
    const rnd = seededRandom(seed); // so the leaves land in the same places every time
    const leaves: Leaf[] = [];
    let side: 1 | -1 = rnd() < 0.5 ? 1 : -1;
    if (even) {
      // Even: steady spacing, strictly alternating sides, similar sizes.
      for (let at = leafEvery * 0.6; at < length - 3; at += leafEvery * (0.92 + rnd() * 0.16)) {
        leaves.push(makeLeaf(group, at, side, rnd, droop, true));
        side = side === 1 ? -1 : 1;
      }
    } else {
      // Irregular: mostly alternating sides, now and then two close together.
      for (let at = 4 + rnd() * leafEvery; at < length - 3;) {
        if (bareAt && Math.abs(at - bareAt.at) < bareAt.half) {
          // Skip past the bare stretch. (Not `continue`: rounding can leave `at` a hair
          // inside it, which would skip to the same spot forever.)
          at = bareAt.at + bareAt.half;
          if (at >= length - 3) break;
        }
        leaves.push(makeLeaf(group, at, side, rnd, droop));
        if (rnd() < 0.8) side = side === 1 ? -1 : 1;
        at += rnd() < 0.2 ? 4 + rnd() * 5 : leafEvery * (0.6 + rnd() * 0.9);
      }
    }
    svg.appendChild(group);
    return { stem, leaves };
  }

  /** Lays the vines out for a scene `w` px wide with the cat's drawing starting at `catX`. */
  function layout(w: number, catX: number) {
    if (swag && w === width && catX === catLeft) return; // nothing that matters has changed
    width = w;
    catLeft = catX;
    // Slide the swag (and the strand trailing from it) halfway from its corner toward the
    // cat; on phones the cat is already close, so it stays in the corner.
    const shift = Math.max(0, (catX - crossing(swagSpine()).x) / 2);
    swagPts = swagSpine(shift);
    cross = crossing(swagPts);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const defs = el("defs", {});
    defs.appendChild(ditherPattern(lit, 0.42));
    defs.appendChild(ditherPattern(shade, 0.72));
    defs.appendChild(ditherPattern(stemFill, 0.82));
    svg.appendChild(defs);
    // Hanging strands first, so the swag's leaves sit over the top of them.
    // The swag doesn't move, so where it bottoms out is fixed.
    const crossAt = cross.y - TOP; // length of a strand's part above the swag
    strands = STRANDS.map((spec) => ({
      spec,
      strand: spec.throughSwag
        ? makeStrand(crossAt + spec.length, STRAND.leafEvery, spec.seed, 0.3, false, {
            at: crossAt,
            half: spec.bare ?? 0,
          })
        : makeStrand(spec.length, STRAND.leafEvery, spec.seed, 0.3),
    }));
    swag = makeStrand(220 * K, SWAG.leafEvery, 7, 0.5, true);
    place(swag, swagPts); // placed once; it doesn't move
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
      leaf.el.setAttribute(
        "transform",
        `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${((a * 180) / Math.PI).toFixed(1)})`,
      );
    }
  }

  function frame(t: number) {
    if (!swag) return;
    for (const { strand, spec } of strands) {
      if (spec.throughSwag) {
        // Straight down from the top edge to where it crosses the swag, then hanging on below.
        const above: Point[] = [];
        const steps = Math.max(1, Math.round((cross.y - TOP) / STRAND.segment));
        for (let i = 0; i < steps; i++)
          above.push({ x: cross.x, y: TOP + ((cross.y - TOP) * i) / steps, angle: Math.PI / 2 });
        place(strand, [...above, ...hangingSpine(cross.x, cross.y, spec, t)]);
      } else {
        place(strand, hangingSpine(spec.from?.(width) ?? 0, TOP, spec, t));
      }
    }
  }

  return { layout, frame };
}
