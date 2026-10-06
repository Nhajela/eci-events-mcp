// Landing page blocks. Each block carries one message; detail sits behind a
// "More" toggle or on /trust and /how-it-works.

export function CommunityDisclaimer() {
  return (
    <div
      role="note"
      className="border-b border-amber-300 bg-amber-100 px-4 py-2.5 text-amber-950 sm:px-6"
    >
      <p className="mx-auto max-w-5xl text-sm">
        <b>Community-built, not an official Edge City app.</b> Made by{" "}
        <a className="font-medium underline" href="https://t.me/HiiNaman">
          @HiiNaman
        </a>
        . Your key is never stored.{" "}
        <a className="font-medium underline" href="/trust">
          Why it's safe
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

/** Left side of the hero; the path buttons are added by SetupPaths. */
export function HeroText() {
  return (
    <>
      <p className="text-sm font-medium uppercase tracking-wider text-teal-800">
        Edge City India · 11 Oct – 1 Nov · Goa
      </p>
      <h1 className="mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl">
        Use your own Claude or ChatGPT for Edge City events
      </h1>
      <p className="mt-4 text-lg text-neutral-700">
        Your AI finds what's on at Edge City and RSVPs for you, after you say yes.
      </p>
    </>
  );
}

const ICONS = {
  calendar:
    "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  check: "M20 6 9 17l-5-5",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  plus: "M12 5v14M5 12h14",
} as const;

const USE_CASES: { icon: keyof typeof ICONS; title: string; prompt: string }[] = [
  { icon: "calendar", title: "See what's on", prompt: "What's happening this afternoon?" },
  {
    icon: "check",
    title: "RSVP without the portal",
    prompt: "RSVP me to the AI salon on Thursday.",
  },
  { icon: "list", title: "Plan your week", prompt: "Fill my week with music, no clashes." },
  { icon: "plus", title: "Host an event", prompt: "Help me host a sunrise swim on Saturday." },
];

export function UseCases() {
  return (
    <section className="mt-20">
      <h2 className="font-display text-3xl font-semibold">What you can do</h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {USE_CASES.map((u) => (
          <li key={u.title} className="min-w-0 rounded-xl border border-neutral-200 p-5">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-7 w-7 text-teal-700"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={ICONS[u.icon]} />
            </svg>
            <h3 className="mt-3 font-display text-lg font-semibold">{u.title}</h3>
            <p className="mt-1 text-sm italic text-neutral-600">“{u.prompt}”</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Fact({
  title,
  children,
  more,
}: {
  title: string;
  children: React.ReactNode;
  more: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-neutral-200 p-5">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-neutral-700">{children}</p>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-teal-800 underline">
          More
        </summary>
        <div className="mt-2 space-y-2 text-sm text-neutral-700">{more}</div>
      </details>
    </div>
  );
}

export function TrustFacts() {
  return (
    <section className="mt-20">
      <h2 className="font-display text-3xl font-semibold">Why it's safe</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Fact
          title="Your key is never stored"
          more={
            <>
              <p>
                It travels locked inside a token only this server can open, and only for the moment
                it's needed. Your AI never sees it.
              </p>
              <a className="font-medium text-teal-800 underline" href="/trust">
                How this works, in detail
              </a>
            </>
          }
        >
          Locked away from us and from your AI.
        </Fact>
        <Fact
          title="Open source"
          more={
            <>
              <p>The code is public on GitHub, and the page shows exactly which version is live.</p>
              <a className="font-medium text-teal-800 underline" href="/trust#where">
                See the running version
              </a>
              <p>
                <a className="font-medium text-teal-800 underline" href="/how-it-works">
                  I don't know how this works
                </a>{" "}
                shows everything we tell your AI.
              </p>
            </>
          }
        >
          Anyone can check the code that runs.
        </Fact>
        <Fact
          title="What we track"
          more={
            <>
              <p>
                Only usage counts, so we know how many people use this, and errors, so we can fix
                what breaks. It's anonymous: each connection gets a scrambled id that can't be
                turned back into your key, your name or your account. We never keep your key, so we
                can't tell who you are, and we don't record what you ask or the details of events.
              </p>
              <a className="font-medium text-teal-800 underline" href="/trust">
                Full list of what's measured
              </a>
            </>
          }
        >
          Anonymous usage counts and errors. Nothing you ask.
        </Fact>
      </div>
    </section>
  );
}
