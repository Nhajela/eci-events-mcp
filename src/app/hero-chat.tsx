"use client";

import { useState } from "react";

type Line = { you?: boolean; text: React.ReactNode };

// Example conversations for the hero. Writes always end with a "Confirm?"
// because that is how the server works: nothing changes until you say yes.
const DEMOS = {
  find: {
    label: "Find events",
    lines: [
      { you: true, text: "What's on today?" },
      {
        text: (
          <>
            3 events today (IST):
            <span className="mt-1 block">6:30 PM · Sunset Breathwork · Beach Deck</span>
            <span className="block">7:30 PM · Builders' dinner talk · Main Hall</span>
            <span className="block">9:00 PM · Open jam · Riva Beach</span>
          </>
        ),
      },
      { you: true, text: "Anything with music?" },
      { text: "The open jam at 9:00 PM on Riva Beach. Bring an instrument if you have one." },
    ],
  },
  rsvp: {
    label: "RSVP",
    lines: [
      { you: true, text: "What's on today?" },
      {
        text: "Sunset Breathwork at 6:30 PM, a dinner talk at 7:30 PM and an open jam at 9:00 PM.",
      },
      { you: true, text: "Okay, RSVP me to the breathwork." },
      { text: "Sunset Breathwork, Fri 9 Oct, 6:30 PM IST, Beach Deck. Confirm?" },
      { you: true, text: "Yes" },
      { text: "Done ✓ You're going." },
    ],
  },
  create: {
    label: "Create new events",
    lines: [
      { you: true, text: "Host a sunrise swim on Saturday, 6:30 AM at Riva Beach." },
      { text: "Sunrise Swim, Sat 10 Oct, 6:30–7:30 AM IST, Riva Beach. Publish it?" },
      { you: true, text: "Yes" },
      { text: "Done ✓ It's on the Edge City calendar." },
    ],
  },
} satisfies Record<string, { label: string; lines: Line[] }>;

type Demo = keyof typeof DEMOS;

export function HeroChat() {
  const [demo, setDemo] = useState<Demo>("rsvp");
  return (
    <>
      <div className="flex flex-wrap justify-center gap-3">
        {(Object.keys(DEMOS) as Demo[]).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={demo === d}
            onClick={() => setDemo(d)}
            className={`rounded-full px-5 py-2 text-base font-medium ring-1 backdrop-blur transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900 ${
              demo === d
                ? "bg-teal-900 text-white ring-teal-900"
                : "bg-white/60 text-teal-950 ring-teal-950/20 hover:bg-white/80"
            }`}
          >
            {DEMOS[d].label}
          </button>
        ))}
      </div>
      <figure
        aria-label="Example chat with your AI about Edge City events"
        className="mx-auto mt-10 w-full max-w-2xl rounded-[2rem] bg-white/80 p-5 text-left shadow-[0_30px_80px_-20px_rgba(6,40,38,0.45)] ring-1 ring-white/70 backdrop-blur-md sm:p-8"
      >
        <ol key={demo} className="space-y-3">
          {DEMOS[demo].lines.map((l: Line, i) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: static script, order never changes
              key={i}
              style={{ animationDelay: `${i * 220}ms` }}
              className={`flex motion-safe:animate-[bubble-in_400ms_ease-out_both] ${l.you ? "justify-end" : "justify-start"}`}
            >
              <span
                className={`max-w-[85%] rounded-3xl px-4 py-2.5 text-[0.95rem] leading-relaxed sm:text-base ${
                  l.you
                    ? "rounded-br-md bg-teal-800 text-white"
                    : "rounded-bl-md bg-[#f6efe2] text-neutral-900"
                }`}
              >
                {l.text}
              </span>
            </li>
          ))}
        </ol>
        <figcaption className="mt-5 text-xs text-neutral-600">
          Example conversation. Nothing changes until you say yes.
        </figcaption>
      </figure>
    </>
  );
}
