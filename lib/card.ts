// Shared by the builder (browser) and the API (server): the shape of a cat and its limits.

export type Card = {
  id: string;
  to: string;
  from: string | null;
  notes: string[];
  createdAt: string;
};

export type CardInput = Pick<Card, "to" | "from" | "notes">;

export const LIMITS = {
  name: 40,
  note: 200,
  minNotes: 1,
  maxNotes: 50,
} as const;

/** Collapses runs of whitespace and trims, so "  hi \n there " becomes "hi there". */
export function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Checks and tidies a new cat. Returns the cleaned input, or a readable error.
 * The API runs this on everything it stores; the builder runs it to show errors early.
 */
export function validateCard(raw: unknown): { ok: true; card: CardInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "Missing cat details." };
  const { to, from, notes } = raw as Record<string, unknown>;

  if (typeof to !== "string" || !clean(to)) return { ok: false, error: "Add who the cat is for." };
  const toClean = clean(to);
  if (toClean.length > LIMITS.name) {
    return { ok: false, error: `Keep the name under ${LIMITS.name} characters.` };
  }

  let fromClean: string | null = null;
  if (from !== undefined && from !== null) {
    if (typeof from !== "string") return { ok: false, error: "The sender name isn't valid." };
    fromClean = clean(from) || null;
    if (fromClean && fromClean.length > LIMITS.name) {
      return { ok: false, error: `Keep your name under ${LIMITS.name} characters.` };
    }
  }

  if (!Array.isArray(notes)) return { ok: false, error: "Add at least one note." };
  const seen = new Set<string>();
  const notesClean: string[] = [];
  for (const note of notes) {
    if (typeof note !== "string") return { ok: false, error: "One of the notes isn't valid." };
    const text = clean(note);
    if (!text || seen.has(text)) continue;
    if (text.length > LIMITS.note) {
      return { ok: false, error: `Each note can be up to ${LIMITS.note} characters.` };
    }
    seen.add(text);
    notesClean.push(text);
  }
  if (notesClean.length < LIMITS.minNotes) return { ok: false, error: "Add at least one note." };
  if (notesClean.length > LIMITS.maxNotes) {
    return { ok: false, error: `A cat can hold up to ${LIMITS.maxNotes} notes.` };
  }

  return { ok: true, card: { to: toClean, from: fromClean, notes: notesClean } };
}
