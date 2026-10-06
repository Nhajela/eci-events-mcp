import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--nf-display" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--nf-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--nf-mono" });

export const metadata: Metadata = {
  title: "ECI Events MCP",
  description:
    "Use the Edge City India events calendar from Claude or ChatGPT. Your EdgeOS key is never stored.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="bg-white font-body text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
