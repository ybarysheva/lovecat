import fs from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";

// A tiny key-value interface: Upstash Redis in production, a JSON file for local dev.
// Values are strings; callers JSON-encode their own records.

export interface KV {
  get(key: string): Promise<string | null>;
  /** Stores the value only if the key doesn't exist yet. Returns false if it already did. */
  setIfAbsent(key: string, value: string): Promise<boolean>;
  /** Increments a counter and returns the new value; the key expires after `seconds`. */
  incrWithExpiry(key: string, seconds: number): Promise<number>;
  /** Adds to several counters at once (they're created at 0 if missing). */
  incrMany(changes: [key: string, by: number][]): Promise<void>;
  /** Reads several keys at once, null for any that don't exist. */
  getMany(keys: string[]): Promise<(string | null)[]>;
}

class RedisKV implements KV {
  constructor(private redis: Redis) {}

  async get(key: string) {
    return (await this.redis.get<string>(key)) ?? null;
  }

  async setIfAbsent(key: string, value: string) {
    return (await this.redis.set(key, value, { nx: true })) === "OK";
  }

  async incrWithExpiry(key: string, seconds: number) {
    const tx = this.redis.multi();
    tx.incr(key);
    tx.expire(key, seconds);
    const [count] = (await tx.exec()) as [number, number];
    return count;
  }

  async incrMany(changes: [string, number][]) {
    if (changes.length === 0) return;
    const p = this.redis.pipeline();
    for (const [key, by] of changes) p.incrby(key, by);
    await p.exec();
  }

  async getMany(keys: string[]) {
    if (keys.length === 0) return [];
    return this.redis.mget<(string | null)[]>(...keys);
  }
}

// Local dev only. Each operation is a synchronous read-modify-write, so it's atomic
// within the single dev server process.
class FileKV implements KV {
  private counters = new Map<string, { count: number; expiresAt: number }>();

  constructor(private file: string) {}

  private read(): Record<string, string> {
    try {
      return JSON.parse(fs.readFileSync(this.file, "utf8")) as Record<string, string>;
    } catch {
      return {};
    }
  }

  private write(data: Record<string, string>) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  async get(key: string) {
    return this.read()[key] ?? null;
  }

  async setIfAbsent(key: string, value: string) {
    const data = this.read();
    if (key in data) return false;
    data[key] = value;
    this.write(data);
    return true;
  }

  async incrWithExpiry(key: string, seconds: number) {
    const now = Date.now();
    const entry = this.counters.get(key);
    const count = entry && entry.expiresAt > now ? entry.count + 1 : 1;
    this.counters.set(key, { count, expiresAt: now + seconds * 1000 });
    return count;
  }

  async incrMany(changes: [string, number][]) {
    const data = this.read();
    for (const [key, by] of changes) data[key] = String(Number(data[key] ?? 0) + by);
    this.write(data);
  }

  async getMany(keys: string[]) {
    const data = this.read();
    return keys.map((k) => data[k] ?? null);
  }
}

export class StorageNotConfiguredError extends Error {}

let kv: KV | undefined;

export function getKV(): KV {
  if (kv) return kv;
  // The Upstash integration on Vercel sets KV_REST_API_*; Upstash's own docs use UPSTASH_REDIS_REST_*.
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    kv = new RedisKV(new Redis({ url, token, automaticDeserialization: false }));
  } else if (process.env.VERCEL) {
    throw new StorageNotConfiguredError(
      "Storage isn't connected. Connect Upstash Redis to this Vercel project and redeploy.",
    );
  } else {
    kv = new FileKV(path.join(process.cwd(), ".data", "local-db.json"));
  }
  return kv;
}
