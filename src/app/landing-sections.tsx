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
