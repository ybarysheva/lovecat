import type { Metadata } from "next";
import Builder from "@/components/builder/Builder";

export const metadata: Metadata = {
  title: "send-a-cat",
  description: "Write or pick some messages, get a link, and send someone a cat that tells them nice things.",
};

export default function MakePage() {
  return <Builder />;
}
