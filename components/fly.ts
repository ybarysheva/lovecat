// An occasional fly. Every so often it comes in from the left, right or top, buzzes
// around near the cat in a jittery, fly-like way (darting, pausing to hover here and
// there), then flies off the screen. The cat watches it (the caller moves the pupils via
// onMove) and its tail goes wild while it's around (the caller checks `active`).

const INK = "#1C1410";
const PAPER = "#D4C5A9";
const SVG_NS = "http://www.w3.org/2000/svg";

export const FLY = {
  firstAfterMs: [8000, 20000], // first visit, after the page opens
  everyMs: [25000, 50000], // between visits
  stops: [3, 5], // places it buzzes around before leaving
  speed: 170, // px/s while buzzing about
  leaveSpeed: 280, // px/s on the way out
  hoverMs: [250, 900], // how long it hovers at each stop
  maxVisitMs: 9000,
};

type Vec = { x: number; y: number };
const between = ([a, b]: number[]) => a + Math.random() * (b - a);

function makeFlyElement(): HTMLElement {
  const el = document.createElement("div");
  el.className = "fly";
  el.setAttribute("aria-hidden", "true");
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "-8 -7 16 14");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "14");
  // Wings (paper, ink outline) behind a small ink body and head, facing +x.
  svg.innerHTML = `
    <g class="fly-wings">
      <ellipse cx="-1.5" cy="-3.6" rx="3.6" ry="2.2" fill="${PAPER}" stroke="${INK}" stroke-width="0.9" transform="rotate(-25 -1.5 -3.6)"/>
      <ellipse cx="-1.5" cy="3.6" rx="3.6" ry="2.2" fill="${PAPER}" stroke="${INK}" stroke-width="0.9" transform="rotate(25 -1.5 3.6)"/>
    </g>
    <ellipse cx="-0.5" cy="0" rx="3.4" ry="2.3" fill="${INK}"/>
    <circle cx="3.4" cy="0" r="1.8" fill="${INK}"/>`;
  el.appendChild(svg);
  return el;
}

type Options = {
  root: HTMLElement;
  /** Screen rectangle of the cat, to buzz around. */
  catRect: () => DOMRect;
  /** Whether a fly may come now (e.g. not while the laser is on). */
  allowed: () => boolean;
  onMove: (x: number, y: number) => void;
  onEnd: () => void;
  later: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
};

export function createFlies({ root, catRect, allowed, onMove, onEnd, later }: Options) {
  let el: HTMLElement | null = null;
  let frame = 0;
  let active = false;
  let stopped = false;

  function schedule(range: number[]) {
    later(() => {
      if (stopped) return;
      if (allowed() && !document.hidden) visit();
      else schedule([4000, 9000]); // try again soon
    }, between(range));
  }

  /** A point `beyond` px outside the left, right or top edge. */
  function edgePoint(beyond: number): Vec {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const side = Math.floor(Math.random() * 3);
    if (side === 0) return { x: -beyond, y: h * between([0.1, 0.55]) };
    if (side === 1) return { x: w + beyond, y: h * between([0.1, 0.55]) };
    return { x: w * between([0.15, 0.85]), y: -beyond };
  }

  function stopNearCat(): Vec {
    const r = catRect();
    return {
      x: r.left - r.width * 0.15 + Math.random() * r.width * 1.3,
      y: r.top - r.height * 0.25 + Math.random() * r.height * 0.7,
    };
  }

  function visit() {
    active = true;
    el = makeFlyElement();
    root.appendChild(el);

    const pos = edgePoint(20);
    const vel: Vec = { x: 0, y: 0 };
    const stops = Array.from({ length: Math.round(between(FLY.stops)) }, stopNearCat);
    let target: Vec = stops.shift()!;
    let leaving = false;
    let hoverUntil = 0;
    const startedAt = performance.now();
    let last = startedAt;

    const leave = () => {
      leaving = true;
      // Aim well past the edge so it's surely off screen before it would slow down.
      target = edgePoint(150);
    };

    frame = requestAnimationFrame(function tick(now) {
      if (!el) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!leaving && (now - startedAt > FLY.maxVisitMs || !allowed())) leave();

      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      const dist = Math.hypot(dx, dy);
      const hovering = now < hoverUntil;
      const speed = leaving ? FLY.leaveSpeed : hovering ? 0 : FLY.speed;

      if (!leaving && !hovering && dist < 18) {
        // Arrived: hover a moment, then on to the next spot (or away).
        hoverUntil = now + between(FLY.hoverMs);
        if (stops.length) target = stops.shift()!;
        else leave();
      }

      // Steer toward the target, with jitter so it zigzags like a fly.
      const want = dist > 0 ? { x: (dx / dist) * speed, y: (dy / dist) * speed } : { x: 0, y: 0 };
      const steer = Math.min(1, (hovering ? 6 : 3.5) * dt);
      vel.x += (want.x - vel.x) * steer + (Math.random() - 0.5) * (hovering ? 500 : 1100) * dt;
      vel.y += (want.y - vel.y) * steer + (Math.random() - 0.5) * (hovering ? 500 : 1100) * dt;
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;

      const heading = (Math.atan2(vel.y, vel.x) * 180) / Math.PI;
      el.style.transform = `translate(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px) translate(-50%, -50%) rotate(${heading.toFixed(0)}deg)`;
      onMove(pos.x, pos.y);

      const out = pos.x < -40 || pos.y < -40 || pos.x > window.innerWidth + 40 || pos.y > window.innerHeight + 40;
      if (leaving && out) {
        end();
        schedule(FLY.everyMs);
        return;
      }
      frame = requestAnimationFrame(tick);
    });
  }

  function end() {
    cancelAnimationFrame(frame);
    el?.remove();
    el = null;
    if (active) {
      active = false;
      onEnd();
    }
  }

  schedule(FLY.firstAfterMs);

  return {
    get active() {
      return active;
    },
    stop() {
      stopped = true;
      end();
    },
  };
}
