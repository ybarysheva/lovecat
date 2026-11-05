// The speech bubble and the notes it shows when the cat is petted.

import type { Timer, Timers } from "./timers";

const SHOW_MS = 5500;
const LONG_NOTE = 90; // characters; longer notes get smaller text so they fit above the cat

/**
 * A shuffle-bag of notes: each is shown once before any repeats, and the last one shown
 * never comes up first after a reshuffle. `getNotes` is read every time, so the builder's
 * preview picks up notes added or removed while it's open.
 */
export function createNoteBag(getNotes: () => string[]) {
  let bag: string[] = [];
  let last: string | null = null;

  return function next(): string {
    const notes = getNotes();
    bag = bag.filter((n) => notes.includes(n));
    if (bag.length === 0) {
      bag = [...notes];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag.length > 1 && bag[bag.length - 1] === last) {
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
    }
    last = bag.pop() ?? "";
    return last;
  };
}

export function createBubble(bubble: HTMLElement, text: HTMLElement, { later, cancel }: Timers) {
  let hideTimer: Timer | null = null;
  let visible = false;

  function show(note: string) {
    text.textContent = note;
    bubble.className = note.length > LONG_NOTE ? "bubble bubble--long" : "bubble";
    void bubble.offsetWidth; // restart the pop-in animation
    bubble.classList.add("show");
    visible = true;
    cancel(hideTimer);
    hideTimer = later(hide, SHOW_MS);
  }

  function hide() {
    cancel(hideTimer);
    hideTimer = null;
    bubble.classList.remove("show");
    bubble.classList.add("hide");
    visible = false;
    later(() => bubble.classList.remove("hide"), 220);
  }

  return { show, hide, get visible() { return visible; } };
}
