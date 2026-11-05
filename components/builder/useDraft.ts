// The cat being made, kept in the browser so a refresh doesn't lose it. Storage is a
// convenience: if it's unavailable (private mode etc.) the builder just works without it.

import { useEffect, useState } from "react";

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

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/** The draft, loaded after the first render (storage isn't there during server rendering)
 *  and saved on every change. */
export function useDraft() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setDraft(load());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(draft));
    } catch {}
  }, [draft, loaded]);

  return [draft, setDraft] as const;
}
