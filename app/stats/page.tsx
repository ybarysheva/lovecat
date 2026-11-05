import { timingSafeEqual } from "node:crypto";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readStats } from "@/lib/stats-store";

// Private counts: /stats?key=<STATS_KEY>. Without the right key it's a plain 404.
// Traffic (visits, where people came from, devices) is in Vercel Analytics instead.

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Stats · send-a-cat", robots: { index: false, follow: false } };

function allowed(key: string | undefined) {
  const secret = process.env.STATS_KEY;
  if (!secret) return !process.env.VERCEL; // no key set: open in local dev only
  const a = Buffer.from(key ?? "");
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  if (!allowed((await searchParams).key)) notFound();
  const { dates, rows } = await readStats(14);
  const day = (d: string) =>
    new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <main className="builder stats">
      <h1>Stats</h1>
      <p className="lede">
        All-time totals and each day (UTC), newest first, up to 14 days. Visits and traffic sources are in Vercel
        Analytics.
      </p>
      <div className="stats-table">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Total</th>
              {dates.map((d) => (
                <th key={d}>{day(d)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th>{r.label}</th>
                <td className="total">{r.total}</td>
                {r.days.map((n, i) => (
                  <td key={dates[i]}>{n || ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
