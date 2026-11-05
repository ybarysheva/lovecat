import { getKV } from "./kv";

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

/**
 * Whether this visitor has gone over `perMinute` requests to `bucket` this minute. A fixed
 * one-minute window per IP, counted in the database so it holds across server instances.
 */
export async function overLimit(req: Request, bucket: string, perMinute: number) {
  const minute = Math.floor(Date.now() / 60_000);
  const count = await getKV().incrWithExpiry(`rl:${bucket}:${clientIp(req)}:${minute}`, 70);
  return count > perMinute;
}
