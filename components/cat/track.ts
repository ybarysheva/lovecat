// Counts what people do with a cat (pets, treats, the laser...) and reports the tallies to
// /api/stats in batches: every 10 seconds while there's something new, and when the page
// is hidden or closed. Only numbers are sent, never names or messages.

import type { CatEvent, Counts, Place } from "@/lib/stats";

const FLUSH_MS = 10_000;

export function createTracker(place: Place) {
  let pending: Counts = {};
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flush() {
    if (timer) clearTimeout(timer);
    timer = null;
    if (Object.keys(pending).length === 0) return;
    const body = JSON.stringify({ place, counts: pending });
    pending = {};
    // sendBeacon survives the page closing; fetch with keepalive is the fallback.
    if (!navigator.sendBeacon?.("/api/stats", body)) {
      fetch("/api/stats", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  }

  function count(event: CatEvent) {
    pending[event] = (pending[event] ?? 0) + 1;
    timer ??= setTimeout(flush, FLUSH_MS);
  }

  const onHide = () => {
    if (document.visibilityState === "hidden") flush();
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", flush);

  return {
    count,
    /** Sends anything still pending and stops listening. */
    dispose() {
      flush();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
    },
  };
}
