// The cat's tail: a tapered S-curve drawn as one SVG path along a "spine". Swishing is
// a wave travelling from base to tip, so the tail bends like a real one rather than
// rotating as a stiff piece. Coordinates are in the cat's own 300×340 drawing.

const BASE = { x: 218, y: 238 }; // hidden just inside the body's lower right
const LENGTH = 118;
const SEGMENTS = 30;
const BASE_WIDTH = 20;
const TIP_WIDTH = 9;

export const TAIL_SWISH = {
  amplitude: 20, // degrees of bend at the tip
  periodMs: 3200, // one swish, at rest
  alertPeriodMs: 650, // one swish while the laser is on
  crazyPeriodMs: 360, // one swish while a fly is around: the tail goes wild
  crazyAmplitude: 30,
};

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Resting shape: heads out to the right and a little down, then sweeps up, the tip curling back. */
function restAngle(s: number) {
  return 28 - 142 * Math.pow(s, 1.25);
}

/** SVG path for the tail at a point in its swish cycle (phase in radians). */
export function tailPath(phase: number, amplitude = TAIL_SWISH.amplitude): string {
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  let x = BASE.x;
  let y = BASE.y;
  const step = LENGTH / SEGMENTS;
  for (let i = 0; i <= SEGMENTS; i++) {
    const s = i / SEGMENTS;
    const angle = rad(restAngle(s) + amplitude * Math.pow(s, 0.8) * Math.sin(phase - 2.4 * s));
    const w = (BASE_WIDTH + (TIP_WIDTH - BASE_WIDTH) * Math.pow(s, 1.4)) / 2;
    // normal to the spine
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    left.push([x + nx * w, y + ny * w]);
    right.push([x - nx * w, y - ny * w]);
    if (i < SEGMENTS) {
      x += Math.cos(angle) * step;
      y += Math.sin(angle) * step;
    }
  }
  const f = (p: [number, number]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  const tipR = (TIP_WIDTH / 2).toFixed(1);
  return (
    `M ${f(left[0])} ` +
    left
      .slice(1)
      .map((p) => `L ${f(p)}`)
      .join(" ") +
    ` A ${tipR} ${tipR} 0 0 0 ${f(right[right.length - 1])} ` +
    right
      .slice(0, -1)
      .reverse()
      .map((p) => `L ${f(p)}`)
      .join(" ") +
    " Z"
  );
}
