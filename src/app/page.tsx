import { Analytics } from "@/components/analytics";
import { CopyButton } from "@/components/copy-button";
import { Tabs } from "@/components/tabs";
import { agenticAccessUrl, mcpUrl } from "@/lib/env";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[2.25rem_1fr] gap-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 font-display text-white">
        {n}
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <div className="mt-1 space-y-2 text-neutral-700">{children}</div>
      </div>
    </li>
  );
}

function UrlBox({ url }: { url: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-300 bg-neutral-50 p-3">
      <code className="min-w-0 break-all font-mono text-sm">{url}</code>
      <CopyButton value={url} label="Copy URL" />
    </div>
  );
}

function KeyStep() {
  return (
    <Step n={1} title="Make a key in the Edge City portal">
      <p>
        Open{" "}
        <a className="underline" href={agenticAccessUrl()}>
          {agenticAccessUrl().replace("https://", "")}
        </a>{" "}
        and create an API key.
      </p>
      <p>
        Tick what you want your AI to do: read events (always on), RSVP, host events, manage venues.
        Set an expiry; the portal asks for one when you tick a write box.
      </p>
      <p>Copy the key. You'll paste it once, on our page, in step 3.</p>
    </Step>
  );
}

function TryStep() {
  return (
    <Step n={4} title="Try it">
      <ul className="list-disc pl-5">
        <li>“What's on tonight at Edge City?”</li>
        <li>“Find me something about AI this week and RSVP me to the best one.”</li>
        <li>“Help me host a sunrise swim on Saturday.”</li>
      </ul>
    </Step>
  );
}

export default async function Home() {
  const url = mcpUrl();
  const pasteStep = (
    <Step n={3} title="Paste your key on our page">
      <p>
        Your app opens a page from this site asking for the key. Paste it and press Connect. You'll
        see what your key allows, then you're sent back.
      </p>
      <p className="font-medium text-neutral-900">
        Never paste your key into a chat. Only into that page.
      </p>
    </Step>
  );
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Analytics page="landing" />
      <p className="text-sm font-medium uppercase tracking-wider text-teal-800">
        Edge City India · 11 Oct – 1 Nov 2026 · Mandrem, Goa
      </p>
      <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
        Ask your AI what's on at Edge City
      </h1>
      <p className="mt-4 text-lg text-neutral-700">
        Connect Claude or ChatGPT to the village calendar. Find events, RSVP, and host your own, in
        plain words. A community project, not run by Edge City.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">Connect in four steps</h2>
        <div className="mt-6">
          <Tabs
            tabs={[
              {
                id: "claude",
                label: "claude.ai / Claude app",
                content: (
                  <ol className="space-y-8">
                    <KeyStep />
                    <Step n={2} title="Add the connector">
                      <p>
                        In Claude: <b>Settings → Connectors → Add custom connector</b>. Name it
                        “Edge City events” and paste this URL:
                      </p>
                      <UrlBox url={url} />
                      <p>
                        Press <b>Add</b>, then <b>Connect</b>.
                      </p>
                    </Step>
                    {pasteStep}
                    <TryStep />
                  </ol>
                ),
              },
              {
                id: "chatgpt",
                label: "ChatGPT",
                content: (
                  <ol className="space-y-8">
                    <KeyStep />
                    <Step n={2} title="Add the connector">
                      <p>
                        In ChatGPT:{" "}
                        <b>Settings → Apps &amp; Connectors → Advanced → Developer mode</b> on, then{" "}
                        <b>Create</b>. Name it “Edge City events”, choose OAuth, and paste this URL:
                      </p>
                      <UrlBox url={url} />
                      <p>
                        Press <b>Create</b>. In a new chat, turn the connector on from the <b>+</b>{" "}
                        menu.
                      </p>
                    </Step>
                    {pasteStep}
                    <TryStep />
                  </ol>
                ),
              },
              {
                id: "other",
                label: "Claude Code & others",
                content: (
                  <ol className="space-y-8">
                    <KeyStep />
                    <Step n={2} title="Add the server">
                      <p>Claude Code:</p>
                      <UrlBox url={`claude mcp add --transport http eci-events ${url}`} />
                      <p>
                        Any MCP client that supports remote servers with OAuth: add{" "}
                        <code className="font-mono">{url}</code>. No token goes in the URL.
                      </p>
                    </Step>
                    {pasteStep}
                    <TryStep />
                  </ol>
                ),
              },
            ]}
          />
        </div>
      </section>

      <section className="mt-14 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 p-5">
          <h2 className="font-display text-xl font-semibold">Why you can trust this</h2>
          <p className="mt-2 text-neutral-700">
            We never store your key. Your AI never sees it. It travels locked inside a token only
            this server can open, and only for the moment it's needed.
          </p>
          <a className="mt-3 inline-block font-medium text-teal-800 underline" href="/trust">
            How this works, in detail
          </a>
        </div>
        <div className="rounded-xl border border-neutral-200 p-5">
          <h2 className="font-display text-xl font-semibold">Where this runs</h2>
          <p className="mt-2 text-neutral-700">
            The code is public on GitHub, and the page shows exactly which version is live, so you
            or your AI can check it.
          </p>
          <a className="mt-3 inline-block font-medium text-teal-800 underline" href="/trust#where">
            See the running version
          </a>
        </div>
      </section>
    </main>
  );
}
