import { ImageResponse } from "next/og";

// The link preview image (1200×630) shown when a link is pasted into a chat.
export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#1C1410";
const PAPER = "#D4C5A9";

/** A simple ink cat face, drawn as SVG so the image needs no external assets. */
function CatFace() {
  return (
    <svg width="260" height="230" viewBox="0 0 130 115">
      <polygon points="14,48 26,4 52,30" fill={INK} />
      <polygon points="116,48 104,4 78,30" fill={INK} />
      <ellipse cx="65" cy="65" rx="58" ry="50" fill={INK} />
      <circle cx="40" cy="58" r="11" fill={PAPER} />
      <circle cx="90" cy="58" r="11" fill={PAPER} />
      <circle cx="40" cy="58" r="7" fill={INK} />
      <circle cx="90" cy="58" r="7" fill={INK} />
      <circle cx="42" cy="55" r="2.5" fill={PAPER} />
      <circle cx="92" cy="55" r="2.5" fill={PAPER} />
      <polygon points="65,76 58,70 72,70" fill={PAPER} />
      <path d="M57 82 Q65 90 73 82" stroke={PAPER} strokeWidth="2.5" fill="none" />
      <line x1="2" y1="72" x2="34" y2="76" stroke={PAPER} strokeWidth="1.5" />
      <line x1="2" y1="84" x2="34" y2="82" stroke={PAPER} strokeWidth="1.5" />
      <line x1="128" y1="72" x2="96" y2="76" stroke={PAPER} strokeWidth="1.5" />
      <line x1="128" y1="84" x2="96" y2="82" stroke={PAPER} strokeWidth="1.5" />
    </svg>
  );
}

export function ogImage(title: string, subtitle: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: "0 96px",
          background: PAPER,
          color: INK,
          fontFamily: "monospace",
        }}
      >
        <CatFace />
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
          <div style={{ fontSize: 32, opacity: 0.7 }}>{subtitle}</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
