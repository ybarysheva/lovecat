import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { PAPER_HEX } from "@/lib/palette";
import "./globals.css";

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-mono",
  display: "swap",
});

// The site's public address, used to make link-preview image URLs absolute. On Vercel it's
// the production domain (set automatically); locally it's the dev server.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : `http://localhost:${process.env.PORT ?? 3000}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "send-a-cat",
  description: "Send someone a little cat that tells them nice things when they pet it.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: PAPER_HEX,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body>{children}</body>
    </html>
  );
}
