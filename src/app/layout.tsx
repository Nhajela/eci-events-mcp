import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ECI Events MCP",
  description: "Use the Edge City India events calendar from Claude or ChatGPT.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
