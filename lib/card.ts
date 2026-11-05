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

export type CardField = "to" | "from" | "notes";
export type FieldErrors = Partial<Record<CardField, string>>;

/**
 * Checks and tidies a new cat. Returns the cleaned input, or readable errors: one per
 * field that has a problem (so the builder can show each under its field), plus the
 * first of them as `error`. The API runs this on everything it stores; the builder
 * runs it to show errors early.
 */
export function validateCard(
  raw: unknown,
): { ok: true; card: CardInput } | { ok: false; error: string; errors: FieldErrors } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Missing cat details.", errors: {} };
  }
  const { to, from, notes } = raw as Record<string, unknown>;
  const errors: FieldErrors = {};

  const toClean = typeof to === "string" ? clean(to) : "";
  if (!toClean) errors.to = "Add who the cat is for.";
  else if (toClean.length > LIMITS.name) errors.to = `Keep the name under ${LIMITS.name} characters.`;

  let fromClean: string | null = null;
  if (from !== undefined && from !== null) {
    if (typeof from !== "string") errors.from = "The sender name isn't valid.";
    else {
      fromClean = clean(from) || null;
      if (fromClean && fromClean.length > LIMITS.name) {
        errors.from = `Keep your name under ${LIMITS.name} characters.`;
      }
    }
  }

  const seen = new Set<string>();
  const notesClean: string[] = [];
  if (!Array.isArray(notes)) errors.notes = "Add at least one note.";
  else {
    for (const note of notes) {
      if (typeof note !== "string") {
        errors.notes = "One of the notes isn't valid.";
        break;
      }
      const text = clean(note);
      if (!text || seen.has(text)) continue;
      if (text.length > LIMITS.note) {
        errors.notes = `Each note can be up to ${LIMITS.note} characters.`;
        break;
      }
      seen.add(text);
      notesClean.push(text);
    }
    if (!errors.notes && notesClean.length < LIMITS.minNotes) errors.notes = "Add at least one note.";
    if (!errors.notes && notesClean.length > LIMITS.maxNotes) {
      errors.notes = `A cat can hold up to ${LIMITS.maxNotes} notes.`;
    }
  }

  const first = errors.to ?? errors.from ?? errors.notes;
  if (first) return { ok: false, error: first, errors };
  return { ok: true, card: { to: toClean, from: fromClean, notes: notesClean } };
}
