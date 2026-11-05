import type { Metadata } from "next";
import Builder from "@/components/Builder";

export const metadata: Metadata = {
  title: "Make a cat · send-a-cat",
  description: "Write or pick some notes, get a link, and send someone a cat that tells them nice things.",
};

export default function MakePage() {
  return <Builder />;
}
