"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Cat from "./Cat";
import { clean, LIMITS, validateCard, type FieldErrors } from "@/lib/card";
import { STARTER_NOTES } from "@/lib/starter-notes";

type Draft = { to: string; from: string; notes: string[] };

const DRAFT_KEY = "send-a-cat:draft";
const OLD_DRAFT_KEY = "lovecat:draft"; // from before the rename; read once so a draft in progress isn't lost
const EMPTY: Draft = { to: "", from: "", notes: [] };

// The draft is a per-browser convenience, so storage failures (private mode etc.) are ignored.
function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY) ?? localStorage.getItem(OLD_DRAFT_KEY);
    if (!raw) return EMPTY;
    const d = JSON.parse(raw) as Partial<Draft>;
    return {
      to: typeof d.to === "string" ? d.to : "",
      from: typeof d.from === "string" ? d.from : "",
      notes: Array.isArray(d.notes) ? d.notes.filter((n) => typeof n === "string") : [],
    };
  } catch {
    return EMPTY;
  }
}
function saveDraft(d: Draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {}
}
function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(OLD_DRAFT_KEY);
  } catch {}
}

export default function Builder() {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [writing, setWriting] = useState("");
  // Errors about one field are shown under that field; `error` is for everything else
  // (connection, server, copy), shown by the Create link button.
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors & { write?: string }>({});
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const toRef = useRef<HTMLInputElement>(null);
  const fromRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setDraft(loadDraft());
    setLoaded(true);
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (loaded) saveDraft(draft);
  }, [draft, loaded]);

  // No page scrolling behind the full-screen preview.
  useEffect(() => {
    if (!preview) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [preview]);

  const update = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
    // Changing a field clears its error.
    setFieldErrors((f) => ({
      ...f,
      ...("to" in patch && { to: undefined }),
      ...("from" in patch && { from: undefined }),
      ...("notes" in patch && { notes: undefined, write: undefined }),
    }));
  };

  /** Shows field errors and takes the person to the first one. */
  const showFieldErrors = (errors: FieldErrors & { write?: string }) => {
    setFieldErrors(errors);
    if (errors.to) toRef.current?.focus();
    else if (errors.from) fromRef.current?.focus();
    else if (errors.notes || errors.write) notesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const full = draft.notes.length >= LIMITS.maxNotes;
  const has = (text: string) => draft.notes.includes(text);

  const toggle = (text: string) =>
    update({ notes: has(text) ? draft.notes.filter((n) => n !== text) : [...draft.notes, text] });

  const remove = (text: string) => update({ notes: draft.notes.filter((n) => n !== text) });

  const addWritten = () => {
    const text = clean(writing);
    if (!text) return;
    if (text.length > LIMITS.note) {
      setFieldErrors((f) => ({ ...f, write: `Each note can be up to ${LIMITS.note} characters.` }));
      return;
    }
    if (full) {
      setFieldErrors((f) => ({ ...f, write: `A cat can hold up to ${LIMITS.maxNotes} notes.` }));
      return;
    }
    if (!has(text)) update({ notes: [...draft.notes, text] });
    setWriting("");
  };

  const check = () => {
    const result = validateCard({ to: draft.to, from: draft.from, notes: draft.notes });
    if (!result.ok) showFieldErrors(result.errors);
    return result;
  };

  const openPreview = () => {
    if (draft.notes.length === 0) {
      showFieldErrors({ notes: "Add at least one note to preview the cat." });
      return;
    }
    setPreview(true);
  };

  const create = async () => {
    const result = check();
    if (!result.ok) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.card),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string; errors?: FieldErrors };
      if (body.errors && Object.values(body.errors).some(Boolean)) {
        showFieldErrors(body.errors);
        return;
      }
      if (!res.ok || !body.id) throw new Error(body.error || "Couldn't create the link. Try again.");
      setLink(`${window.location.origin}/c/${body.id}`);
      setCopied(false);
      clearDraft();
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "Couldn't reach the server. Check your connection and try again.");
    } finally {
      setCreating(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Press and hold the link to copy it.");
    }
  };

  const share = async () => {
    if (!link) return;
    const name = clean(draft.to);
    try {
      await navigator.share({ title: name ? `A cat for ${name}` : "A cat for you", url: link });
    } catch {
      // Cancelled or unsupported: nothing to do.
    }
  };

  const startOver = () => {
    setLink(null);
    setDraft(EMPTY);
    setWriting("");
    setError(null);
    setFieldErrors({});
  };

  if (link) {
    const name = clean(draft.to);
    return (
      <main className="builder">
        <p className="brand">
          <Link href="/">[ send-a-cat ]</Link>
        </p>
        <section className="panel result" aria-live="polite">
          <h2>{name ? `${name}'s cat is ready` : "Your cat is ready"}</h2>
          <p className="hint">Send this link. Anyone with it can pet the cat and read the notes.</p>
          <output className="link-box">{link}</output>
          <div className="result-row">
            <button type="button" className="btn btn-primary" onClick={copy}>
              {copied ? "Copied ✓" : "Copy link"}
            </button>
            {canShare && (
              <button type="button" className="btn" onClick={share}>
                Share…
              </button>
            )}
            <a className="btn" href={link} target="_blank" rel="noopener">
              Open
            </a>
          </div>
          {error && <p className="error" style={{ marginTop: 10 }}>{error}</p>}
          <div className="again">
            <button type="button" className="linkish" onClick={startOver}>
              Make another cat
            </button>
          </div>
        </section>
      </main>
    );
  }

  const previewTo = clean(draft.to) || null;
  const previewFrom = clean(draft.from) || null;

  return (
    <>
      <main className="builder">
        <p className="brand">
          <Link href="/">[ send-a-cat ]</Link>
        </p>
        <h1>Send someone a cat that says nice things</h1>
        <p className="lede">
          Pick some messages or write your own.
        </p>

        <section className="panel">
          <h2>Who&apos;s it for?</h2>
          <label className="field">
            <span className="field-label">Their name</span>
            <input
              ref={toRef}
              className={fieldErrors.to ? "input invalid" : "input"}
              aria-invalid={!!fieldErrors.to}
              aria-describedby={fieldErrors.to ? "to-error" : undefined}
              value={draft.to}
              onChange={(e) => update({ to: e.target.value })}
              maxLength={LIMITS.name}
              autoComplete="off"
            />
            {fieldErrors.to && (
              <span className="field-error" id="to-error">
                {fieldErrors.to}
              </span>
            )}
          </label>
          <label className="field">
            <span className="field-label">
              Your name <span className="optional">(optional)</span>
            </span>
            <input
              ref={fromRef}
              className={fieldErrors.from ? "input invalid" : "input"}
              aria-invalid={!!fieldErrors.from}
              aria-describedby={fieldErrors.from ? "from-error" : undefined}
              value={draft.from}
              onChange={(e) => update({ from: e.target.value })}
              maxLength={LIMITS.name}
              autoComplete="off"
            />
            {fieldErrors.from && (
              <span className="field-error" id="from-error">
                {fieldErrors.from}
              </span>
            )}
          </label>
        </section>

        <section
          ref={notesRef}
          className={fieldErrors.notes ? "panel invalid" : "panel"}
          aria-describedby={fieldErrors.notes ? "notes-error" : undefined}
        >
          <h2>
            Your notes{" "}
            <span className="count">
              ({draft.notes.length}/{LIMITS.maxNotes})
            </span>
          </h2>
          <form
            className="write-row"
            onSubmit={(e) => {
              e.preventDefault();
              addWritten();
            }}
          >
            <label className="sr-only" htmlFor="write">
              Write a note
            </label>
            <textarea
              id="write"
              className={fieldErrors.write ? "input invalid" : "input"}
              aria-invalid={!!fieldErrors.write}
              aria-describedby={fieldErrors.write ? "write-error" : undefined}
              value={writing}
              onChange={(e) => {
                setWriting(e.target.value);
                setFieldErrors((f) => ({ ...f, write: undefined }));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  addWritten();
                }
              }}
              maxLength={LIMITS.note}
              rows={2}
              placeholder="Write your own note…"
            />
            <button type="submit" className="btn" disabled={!clean(writing) || full}>
              Add
            </button>
          </form>
          {fieldErrors.notes && (
            <p className="field-error" id="notes-error" role="alert">
              {fieldErrors.notes}
            </p>
          )}
          {fieldErrors.write && (
            <p className="field-error" id="write-error">
              {fieldErrors.write}
            </p>
          )}
          {writing.length > LIMITS.note - 40 && (
            <p className="hint">
              {writing.length}/{LIMITS.note}
            </p>
          )}

          {draft.notes.length === 0 ? (
            <p className="empty">No notes yet. Write one above or pick some below.</p>
          ) : (
            <ul className="my-notes">
              {draft.notes.map((note) => (
                <li key={note} className="my-note">
                  <span>{note}</span>
                  <button type="button" className="remove" onClick={() => remove(note)} aria-label={`Remove “${note}”`}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>Or pick some</h2>
          {STARTER_NOTES.map((group) => (
            <div key={group.group} className="group">
              <p className="group-title">{group.group}</p>
              <div className="chips">
                {group.notes.map((note) => {
                  const on = has(note);
                  return (
                    <button
                      key={note}
                      type="button"
                      className="chip"
                      aria-pressed={on}
                      disabled={!on && full}
                      onClick={() => toggle(note)}
                    >
                      {note}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        <p className="fineprint">
          Your cat is saved so the link works. Anyone with the link can see it, so don&apos;t put anything in a note
          you wouldn&apos;t want forwarded.
        </p>
      </main>

      <div className="actions">
        <div className="actions-inner">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="actions-row">
            <button type="button" className="btn" onClick={openPreview}>
              Preview
            </button>
            <button type="button" className="btn btn-primary" onClick={create} disabled={creating}>
              {creating ? "Creating…" : "Create link"}
            </button>
          </div>
        </div>
      </div>

      {preview && (
        <div className="preview" role="dialog" aria-modal="true" aria-label="Preview of your cat">
          <Cat
            to={previewTo}
            from={previewFrom}
            notes={draft.notes}
            footer={
              <button type="button" onClick={() => setPreview(false)}>
                ← back to editing
              </button>
            }
          />
        </div>
      )}
    </>
  );
}
