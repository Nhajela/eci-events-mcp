import type { Metadata } from "next";
import { Analytics } from "@/components/analytics";
import { CommunityDisclaimer, TrustFacts } from "../landing-sections";
import { BeginnerGuide } from "./guide";

export const metadata: Metadata = { title: "Set up" };

// "See how" lands here: the slides come first, everything else after.
export default async function Setup() {
  return (
    <>
      <CommunityDisclaimer />
      <main className="min-h-svh bg-[#fbf3e6]">
        <Analytics page="setup" />
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <a className="text-sm font-medium text-teal-900 underline" href="/">
            ← Back
          </a>
          <h1 className="mt-4 font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-teal-950 [font-stretch:80%] sm:text-6xl">
            Set it up in 3 steps
          </h1>
          <p className="mt-4 text-lg text-neutral-700">
            Pick the app you use: Claude, ChatGPT or any other AI agent. The steps change to match.
          </p>
          <div className="mt-6">
            <BeginnerGuide />
          </div>
          <TrustFacts />
        </div>
      </main>
    </>
  );
}
