"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

type Props = {
  link: string;
  /** The recipient's name, for the heading and the share title. */
  name: string;
  onAnother: () => void;
};

/** Shown once the cat's link is made: copy it, share it, or open it. */
export default function ReadyScreen({ link, name, onAnother }: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Phones can open their share sheet; the server and most desktops can't.
  const canShare = useSyncExternalStore(
    noSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Couldn't copy. Press and hold the link to copy it.");
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: name ? `A cat for ${name}` : "A cat for you", url: link });
    } catch {
      // Cancelled or unsupported: nothing to do.
    }
  };

  return (
    <main className="builder">
      <p className="brand">
        <Link href="/">[ send-a-cat ]</Link>
      </p>
      <section className="panel result" aria-live="polite">
        <h2>{name ? `${name}'s cat is ready` : "Your cat is ready"}</h2>
        <p className="hint">Anyone with this link can pet the cat and see the messages.</p>
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
        {error && <p className="error result-error">{error}</p>}
        <div className="again">
          <button type="button" className="linkish" onClick={onAnother}>
            Send another cat
          </button>
        </div>
      </section>
    </main>
  );
}
