import { readCard } from "@/lib/cards";
import { OG_SIZE, ogImage } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "A little cat that says nice things";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const card = await readCard((await params).id.toLowerCase()).catch(() => null);
  const to = card ? (card.to.length > 24 ? card.to.slice(0, 23) + "…" : card.to) : null;
  return ogImage(to ? `A cat for ${to}` : "A cat for you", "[ pet the cat to receive love ]");
}
