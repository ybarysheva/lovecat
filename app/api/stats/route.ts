import { PLACES, type Place } from "@/lib/stats";
import { recordCatEvents } from "@/lib/stats-store";
import { overLimit } from "@/lib/rate-limit";

// Receives batched counts from the cat page (see components/cat/track.ts). Always answers
// 204: counting is best-effort and the visitor never sees it.
export async function POST(req: Request) {
  try {
    if (await overLimit(req, "stats", 30)) return new Response(null, { status: 204 });
    const body = JSON.parse(await req.text()) as { place?: unknown; counts?: unknown };
    if (PLACES.includes(body.place as Place) && typeof body.counts === "object" && body.counts) {
      await recordCatEvents(body.place as Place, body.counts as Record<string, number>);
    }
  } catch (e) {
    console.error("stats", e);
  }
  return new Response(null, { status: 204 });
}
