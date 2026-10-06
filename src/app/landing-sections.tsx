import { GoalLine } from "./setup/parts";

// Landing page sections above the setup steps: who built this, what it is
// for, what you can do with it, and what we track.

export function CommunityDisclaimer() {
  return (
    <div
      role="note"
      className="border-b border-amber-300 bg-amber-100 px-4 py-3 text-amber-950 sm:px-6"
    >
      <p className="mx-auto max-w-5xl text-sm sm:text-base">
        <b>Community-built, not an official Edge City app.</b> Made by{" "}
        <a className="font-medium underline" href="https://t.me/HiiNaman">
          @HiiNaman
        </a>{" "}
        on Telegram. Your EdgeOS key is never stored and your AI never sees it, so your key and your
        account stay protected.{" "}
        <a className="font-medium underline" href="/trust">
          How we keep it safe
        </a>
      </p>
    </div>
  );
}

function Bubble({ from, children }: { from: "you" | "ai"; children: React.ReactNode }) {
  const you = from === "you";
  return (
    <div className={`flex ${you ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          you
            ? "rounded-br-sm bg-teal-700 text-white"
            : "rounded-bl-sm bg-white text-neutral-900 shadow-sm"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function ChatIllustration() {
  return (
    <figure
      aria-label="Example chat: asking an AI what's on tonight and RSVPing"
      className="rounded-2xl border border-neutral-200 bg-neutral-100 p-4"
    >
      <div className="space-y-3">
        <Bubble from="you">What's on tonight?</Bubble>
        <Bubble from="ai">
          <p className="font-medium">3 events tonight (IST):</p>
          <ul className="mt-1 space-y-0.5">
            <li>6:30 PM · Sunset Breathwork · Beach Deck</li>
            <li>7:30 PM · Builders' dinner talk · Main Hall</li>
            <li>9:00 PM · Open jam · Riva Beach</li>
          </ul>
          <p className="mt-1">Want me to RSVP to one?</p>
        </Bubble>
        <Bubble from="you">Yes, the breathwork.</Bubble>
        <Bubble from="ai">
          Here's what I'll do: RSVP to “Sunset Breathwork”, Wed 14 Oct, 6:30 PM IST, at Beach Deck.
          Confirm?
        </Bubble>
      </div>
      <figcaption className="mt-3 text-xs text-neutral-600">
        Example conversation. Nothing changes until you say yes.
      </figcaption>
    </figure>
  );
}

export function Hero() {
  return (
    <section className="grid items-center gap-8 md:grid-cols-[1.1fr_1fr]">
      <div className="min-w-0">
        <p className="text-sm font-medium uppercase tracking-wider text-teal-800">
          Edge City India · 11 Oct – 1 Nov 2026 · Mandrem, Goa
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
          Use your own Claude or ChatGPT for Edge City events
        </h1>
        <p className="mt-4 text-lg text-neutral-700">
          Ask about the village calendar in plain words. Find what's on, RSVP, plan your week and
          host your own events, from the AI app you already use.
        </p>
        <div className="mt-5">
          <GoalLine />
        </div>
        <a
          href="#setup"
          className="mt-6 inline-block rounded-lg bg-teal-700 px-5 py-3 font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          Get set up
        </a>
      </div>
      <ChatIllustration />
    </section>
  );
}

const ICONS = {
  calendar:
    "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  check: "M20 6 9 17l-5-5",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  plus: "M12 5v14M5 12h14",
} as const;

const USE_CASES: { icon: keyof typeof ICONS; title: string; text: string; prompt: string }[] = [
  {
    icon: "calendar",
    title: "See what's on",
    text: "Today's or this week's events in India time, with venues and who's hosting.",
    prompt: "What's happening this afternoon?",
  },
  {
    icon: "check",
    title: "RSVP without the portal",
    text: "Your AI shows you exactly what it will do and asks before every RSVP.",
    prompt: "RSVP me to the AI salon on Thursday.",
  },
  {
    icon: "list",
    title: "Plan your week",
    text: "Pick events around what you've already RSVPed to, without clashes.",
    prompt: "Fill my week with music and wellness, no clashes.",
  },
  {
    icon: "plus",
    title: "Host an event",
    text: "Draft it with your AI. It checks the venue is free before anything is created.",
    prompt: "Help me host a sunrise swim on Saturday.",
  },
];

export function UseCases() {
  return (
    <section className="mt-14">
      <h2 className="font-display text-2xl font-semibold">What you can do</h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {USE_CASES.map((u) => (
          <li key={u.title} className="flex min-w-0 gap-4 rounded-xl border border-neutral-200 p-5">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-6 w-6 shrink-0 text-teal-700"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={ICONS[u.icon]} />
            </svg>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-semibold">{u.title}</h3>
              <p className="mt-1 text-neutral-700">{u.text}</p>
              <p className="mt-2 text-sm italic text-neutral-600">“{u.prompt}”</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TrackingNote() {
  return (
    <section className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
      <h2 className="font-display text-xl font-semibold">What we track</h2>
      <p className="mt-2 text-neutral-700">
        Only usage counts, so we know how many people use this, and errors, so we can fix what
        breaks. It's anonymous: each connection gets a scrambled id that can't be turned back into
        your key, your name or your account. We never keep your key, so we can't tell who you are,
        and we don't record what you ask or the details of events.{" "}
        <a className="font-medium text-teal-800 underline" href="/trust">
          Full list of what's measured
        </a>
      </p>
    </section>
  );
}
