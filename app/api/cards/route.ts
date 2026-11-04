import { validateCard } from "@/lib/card";
import { createCard } from "@/lib/cards";
import { getKV, StorageNotConfiguredError } from "@/lib/kv";

const CATS_PER_MINUTE = 10;
const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

function error(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: NO_STORE });
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export async function POST(req: Request) {
  try {
    // Fixed one-minute window per IP, counted in the store so it holds across serverless instances.
    const minute = Math.floor(Date.now() / 60_000);
    const count = await getKV().incrWithExpiry(`rl:${clientIp(req)}:${minute}`, 70);
    if (count > CATS_PER_MINUTE) {
      return error("That's a lot of cats in one minute. Wait a moment and try again.", 429);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return error("The request isn't valid JSON.", 400);
    }
    const result = validateCard(body);
    if (!result.ok) return error(result.error, 400);

    // A content check (e.g. an AI abuse filter) would go here, before anything is stored.

    const card = await createCard(result.card);
    return Response.json({ id: card.id }, { status: 201, headers: NO_STORE });
  } catch (e) {
    if (e instanceof StorageNotConfiguredError) return error(e.message, 503);
    console.error(e);
    return error("Something went wrong on the server. Try again.", 500);
  }
}
