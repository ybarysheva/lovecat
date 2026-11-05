import Link from "next/link";

export default function NotFound() {
  return (
    <main className="message-page">
      <h1>This cat wandered off</h1>
      <p>The link might be missing a few characters. Check that it was copied in full.</p>
      <Link className="btn" href="/make">
        Send someone a cat
      </Link>
    </main>
  );
}
