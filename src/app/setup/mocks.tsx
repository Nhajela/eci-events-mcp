// Small drawn illustrations for slides that have no real screenshot.

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
