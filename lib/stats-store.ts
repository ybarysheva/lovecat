// Server side of the counters: stored in the same database as the cats, as plain numbers
// under stats:… keys, an all-time total and a per-day count for each.

import { getKV } from "./kv";
import { CAT_EVENTS, MAX_PER_REPORT, PLACES, today, type CatEvent, type Counts, type Place } from "./stats";

const totalKey = (event: string, place: string) => `stats:total:${event}:${place}`;
const dayKey = (date: string, event: string, place: string) => `stats:day:${date}:${event}:${place}`;

/** Adds counts for things done with a cat. Unknown events and silly amounts are ignored. */
export async function recordCatEvents(place: Place, counts: Counts) {
  const date = today();
  const changes: [string, number][] = [];
  for (const event of CAT_EVENTS) {
    const n = Math.min(MAX_PER_REPORT, Math.floor(Number(counts[event]) || 0));
    if (n <= 0) continue;
    changes.push([totalKey(event, place), n], [dayKey(date, event, place), n]);
  }
  await getKV().incrMany(changes);
}

/** Counts one cat created in the builder. */
export async function recordCreated() {
  await getKV().incrMany([
    [totalKey("created", "builder"), 1],
    [dayKey(today(), "created", "builder"), 1],
  ]);
}

export type StatsRow = { label: string; total: number; days: number[] };

/** Totals and the last `days` days for every counter, newest day first. */
export async function readStats(days = 14) {
  const dates = Array.from({ length: days }, (_, i) => today(new Date(Date.now() - i * 86_400_000)));
  const series: { label: string; event: string; place: string }[] = [
    { label: "Cats created", event: "created", place: "builder" },
    ...PLACES.flatMap((place) =>
      CAT_EVENTS.map((event: CatEvent) => ({ label: `${LABELS[event]} (${PLACE_LABELS[place]})`, event, place })),
    ).filter((s) => !(s.event === "opened" && s.place === "home")), // home visits are in Vercel Analytics
  ];

  const keys = series.flatMap((s) => [totalKey(s.event, s.place), ...dates.map((d) => dayKey(d, s.event, s.place))]);
  const values = (await getKV().getMany(keys)).map((v) => Number(v ?? 0));

  const per = 1 + dates.length;
  const rows: StatsRow[] = series.map((s, i) => ({
    label: s.label,
    total: values[i * per],
    days: values.slice(i * per + 1, (i + 1) * per),
  }));
  return { dates, rows };
}

const LABELS: Record<CatEvent, string> = {
  opened: "Cat links opened",
  pet: "Pets",
  treat: "Treats",
  laser: "Laser turned on",
  catch: "Laser catches",
  cta: "Tapped “send someone a cat”",
};
const PLACE_LABELS: Record<Place, string> = { home: "demo cat", cat: "sent cats" };
