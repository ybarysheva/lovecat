// The cat's face and body reactions, shared by the treat, the laser and the fly: where its
// eyes look, its head tilt, and the happy state (eyes squint shut, purr vibration).

import { heartWaves } from "./particles";
import { replay, type Timer, type Timers } from "./timers";

const PUPIL_TRAVEL = 3; // px the pupils can move inside their light rings
const HAPPY_MS = 4000;

export type CatParts = {
  root: HTMLElement;
  cat: HTMLElement; // .css-cat, the 300×340 drawing
  face: HTMLElement; // ears and head, tilted together
  eyes: [HTMLElement, HTMLElement]; // left, right pupils
  rings: [HTMLElement, HTMLElement]; // the light rings around them
};

export function createBody({ root, cat, face, eyes, rings }: CatParts, { later, cancel }: Timers) {
  /** A point in the cat's own 300×340 drawing, in screen coordinates. */
  function point(cx: number, cy: number) {
    const r = cat.getBoundingClientRect();
    const scale = r.width / 300; // the cat is shrunk on short screens
    return { x: r.left + cx * scale, y: r.top + cy * scale, scale };
  }

  const centerX = () => point(150, 0).x;

  /** Tilt the head toward x, up to 9° either way. */
  function tiltHead(x: number) {
    const tilt = Math.max(-9, Math.min(9, (x - centerX()) * 0.04));
    face.style.transform = `rotate(${tilt}deg)`;
  }

  /** Move the pupils toward a point on screen. */
  function lookAt(x: number, y: number) {
    eyes.forEach((eye, i) => {
      const r = rings[i].getBoundingClientRect();
      const dx = x - (r.left + r.width / 2);
      const dy = y - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);
      if (dist < 0.5) {
        eye.style.translate = "";
        return;
      }
      // Full travel once the point is a little way off; less when it's right in front.
      const reach = Math.min(1, dist / 60) * PUPIL_TRAVEL;
      eye.style.translate = `${((dx / dist) * reach).toFixed(2)}px ${((dy / dist) * reach).toFixed(2)}px`;
    });
  }

  function lookAhead() {
    for (const eye of eyes) eye.style.translate = "";
  }

  let happyTimer: Timer | null = null;

  /** The reward after a treat or a catch: eyes squint shut and the body purr-vibrates for
   *  a few seconds, with hearts (the treat) or without (the catch brings its own stars). */
  function happy(withHearts: boolean) {
    if (happyTimer) {
      cancel(happyTimer);
      endHappy();
    }
    for (const eye of eyes) replay(eye, "eyes-purring", false);
    cat.classList.add("cat-purring");
    if (withHearts) heartWaves(root, later, cat.getBoundingClientRect());
    happyTimer = later(() => {
      endHappy();
      happyTimer = null;
    }, HAPPY_MS);
  }

  function endHappy() {
    cat.classList.remove("cat-purring");
    for (const eye of eyes) eye.classList.remove("eyes-purring");
  }

  return { point, centerX, tiltHead, lookAt, lookAhead, happy };
}

export type Body = ReturnType<typeof createBody>;
