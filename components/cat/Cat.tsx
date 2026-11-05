"use client";

import { useEffect, useId, useRef } from "react";
import { createBody } from "./body";
import { createBubble, createNoteBag } from "./bubble";
import { createFlies } from "./fly";
import { createLaser } from "./laser";
import { drawRoom } from "./room";
import { TAIL_SWISH, tailPath } from "./tail";
import { createTimers, replay, type Timer } from "./timers";
import { createTracker } from "./track";
import type { Place } from "@/lib/stats";
import { createTreat } from "./treat";
import { createVines } from "./vines";
import "./cat.css";

type Props = {
  /** The recipient's name; null for the demo cat, which just says "pet the cat". */
  to: string | null;
  from: string | null;
  notes: string[];
  /** Shown at the bottom of the scene: "send someone a cat" on a cat page, "back to editing" in preview. */
  footer?: React.ReactNode;
  /** Count what people do with this cat, and where (left out for the builder's preview). */
  track?: Place;
};

// The cat and its room. The markup is JSX; the behaviour is plain DOM code (one module per
// part, wired together in startCat), scoped to this component's root and cleaned up on
// unmount.
export default function Cat({ to, from, notes, footer, track }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  // The behaviour reads the latest notes through this, so the builder's preview picks up
  // edits without restarting the cat.
  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
  });
  // Unique per cat so the tail's pattern id never clashes; useId is stable between server and browser.
  const ditherId = "cat-dither-" + useId().replace(/[^a-zA-Z0-9_-]/g, "");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return startCat(root, () => notesRef.current, track);
  }, [track]);

  return (
    <div ref={rootRef} className="cat-scene">
      {/* Background: the corner of a room with light wallpaper, drawn in startCat (components/room.ts). */}
      <canvas className="cat-bg" aria-hidden="true"></canvas>
      {/* Pothos vines draped along the top, built and animated in startCat (components/vines.ts). */}
      <svg className="cat-vines" aria-hidden="true"></svg>
      {/* LASER POINTER — fixed top-right, below treat bag */}
      <div className="laser-btn" data-laser role="button" tabIndex={0} aria-label="Play with the laser pointer">
        <div className="laser-body"></div>
        <div className="laser-tip"></div>
        <div className="laser-emitter"></div>
        <span className="laser-hint">[ play ]</span>
      </div>

      {/* TREAT BAG — fixed top-right corner */}
      <div className="treat-bag" data-treat role="button" tabIndex={0} aria-label="Give the cat a treat">
        <div className="bag-knot"></div>
        <div className="bag-body">
          <span className="bag-icon">★</span>
          <span className="bag-label-text">TREATS</span>
        </div>
        <span className="bag-hint">[ treat ]</span>
      </div>

      <div className="stage">
        <div className="bubble-area">
          <div className="bubble" data-bubble aria-live="polite">
            <span data-bubble-text></span>
          </div>
        </div>

        <div className="cat-hover">
          <div className="cat-squish" data-squish role="button" tabIndex={0} aria-label="Pet the cat">
            <div className="css-cat">
              <div className="cat-cloud"></div>

              {/* Tail: one tapered curve, animated in startCat, filled with its shaded dither
                  texture (public/tex/tail.png, in the cat's own coordinates). */}
              <svg className="cat-tail" viewBox="0 0 300 340" aria-hidden="true">
                <defs>
                  <pattern id={ditherId} width="340" height="340" patternUnits="userSpaceOnUse">
                    <image
                      href="/tex/tail.png"
                      width="340"
                      height="340"
                      preserveAspectRatio="none"
                      style={{ imageRendering: "pixelated" }}
                    />
                  </pattern>
                </defs>
                <path className="cat-tail-path" d={tailPath(0)} fill={`url(#${ditherId})`} />
              </svg>

              <div className="cat-body">
                <div className="cat-stripe cat-stripe--1"></div>
                <div className="cat-stripe cat-stripe--2"></div>
                <div className="cat-stripe cat-stripe--3"></div>
                <div className="cat-stripe cat-stripe--4"></div>
                <div className="cat-belly"></div>
              </div>

              <div className="cat-paw cat-paw--l"></div>
              <div className="cat-paw cat-paw--r"></div>

              {/* Face group: ears + head animate together on treat catch */}
              <div className="cat-face-group">
                <div className="cat-ear cat-ear--l">
                  <div className="cat-ear-inner"></div>
                </div>
                <div className="cat-ear cat-ear--r">
                  <div className="cat-ear-inner"></div>
                </div>

                <div className="cat-head">
                  <div className="cat-head-stripe cat-head-stripe--c"></div>
                  <div className="cat-head-stripe cat-head-stripe--l"></div>
                  <div className="cat-head-stripe cat-head-stripe--r"></div>
                  <div className="cat-blush cat-blush--l"></div>
                  <div className="cat-blush cat-blush--r"></div>
                  {/* Eye bg rings (painted before eyes = behind eyes) */}
                  <div className="cat-eye-bg cat-eye-bg--l"></div>
                  <div className="cat-eye-bg cat-eye-bg--r"></div>
                  <div className="cat-eye-l"></div>
                  <div className="cat-eye-r"></div>
                  {/* Muzzle patch behind nose/mouth */}
                  <div className="cat-muzzle"></div>
                  <div className="cat-nose"></div>
                  <div className="cat-mouth"></div>
                  <div className="cat-whisker cat-whisker--l1"></div>
                  <div className="cat-whisker cat-whisker--l2"></div>
                  <div className="cat-whisker cat-whisker--l3"></div>
                  <div className="cat-whisker cat-whisker--r1"></div>
                  <div className="cat-whisker cat-whisker--r2"></div>
                  <div className="cat-whisker cat-whisker--r3"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="cat-label">[ pet the cat to receive love ]</p>
        {(from || to) && (
          <p className="cat-from">
            {from && to ? `a message from ${from} for ${to}` : from ? `a message from ${from}` : `a message for ${to}`}
          </p>
        )}
      </div>

      {footer && <div className="cat-footer">{footer}</div>}
    </div>
  );
}

/** Wires up the cat inside `root`. Returns a cleanup function. */
function startCat(root: HTMLElement, getNotes: () => string[], place?: Place): () => void {
  const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const cat = $(".css-cat");
  const face = $(".cat-face-group");
  const squish = $("[data-squish]");
  const treatBag = $("[data-treat]");
  const laserBtn = $("[data-laser]");
  const tail = $<SVGPathElement>(".cat-tail-path");
  const eyes: [HTMLElement, HTMLElement] = [$(".cat-eye-l"), $(".cat-eye-r")];

  // With "reduce motion" on, the idle animation stops: no flies, and the tail and vines
  // hold still. (CSS does the same for the breathing and other idle loops.)
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const timers = createTimers();
  const body = createBody({ root, cat, face, eyes, rings: [$(".cat-eye-bg--l"), $(".cat-eye-bg--r")] }, timers);
  const bubble = createBubble($("[data-bubble]"), $("[data-bubble-text]"), timers);
  const nextNote = createNoteBag(getNotes);
  const tracker = place ? createTracker(place) : null;
  if (place === "cat") tracker?.count("opened");
  const treat = createTreat(root, treatBag, $(".cat-mouth"), body, timers);
  const throwTreat = () => {
    tracker?.count("treat");
    treat();
  };
  const laser = createLaser(
    { root, button: laserBtn, cat, face, paws: [$(".cat-paw--l"), $(".cat-paw--r")] },
    body,
    timers,
    { started: () => tracker?.count("laser"), caught: () => tracker?.count("catch") },
  );

  function pet() {
    tracker?.count("pet");
    replay(squish, "squishing");
    bubble.show(nextNote());
  }

  // Now and then a fly buzzes around; the cat watches it and its tail goes wild. No flies
  // while the laser is on (a visiting fly leaves when it's turned on).
  const flies = createFlies({
    root,
    catRect: () => cat.getBoundingClientRect(),
    allowed: () => !reduceMotion && !laser.busy,
    onMove: (x, y) => {
      if (!laser.busy) body.lookAt(x, y);
    },
    onEnd: () => {
      if (!laser.busy) body.lookAhead();
    },
    later: timers.later,
  });

  // ---- TAIL AND VINES: one animation loop ----
  // The tail swishes, faster while the laser is on and wild while a fly is around; its
  // speed and size are eased so it never jumps. The vines' strand ends sway.
  const vines = createVines($<SVGSVGElement>(".cat-vines"), "vines-" + Math.random().toString(36).slice(2));
  let tailPhase = 0;
  let tailAmp: number = TAIL_SWISH.amplitude;
  let last = performance.now();
  let frame = requestAnimationFrame(function tick(now) {
    if (reduceMotion) {
      tail.setAttribute("d", tailPath(0, 0));
      vines.frame(0);
      return; // drawn once, still
    }
    const crazy = flies.active;
    const period = crazy ? TAIL_SWISH.crazyPeriodMs : laser.busy ? TAIL_SWISH.alertPeriodMs : TAIL_SWISH.periodMs;
    const dt = now - last;
    last = now;
    tailPhase += (dt / period) * Math.PI * 2;
    tailAmp += ((crazy ? TAIL_SWISH.crazyAmplitude : TAIL_SWISH.amplitude) - tailAmp) * Math.min(1, dt / 300);
    tail.setAttribute("d", tailPath(tailPhase, tailAmp));
    vines.frame(now);
    frame = requestAnimationFrame(tick);
  });

  // ---- BACKGROUND: redrawn when the scene changes size, lined up with the cat ----
  const bgCanvas = $<HTMLCanvasElement>(".cat-bg");
  const catBox = $(".cat-hover");
  let bgTimer: Timer | null = null;
  function drawBackground() {
    const scene = root.getBoundingClientRect();
    vines.layout(scene.width);
    if (reduceMotion) vines.frame(0); // the animation loop is off, so place them here
    const box = catBox.getBoundingClientRect();
    drawRoom(bgCanvas, scene.width, scene.height, {
      left: box.left - scene.left,
      top: box.top - scene.top,
      scale: box.width / 300,
    });
  }
  const resized = new ResizeObserver(() => {
    timers.cancel(bgTimer);
    bgTimer = timers.later(drawBackground, 60);
  });
  resized.observe(root);
  drawBackground();
  document.fonts?.ready.then(() => !timers.disposed && drawBackground()).catch(() => {});

  // ---- EVENTS ----
  // Clicking anywhere else, or Escape, hides the bubble.
  const onDocClick = (e: MouseEvent) => {
    if (bubble.visible && !(e.target as Element | null)?.closest("[data-squish], [data-bubble], [data-treat]")) {
      bubble.hide();
    }
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && bubble.visible) bubble.hide();
  };
  // The pet, treat and laser controls are role="button" elements: Enter and Space press them.
  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).click();
  };

  const events = new AbortController(); // aborting it removes every listener below
  const { signal } = events;
  squish.addEventListener("click", pet, { signal });
  treatBag.addEventListener("click", throwTreat, { signal });
  laserBtn.addEventListener("click", laser.onClick, { signal });
  for (const el of [squish, treatBag, laserBtn]) el.addEventListener("keydown", onButtonKey, { signal });
  document.addEventListener("click", onDocClick, { signal });
  // Tapping "send someone a cat" at the bottom.
  root.addEventListener(
    "click",
    (e) => {
      if ((e.target as Element).closest(".cat-footer a")) tracker?.count("cta");
    },
    { signal },
  );
  document.addEventListener("keydown", onKey, { signal });

  return () => {
    cancelAnimationFrame(frame);
    timers.dispose();
    flies.stop();
    laser.dispose();
    resized.disconnect();
    events.abort();
    tracker?.dispose();
    root
      .querySelectorAll(".treat-flying, .heart-particle, .star-particle, .laser-dot, .fly")
      .forEach((el) => el.remove());
  };
}
