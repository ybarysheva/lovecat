// The laser pointer. Tap it to turn it on: the red dot follows the mouse or finger (and
// stays put when a finger lifts) until it's tapped again. The cat watches the dot, tilts
// its head, flattens its ears, lashes its tail, and swipes at fast moves. After enough
// swipes, bringing the dot near its front paws makes it pounce and catch the dot.

import type { Body } from "./body";
import { starWaves } from "./particles";
import { replay, type Timers } from "./timers";

const SWIPE_SPEED = 1.2; // px per ms; dot moves faster than this make the cat swipe
const SWIPES_TO_CATCH = 5;
const POUNCE_MS = 550;
const IMPACT_AT = 0.62; // fraction of the pounce when the paws land

type LaserParts = {
  root: HTMLElement;
  button: HTMLElement;
  cat: HTMLElement; // gets "tail-alert" while the laser is on
  face: HTMLElement; // gets "ears-alert"
  paws: [HTMLElement, HTMLElement]; // left, right
};

/** Told when the laser is turned on and when the cat catches the dot (for counting). */
type LaserEvents = { started?: () => void; caught?: () => void };

export function createLaser(
  { root, button, cat, face, paws }: LaserParts,
  body: Body,
  timers: Timers,
  on: LaserEvents = {},
) {
  let dot: HTMLElement | null = null;
  let following: AbortController | null = null; // the dot's pointer listeners, while it's on
  let lastSample: { x: number; y: number; t: number } | null = null;
  let swipes = 0;
  let catching = false;

  function swipe(x: number) {
    const paw = x < body.centerX() ? paws[0] : paws[1];
    if (paw.classList.contains("swiping")) return; // already mid-swipe
    swipes++;
    paw.classList.add("swiping");
    paw.addEventListener("animationend", () => paw.classList.remove("swiping"), { once: true });
  }

  // The catch zone: just around and in front of the two front paws.
  function nearPaws(x: number, y: number) {
    const a = body.point(56, 212);
    const b = body.point(244, 304);
    return x >= a.x && x <= b.x && y >= a.y && y <= b.y;
  }

  function moveDot(x: number, y: number) {
    if (!dot) return;
    dot.style.left = x + "px";
    dot.style.top = y + "px";
    body.tiltHead(x);
    body.lookAt(x, y);

    // Swipe on fast moves, measured over at least 40ms so jittery events don't count.
    const t = performance.now();
    if (!lastSample) {
      lastSample = { x, y, t };
    } else if (t - lastSample.t >= 40) {
      const speed = Math.hypot(x - lastSample.x, y - lastSample.y) / (t - lastSample.t);
      if (speed > SWIPE_SPEED) swipe(x);
      lastSample = { x, y, t };
    }

    if (swipes >= SWIPES_TO_CATCH && nearPaws(x, y)) pounce();
  }

  function follow(on: boolean) {
    following?.abort();
    following = null;
    if (!on) return;
    following = new AbortController();
    const onPointer = (e: PointerEvent) => moveDot(e.clientX, e.clientY);
    document.addEventListener("pointermove", onPointer, { signal: following.signal });
    document.addEventListener("pointerdown", onPointer, { signal: following.signal });
  }

  function start(x: number, y: number) {
    button.classList.add("active");
    root.classList.add("laser-on"); // stops touch drags from scrolling the page
    cat.classList.add("tail-alert");
    face.classList.add("ears-alert");

    dot = document.createElement("div");
    dot.className = "laser-dot";
    root.appendChild(dot);
    lastSample = null;
    swipes = 0;
    moveDot(x, y);
    follow(true);
  }

  function stop() {
    follow(false);
    cat.classList.remove("tail-alert");
    face.classList.remove("ears-alert");
    face.style.transform = "";
    for (const paw of paws) paw.classList.remove("swiping", "pouncing");
    body.lookAhead();
    root.classList.remove("laser-on");
    button.classList.remove("active");

    const gone = dot;
    dot = null;
    if (!gone) return;
    gone.style.transition = "opacity 0.3s";
    gone.style.opacity = "0";
    timers.later(() => gone.remove(), 300);
  }

  // The reward: both paws slam down on the dot, it vanishes, stars rise, the cat is happy.
  function pounce() {
    const caught = dot;
    if (!caught || catching) return;
    catching = true;
    follow(false);

    // The dot slides under the spot where the paws will meet.
    const landing = body.point(150, 273);
    body.tiltHead(landing.x);
    body.lookAt(landing.x, landing.y);
    const impactMs = Math.round(POUNCE_MS * IMPACT_AT);
    caught.style.transition = `left ${impactMs}ms ease-in, top ${impactMs}ms ease-in`;
    caught.style.left = landing.x + "px";
    caught.style.top = landing.y + "px";

    for (const paw of paws) {
      paw.classList.remove("swiping");
      replay(paw, "pouncing");
    }

    timers.later(() => {
      caught.style.transition = "transform 0.08s ease-in, opacity 0.08s ease-in";
      caught.style.transform = "translate(-50%, -50%) scale(0)";
      caught.style.opacity = "0";
      starWaves(root, timers.later, landing.x, landing.y, landing.scale);
      body.happy(false);
      on.caught?.();
    }, impactMs);

    timers.later(() => {
      catching = false;
      stop();
    }, POUNCE_MS + 150);
  }

  function onClick(e: MouseEvent) {
    if (catching) return; // let the catch finish; it turns the laser off itself
    if (dot) stop();
    else {
      if (e.detail === 0) {
        // Pressed from the keyboard (no pointer position): start at the laser itself.
        const r = button.getBoundingClientRect();
        start(r.left + r.width / 2, r.bottom);
      } else start(e.clientX, e.clientY);
      on.started?.();
    }
  }

  return {
    onClick,
    /** On (or mid-catch): the cat is busy with the dot. */
    get busy() {
      return dot !== null || catching;
    },
    dispose: () => follow(false),
  };
}
