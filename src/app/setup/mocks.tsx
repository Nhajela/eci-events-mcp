// Small drawn illustrations for slides that have no real screenshot.

export function KeyMock() {
  const rows: [string, boolean][] = [
    ["Read events", true],
    ["RSVP to events", true],
    ["Create events", false],
    ["Manage venues", false],
  ];
  return (
    <figure
      aria-label="Example: the Edge City portal's key form with Read events and RSVP ticked"
      className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
    >
      <p className="text-sm font-semibold">New API key</p>
      <ul className="mt-3 space-y-2">
        {rows.map(([label, on]) => (
          <li
            key={label}
            className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 shadow-sm"
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                on ? "border-teal-700 bg-teal-700 text-white" : "border-neutral-300"
              }`}
            >
              {on ? "✓" : ""}
            </span>
            <span className="text-sm">{label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-lg bg-white px-3 py-2 font-mono text-xs text-neutral-500 shadow-sm">
        eos_live_••••••••••••
      </p>
      <figcaption className="mt-2 text-xs text-neutral-500">
        Tick what your AI may do, then copy the key.
      </figcaption>
    </figure>
  );
}

export function ConnectMock() {
  return (
    <figure
      aria-label="Example: this site's connect page asking for your EdgeOS key"
      className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
    >
      <p className="font-display text-lg font-semibold">Connect your EdgeOS key</p>
      <p className="mt-2 text-xs text-neutral-600">Your EdgeOS API key</p>
      <p className="mt-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-500">
        eos_live_••••••••••••
      </p>
      <p className="mt-3 rounded-lg bg-teal-700 py-2 text-center text-sm font-medium text-white">
        Connect
      </p>
      <figcaption className="mt-2 text-xs text-neutral-500">
        The page that opens from this site.
      </figcaption>
    </figure>
  );
}

export function ToggleMock({ app }: { app: "claude" | "chatgpt" }) {
  return (
    <figure
      aria-label={
        app === "claude"
          ? "Example: Claude's + menu with Connectors and Edge City events switched on"
          : "Example: typing @ in ChatGPT and picking Edge City events"
      }
      className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
    >
      {app === "claude" ? (
        <div className="space-y-2">
          <p className="w-fit rounded-full bg-white px-3 py-1 text-sm shadow-sm">+</p>
          <p className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm">Connectors ›</p>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
            <span>Edge City events</span>
            <span className="flex h-5 w-9 items-center rounded-full bg-teal-700 p-0.5">
              <span className="ml-auto h-4 w-4 rounded-full bg-white" />
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="rounded-lg bg-white px-3 py-2 font-mono text-sm shadow-sm">@</p>
          <p className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm">Edge City events</p>
        </div>
      )}
    </figure>
  );
}

export function DoneMock() {
  return (
    <div className="flex aspect-[4/3] max-w-sm flex-col items-center justify-center rounded-2xl bg-teal-700 p-6 text-center text-white">
      <span className="text-5xl" aria-hidden="true">
        ✓
      </span>
      <p className="mt-3 font-display text-2xl font-semibold">You're set</p>
      <p className="mt-1 text-teal-50">Your AI can now see Edge City events.</p>
    </div>
  );
}
