// Timers that all stop when the cat goes away (e.g. the builder's preview closes), so
// nothing keeps running or fires on a page that's gone.

export type Timer = ReturnType<typeof setTimeout>;
export type Later = (fn: () => void, ms: number) => Timer;

export function createTimers() {
  let disposed = false;
  const live = new Set<Timer>();

  const later: Later = (fn, ms) => {
    const t = setTimeout(() => {
      live.delete(t);
      if (!disposed) fn();
    }, ms);
    live.add(t);
    return t;
  };

  const cancel = (t: Timer | null) => {
    if (t === null) return;
    clearTimeout(t);
    live.delete(t);
  };

  const dispose = () => {
    disposed = true;
    live.forEach(clearTimeout);
    live.clear();
  };

  return {
    later,
    cancel,
    dispose,
    get disposed() {
      return disposed;
    },
  };
}

export type Timers = ReturnType<typeof createTimers>;

/** Restarts a CSS animation by removing its class, forcing a reflow, and adding it back. */
export function replay(el: Element, className: string, removeWhenDone = true) {
  el.classList.remove(className);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(className);
  if (removeWhenDone) el.addEventListener("animationend", () => el.classList.remove(className), { once: true });
}
