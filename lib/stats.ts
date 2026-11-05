// What's counted, shared by the browser (which reports it) and the server (which stores it).
// Only counts: never names, messages or anything else typed in.

/** Where an event happened: the demo cat on the home page, or a cat someone was sent. */
export const PLACES = ["home", "cat"] as const;
export type Place = (typeof PLACES)[number];

/** Things people do with a cat. "cta" is tapping "send someone a cat". */
export const CAT_EVENTS = ["opened", "pet", "treat", "laser", "catch", "cta"] as const;
export type CatEvent = (typeof CAT_EVENTS)[number];

export type Counts = Partial<Record<CatEvent, number>>;

/** Most of one event a single report can add, so a bad actor can't inflate counts much. */
export const MAX_PER_REPORT = 200;

/** Today's date (UTC) as yyyy-mm-dd, the key for daily counts. */
export const today = (d = new Date()) => d.toISOString().slice(0, 10);
