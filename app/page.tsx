import Link from "next/link";
import Cat from "@/components/cat/Cat";
import { DEMO_NOTES } from "@/lib/starter-notes";

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
