import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import Cat from "@/components/Cat";
import { readCard } from "@/lib/cards";
import { StorageNotConfiguredError } from "@/lib/kv";

type Params = { params: Promise<{ id: string }> };

// Cats are private-ish: reachable by link only, never indexed.
const robots = { index: false, follow: false, nocache: true };

// cache() so the metadata and the page share one read per request.
const load = cache(async (id: string) => {
  try {
    return { card: await readCard(id), error: null };
  } catch (e) {
    if (e instanceof StorageNotConfiguredError) return { card: null, error: e.message };
    throw e;
  }
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { card } = await load((await params).id);
  if (!card) return { title: "send-a-cat", robots };
  const title = `A cat for ${card.to}`;
  const description = card.from
    ? `${card.from} sent you a cat. Pet it to receive love.`
    : "Someone sent you a cat. Pet it to receive love.";
  return { title, description, robots, openGraph: { title, description, type: "website" } };
}

export default async function CatPage({ params }: Params) {
  const { card, error } = await load((await params).id);
  if (error) {
    return (
      <main className="message-page">
        <h1>The cat is napping</h1>
        <p>{error}</p>
      </main>
    );
  }
  if (!card) notFound();
  return <Cat to={card.to} from={card.from} notes={card.notes} footer={<Link href="/make">send someone a cat</Link>} />;
}
