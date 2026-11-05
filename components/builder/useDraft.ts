// The cat being made, kept in the browser so a refresh doesn't lose it. Storage is a
// convenience: if it's unavailable (private mode etc.) the builder just works without it.

import { useSyncExternalStore } from "react";

export type Draft = { to: string; from: string; notes: string[] };

const KEY = "send-a-cat:draft";
export const EMPTY_DRAFT: Draft = { to: "", from: "", notes: [] };

function load(): Draft {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_DRAFT;
    const d = JSON.parse(raw) as Partial<Draft>;
    return {
      to: typeof d.to === "string" ? d.to : "",
      from: typeof d.from === "string" ? d.from : "",
      notes: Array.isArray(d.notes) ? d.notes.filter((n) => typeof n === "string") : [],
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

// A tiny store: the current draft (read from storage once), and who to tell when it changes.
let current: Draft | null = null;
const listeners = new Set<() => void>();

const read = () => (current ??= load());
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

function write(next: Draft) {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((fn) => fn());
}

export function clearDraft() {
  write(EMPTY_DRAFT);
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/** The draft and a setter, like useState. The server renders an empty draft; the browser
 *  then shows the saved one. */
export function useDraft() {
  const draft = useSyncExternalStore(subscribe, read, () => EMPTY_DRAFT);
  const setDraft = (next: Draft | ((d: Draft) => Draft)) => write(typeof next === "function" ? next(read()) : next);
  return [draft, setDraft] as const;
}
