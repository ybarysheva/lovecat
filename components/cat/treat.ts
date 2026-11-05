// The treat bag: a treat arcs from the bag into the cat's mouth, the mouth snaps open to
// catch it, and the cat is happy.

import type { Body } from "./body";
import { replay, type Timers } from "./timers";

const FLIGHT_MS = 720;

export function createTreat(root: HTMLElement, bag: HTMLElement, mouth: HTMLElement, body: Body, timers: Timers) {
  return function throwTreat() {
    if (bag.classList.contains("throwing")) return; // one in flight at a time
    bag.classList.add("throwing");

    const from = bag.getBoundingClientRect();
    const to = mouth.getBoundingClientRect();
    const startX = from.left + from.width / 2;
    const startY = from.top + from.height / 2;
    const dx = to.left + to.width / 2 - startX;
    const dy = to.top + to.height / 2 - startY;

    const treat = document.createElement("div");
    treat.className = "treat-flying";
    treat.style.left = startX + "px";
    treat.style.top = startY + "px";
    root.appendChild(treat);

    // A parabolic arc: eases out to the top, eases in to the mouth.
    const flight = treat.animate(
      [
        { transform: "translate(-50%, -50%) scale(1)", opacity: 1, easing: "ease-out" },
        {
          transform: `translate(calc(-50% + ${dx * 0.42}px), calc(-50% - 68px)) scale(1.35)`,
          offset: 0.35,
          opacity: 1,
          easing: "ease-in",
        },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.65)`, opacity: 0.85 },
      ],
      { duration: FLIGHT_MS, fill: "forwards" },
    );

    // The mouth opens just before the treat arrives.
    timers.later(() => replay(mouth, "open"), Math.round(FLIGHT_MS * 0.68));

    flight.finished
      .then(() => {
        treat.remove();
        bag.classList.remove("throwing");
        if (!timers.disposed) body.happy(true);
      })
      .catch(() => treat.remove());
  };
}
