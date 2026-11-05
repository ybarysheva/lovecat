// An occasional fly. Every so often it comes in from the left, right or top and darts
// around above the cat like a real fly: quick straight zips, sudden stops, a twitchy hover,
// then another zip. It never comes lower than the cat's ear tips. Then it zips off screen. The cat watches it (the caller moves the pupils via
// onMove) and its tail goes wild while it's around (the caller checks `active`).

const INK = "#1C1410";
const PAPER = "#D4C5A9";
const SVG_NS = "http://www.w3.org/2000/svg";

export const FLY = {
  firstAfterMs: [8000, 20000], // first visit, after the page opens
  everyMs: [25000, 50000], // between visits
  stops: [5, 8], // short darts before leaving
  dartSpeed: 520, // px/s while darting
  leaveSpeed: 600, // px/s on the way out
  hoverMs: [150, 650], // twitchy hover between darts
  dartReach: [40, 130], // how far each dart goes, px
  maxVisitMs: 9000,
  size: 11, // px across
};

type Vec = { x: number; y: number };
const between = ([a, b]: number[]) => a + Math.random() * (b - a);

function makeFlyElement(): HTMLElement {
  const el = document.createElement("div");
  el.className = "fly";
  el.setAttribute("aria-hidden", "true");
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "-8 -7 16 14");
  svg.setAttribute("width", String(FLY.size));
  svg.setAttribute("height", String((FLY.size * 14) / 16));
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

  /** A point `beyond` px outside the left, right or top edge, at a height within the
   *  fly's area so coming in and leaving never take it below the cat's ears. */
  function edgePoint(beyond: number): Vec {
    const w = window.innerWidth;
    const a = area();
    const y = a.top + Math.random() * (a.bottom - a.top);
    const side = Math.floor(Math.random() * 3);
    if (side === 0) return { x: -beyond, y };
    if (side === 1) return { x: w + beyond, y };
    return { x: w * between([0.15, 0.85]), y: -beyond };
  }

  /** Where the fly buzzes: above the cat, never lower than its ear tips. */
  function area() {
    const r = catRect();
    const scale = r.width / 300;
    const bottom = r.top + 6 * scale; // a little above the ear tips (about 22px into the cat's box), allowing for hover jitter
    return {
      left: r.left - r.width * 0.1,
      right: r.right + r.width * 0.1,
      top: Math.max(16, bottom - 230 * scale),
      bottom,
    };
  }

  /** The next spot to dart to: a short hop from `from`, kept inside the area. */
  function nextStop(from: Vec): Vec {
    const a = area();
    const angle = Math.random() * Math.PI * 2;
    const reach = between(FLY.dartReach);
    return {
      x: Math.min(a.right, Math.max(a.left, from.x + Math.cos(angle) * reach)),
      y: Math.min(a.bottom, Math.max(a.top, from.y + Math.sin(angle) * reach)),
    };
  }

  /** First spot: somewhere in the area. */
  function firstStop(): Vec {
    const a = area();
    return { x: a.left + Math.random() * (a.right - a.left), y: a.top + Math.random() * (a.bottom - a.top) };
  }

  function visit() {
    active = true;
    el = makeFlyElement();
    root.appendChild(el);

    const pos = edgePoint(20);
    const vel: Vec = { x: 0, y: 0 };
    let target: Vec = firstStop();
    let stopsLeft = Math.round(between(FLY.stops));
    let leaving = false;
    let hoverUntil = 0;
    let hoverAt: Vec = { ...pos };
    let heading = 0;
    const startedAt = performance.now();
    let last = startedAt;

    const leave = () => {
      leaving = true;
      hoverUntil = 0;
      // Aim well past the edge so it's surely off screen before it would slow down.
      target = edgePoint(150);
    };

    frame = requestAnimationFrame(function tick(now) {
      if (!el) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!leaving && (now - startedAt > FLY.maxVisitMs || !allowed())) leave();

      if (now < hoverUntil) {
        // Hovering: tiny twitchy movements around the spot.
        vel.x = vel.x * 0.6 + (Math.random() - 0.5) * 160;
        vel.y = vel.y * 0.6 + (Math.random() - 0.5) * 160;
        pos.x += vel.x * dt;
        pos.y += vel.y * dt;
        // Stay close to where it stopped.
        pos.x += (hoverAt.x - pos.x) * Math.min(1, 10 * dt);
        pos.y += (hoverAt.y - pos.y) * Math.min(1, 10 * dt);
        if (Math.random() < 3 * dt) heading += (Math.random() - 0.5) * 120; // turns on the spot now and then
      } else {
        // Darting: a quick, nearly straight zip that stops dead on arrival.
        const dx = target.x - pos.x;
        const dy = target.y - pos.y;
        const dist = Math.hypot(dx, dy);
        const speed = leaving ? FLY.leaveSpeed : FLY.dartSpeed;
        const step = speed * dt;
        if (!leaving && dist <= step) {
          pos.x = target.x;
          pos.y = target.y;
          vel.x = vel.y = 0;
          hoverAt = { ...pos };
          hoverUntil = now + between(FLY.hoverMs);
          if (stopsLeft-- > 0) target = nextStop(pos);
          else leave();
        } else {
          pos.x += (dx / dist) * step + (Math.random() - 0.5) * 1.2;
          pos.y += (dy / dist) * step + (Math.random() - 0.5) * 1.2;
          heading = (Math.atan2(dy, dx) * 180) / Math.PI;
        }
      }

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
