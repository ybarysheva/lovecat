"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Cat from "./Cat";
import { clean, LIMITS, validateCard } from "@/lib/card";
import { STARTER_NOTES } from "@/lib/starter-notes";

type Draft = { to: string; from: string; notes: string[] };

const DRAFT_KEY = "lovecat:draft";
const EMPTY: Draft = { to: "", from: "", notes: [] };

// The draft is a per-browser convenience, so storage failures (private mode etc.) are ignored.
function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
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
  } catch {}
}

export default function Builder() {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [writing, setWriting] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const toRef = useRef<HTMLInputElement>(null);

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
      setError(`Each note can be up to ${LIMITS.note} characters.`);
      return;
    }
    if (full) {
      setError(`A cat can hold up to ${LIMITS.maxNotes} notes.`);
      return;
    }
    if (!has(text)) update({ notes: [...draft.notes, text] });
    setWriting("");
  };

  const check = () => {
    const result = validateCard({ to: draft.to, from: draft.from, notes: draft.notes });
    if (!result.ok) {
      setError(result.error);
      if (!clean(draft.to)) toRef.current?.focus();
    }
    return result;
  };

  const openPreview = () => {
    if (draft.notes.length === 0) {
      setError("Add at least one note to preview the cat.");
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
      const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
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
  };

  if (link) {
    const name = clean(draft.to);
    return (
      <main className="builder">
        <p className="brand">
          <Link href="/">[ lovecat ]</Link>
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
          <Link href="/">[ lovecat ]</Link>
        </p>
        <h1>Send someone a cat that says nice things</h1>
        <p className="lede">
          Pick some notes or write your own. They pet the cat, and the cat tells them one at a time.
        </p>

        <section className="panel">
          <h2>Who&apos;s it for?</h2>
          <label className="field">
            <span className="field-label">Their name</span>
            <input
              ref={toRef}
              className="input"
              value={draft.to}
              onChange={(e) => update({ to: e.target.value })}
              maxLength={LIMITS.name}
              placeholder="Alex"
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span className="field-label">
              Your name <span className="optional">(optional)</span>
            </span>
            <input
              className="input"
              value={draft.from}
              onChange={(e) => update({ from: e.target.value })}
              maxLength={LIMITS.name}
              placeholder="Sam"
              autoComplete="off"
            />
          </label>
        </section>

        <section className="panel">
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
              className="input"
              value={writing}
              onChange={(e) => setWriting(e.target.value)}
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
