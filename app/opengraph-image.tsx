import { OG_SIZE, ogImage } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "lovecat: send someone a cat that says nice things";

export default function Image() {
  return ogImage("Send someone a cat", "It tells them nice things when they pet it");
}
