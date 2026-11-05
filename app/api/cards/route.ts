import { validateCard } from "@/lib/card";
import { createCard } from "@/lib/cards";
import { StorageNotConfiguredError } from "@/lib/kv";
import { overLimit } from "@/lib/rate-limit";
import { recordCreated } from "@/lib/stats-store";

const CATS_PER_MINUTE = 10;
const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

function error(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: NO_STORE });
}

export async function POST(req: Request) {
  try {
    if (await overLimit(req, "cards", CATS_PER_MINUTE)) {
      return error("That's a lot of cats in one minute. Wait a moment and try again.", 429);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return error("The request isn't valid JSON.", 400);
    }
    const result = validateCard(body);
    if (!result.ok) {
      return Response.json({ error: result.error, errors: result.errors }, { status: 400, headers: NO_STORE });
    }

    // A content check (e.g. an AI abuse filter) would go here, before anything is stored.

    const card = await createCard(result.card);
    await recordCreated().catch((e) => console.error("stats", e)); // counting must never block a cat
    return Response.json({ id: card.id }, { status: 201, headers: NO_STORE });
  } catch (e) {
    if (e instanceof StorageNotConfiguredError) return error(e.message, 503);
    console.error(e);
    return error("Something went wrong on the server. Try again.", 500);
  }
}
