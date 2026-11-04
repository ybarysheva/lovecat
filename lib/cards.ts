import { randomBytes } from "node:crypto";
import type { Card, CardInput } from "./card";
import { getKV } from "./kv";

const ID_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz"; // no 0/o, 1/l to keep links readable
const ID_LENGTH = 10; // 32^10 ≈ 10^15 possible links, so they can't be guessed

// Lowercase only, so a link still works if a phone capitalises or lowercases it.
export const ID_PATTERN = /^[23456789abcdefghijkmnpqrstuvwxyz]{10}$/;

function newId(): string {
  // 32 divides 256 evenly, so taking each byte mod 32 is unbiased.
  return Array.from(randomBytes(ID_LENGTH), (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("");
}

const key = (id: string) => `cat:${id}`;

export async function createCard(input: CardInput): Promise<Card> {
  const kv = getKV();
  for (let attempt = 0; attempt < 5; attempt++) {
    const card: Card = { id: newId(), ...input, createdAt: new Date().toISOString() };
    if (await kv.setIfAbsent(key(card.id), JSON.stringify(card))) return card;
  }
  throw new Error("Couldn't find a free link id.");
}

export async function readCard(id: string): Promise<Card | null> {
  if (!ID_PATTERN.test(id)) return null;
  const raw = await getKV().get(key(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Card;
  } catch {
    return null;
  }
}
