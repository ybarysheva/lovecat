import Link from "next/link";
import Cat from "@/components/Cat";
import { DEMO_NOTES } from "@/lib/starter-notes";

// The landing page is a working cat, so people see how it feels before making one.
export default function Home() {
  return (
    <Cat
      to={null}
      from={null}
      notes={DEMO_NOTES}
      startWithFirst
      footer={
        <>
          <p className="cat-cta-line">send someone a cat of their own</p>
          <Link className="cat-cta" href="/make">
            make your own cat →
          </Link>
        </>
      }
    />
  );
}
