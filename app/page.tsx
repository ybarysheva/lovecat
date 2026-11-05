import Link from "next/link";
import Cat from "@/components/cat/Cat";
import { STARTER_NOTES } from "@/lib/starter-notes";

// Placeholder: the demo cat says the builder's starter notes until it has its own.
const DEMO_NOTES = STARTER_NOTES.flatMap((g) => g.notes);

// The landing page is a working cat, so people see how it feels before making one.
export default function Home() {
  return (
    <Cat
      to={null}
      from={null}
      notes={DEMO_NOTES}
      track="home"
      footer={
        <Link className="cat-cta" href="/make">
          send someone a cat
        </Link>
      }
    />
  );
}
