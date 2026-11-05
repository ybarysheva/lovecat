// Particles that pop up and float away in waves: hearts after a treat, stars after the
// laser catch.

import type { Later } from "./timers";

type Range = [number, number];

type Rising = {
  className: string;
  glyph: () => string;
  x: number; // where they start, with this much random spread around it
  y: number;
  jitterX: number;
  jitterY: number;
  size: Range; // font size, px
  spread: number; // how far they drift sideways, px either way
  rise: Range; // how far they float up, px
  spin: number; // degrees, either way
  durationMs: Range;
  pop: number; // how big they pop up to before shrinking away
  popAt: number; // fraction of the animation when they're biggest
};

const rand = ([a, b]: Range) => a + Math.random() * (b - a);

function spawn(root: HTMLElement, o: Rising) {
  const p = document.createElement("div");
  p.className = o.className;
  p.textContent = o.glyph();
  p.style.left = o.x + (Math.random() - 0.5) * o.jitterX + "px";
  p.style.top = o.y + (Math.random() - 0.5) * o.jitterY + "px";
  p.style.fontSize = rand(o.size) + "px";
  root.appendChild(p);

  const spread = (Math.random() - 0.5) * o.spread;
  const rise = rand(o.rise);
  const rot = (Math.random() - 0.5) * o.spin;
  p.animate(
    [
      { transform: "translate(-50%,-50%) scale(0) rotate(0deg)", opacity: 0, easing: "ease-out" },
      { transform: `translate(-50%,-50%) scale(${o.pop}) rotate(${rot * 0.3}deg)`, opacity: 1, offset: o.popAt },
      {
        // Still fully visible two thirds of the way up, so they're seen rising past the head.
        transform: `translate(calc(-50% + ${spread * 0.7}px), calc(-50% - ${rise * 0.7}px)) scale(0.95) rotate(${rot * 0.7}deg)`,
        opacity: 1,
        offset: 0.65,
      },
      { transform: `translate(calc(-50% + ${spread}px), calc(-50% - ${rise}px)) scale(0.7) rotate(${rot}deg)`, opacity: 0 },
    ],
    { duration: rand(o.durationMs), fill: "forwards" },
  )
    .finished.then(() => p.remove())
    .catch(() => p.remove());
}

/** `counts` particles per wave, waves 0.9s apart, particles within a wave 85ms apart. */
function spawnWaves(root: HTMLElement, later: Later, counts: number[], o: Rising) {
  counts.forEach((count, wave) => {
    later(() => {
      for (let i = 0; i < count; i++) later(() => spawn(root, o), i * 85);
    }, wave * 900);
  });
}

/** Hearts rising from around the cat's upper body and head. */
export function heartWaves(root: HTMLElement, later: Later, cat: DOMRect) {
  spawnWaves(root, later, [8, 7, 5, 4], {
    className: "heart-particle",
    glyph: () => (Math.random() > 0.38 ? "♥" : "♡"),
    x: cat.left + cat.width * 0.5,
    y: cat.top + cat.height * 0.38,
    jitterX: cat.width * 0.75,
    jitterY: cat.height * 0.38,
    size: [10, 28],
    spread: 170,
    rise: [55, 140],
    spin: 38,
    durationMs: [950, 1600],
    pop: 1.4,
    popAt: 0.18,
  });
}

const STARS = ["✦", "✧", "★", "✶"];

/** Stars rising from (x, y), floating up past the cat's head. `scale` is the cat's size. */
export function starWaves(root: HTMLElement, later: Later, x: number, y: number, scale: number) {
  spawnWaves(root, later, [10, 9, 7, 5], {
    className: "star-particle",
    glyph: () => STARS[Math.floor(Math.random() * STARS.length)],
    x,
    y,
    jitterX: 80 * scale,
    jitterY: 24 * scale,
    size: [12 * scale, 28 * scale],
    spread: 180 * scale,
    rise: [140 * scale, 270 * scale],
    spin: 90,
    durationMs: [1300, 2000],
    pop: 1.3,
    popAt: 0.15,
  });
}
