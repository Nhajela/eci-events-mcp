// The setup guide: short slides for beginners (Claude and ChatGPT) and a
// compact card for people who already know MCP servers. Each slide is one
// chunk; extra detail sits behind "More help".

import { agenticAccessUrl, mcpUrl, origin } from "@/lib/env";
import { ChatIllustration } from "../landing-sections";
import { LandingTabs } from "../landing-tabs";
import { ConnectMock, DoneMock, KeyMock, ToggleMock } from "./mocks";
import { CopyBox, Never, Shot } from "./parts";
import { type Slide, Tutorial } from "./tutorial";

const NAME = "Edge City events";

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-block rounded-lg bg-teal-700 px-5 py-3 font-medium text-white hover:bg-teal-800"
    >
      {children} ↗
    </a>
  );
}

function intro(app: string): Slide {
  return {
    id: "intro",
    title: `Edge City events, inside ${app}`,
    lead: `Ask ${app} what's on. It answers from the real calendar, and RSVPs only when you say yes.`,
    visual: <ChatIllustration />,
    more: <p>Takes about 3 minutes. You need your Edge City portal login.</p>,
  };
}

function key(): Slide {
  return {
    id: "key",
    title: "Make your Edge City key",
    lead: "Create a key in the Edge City portal, then copy it.",
    action: <LinkButton href={agenticAccessUrl()}>Open the Edge City portal</LinkButton>,
    visual: <KeyMock />,
    more: (
      <>
        <p>
          The page is {agenticAccessUrl().replace("https://", "")}. Tick what your AI may do. Read
          events is always on.
        </p>
        <p>
          If you tick a write box, the portal asks for an expiry. You can delete the key any time.
        </p>
      </>
    ),
  };
}

function connect(app: string): Slide {
  return {
    id: "connect",
    title: "Connect your key",
    lead: `${app} opens a page from this site. Paste your key there and press Connect.`,
    action: <Never />,
    visual: <ConnectMock />,
    more: (
      <>
        <p>After Connect, you'll see what your key allows. Press Continue to go back to {app}.</p>
        <p>
          Wondering if it's safe?{" "}
          <a className="underline" href="/trust">
            See how your key is protected
          </a>
          .
        </p>
      </>
    ),
  };
}

function tryIt(): Slide {
  return {
    id: "try",
    title: "Ask away",
    lead: "Try one of these:",
    action: (
      <ul className="space-y-2">
        {[
          "What's on tonight at Edge City?",
          "RSVP me to something about AI this week.",
          "Help me host a sunrise swim on Saturday.",
        ].map((p) => (
          <li key={p} className="rounded-lg bg-neutral-100 px-4 py-2">
            “{p}”
          </li>
        ))}
      </ul>
    ),
    visual: <DoneMock />,
  };
}

export function claudeSlides(): Slide[] {
  const url = mcpUrl();
  return [
    intro("Claude"),
    key(),
    {
      id: "open",
      title: "Open Customize → Connectors",
      lead: "Press + Add, then Add custom connector.",
      action: (
        <LinkButton href="https://claude.ai/customize/connectors">
          Open Claude connectors
        </LinkButton>
      ),
      visual: (
        <Shot
          src="/guide/claude-customize-connectors.png"
          width={872}
          height={229}
          alt="Claude's Customize page with the Connectors tab and the + Add button at the top right"
        />
      ),
      more: (
        <>
          <p>Works the same on claude.ai and in the Claude desktop app.</p>
          <p>Free plan: you can add one custom connector.</p>
          <p>
            Team or Enterprise: an Owner adds it once under{" "}
            <b>Organization settings → Connectors</b> (Add → Custom → Web), then everyone presses
            Connect on it.
          </p>
        </>
      ),
    },
    {
      id: "paste",
      title: "Paste the name and link",
      lead: "Copy both into the dialog, then press Continue.",
      action: (
        <div className="space-y-3">
          <CopyBox label="Name" value={NAME} />
          <CopyBox label="MCP server URL" value={url} />
        </div>
      ),
      visual: (
        <Shot
          src="/guide/claude-add-custom-connector.png"
          width={482}
          height={401}
          alt="Claude's Add custom connector dialog with the name Edge City events and the server URL filled in"
        />
      ),
      more: (
        <p>
          If Claude asks how to sign in, pick <b>Sign in now</b>, and for the OAuth client pick{" "}
          <b>Use Claude's published identity</b> (recommended). Then press <b>Add</b>.
        </p>
      ),
    },
    connect("Claude"),
    {
      id: "chat",
      title: "Turn it on in a chat",
      lead: "In a new chat: + → Connectors → switch on Edge City events.",
      visual: <ToggleMock app="claude" />,
      more: (
        <p>
          The first time, Claude may ask permission for each tool. Allow the ones you're happy with.
        </p>
      ),
    },
    tryIt(),
  ];
}

export function chatgptSlides(): Slide[] {
  const url = mcpUrl();
  return [
    intro("ChatGPT"),
    key(),
    {
      id: "open",
      title: "Open Plugins",
      lead: "In ChatGPT on the web: Plugins → + → Add custom MCP server.",
      action: <LinkButton href="https://chatgpt.com">Open ChatGPT</LinkButton>,
      more: (
        <p>
          Don't see it? Some plans need developer mode first:{" "}
          <b>Settings → Apps → Advanced settings → Developer mode</b>.
        </p>
      ),
    },
    {
      id: "paste",
      title: "Paste the name and link",
      lead: "Copy both in, choose OAuth, then create it.",
      action: (
        <div className="space-y-3">
          <CopyBox label="Name" value={NAME} />
          <CopyBox label="MCP server URL" value={url} />
        </div>
      ),
      more: (
        <p>
          ChatGPT shows a warning about custom servers. Press{" "}
          <b>I understand and want to continue</b>.
        </p>
      ),
    },
    connect("ChatGPT"),
    {
      id: "chat",
      title: "Use it in a chat",
      lead: "Type @ and pick Edge City events, then ask your question.",
      visual: <ToggleMock app="chatgpt" />,
    },
    tryIt(),
  ];
}

export function BeginnerGuide() {
  return (
    <LandingTabs
      tabs={[
        {
          id: "claude",
          label: "I use Claude",
          content: (
            <Tutorial
              app="claude"
              goal="your Claude can see Edge City events"
              slides={claudeSlides()}
            />
          ),
        },
        {
          id: "chatgpt",
          label: "I use ChatGPT",
          content: (
            <Tutorial
              app="chatgpt"
              goal="your ChatGPT can see Edge City events"
              slides={chatgptSlides()}
            />
          ),
        },
      ]}
    />
  );
}

export function TechyCard() {
  const url = mcpUrl();
  const json = `{\n  "mcpServers": {\n    "eci-events": { "url": "${url}" }\n  }\n}`;
  return (
    <div className="grid gap-8 rounded-2xl border border-neutral-200 p-5 sm:p-8 md:grid-cols-2">
      <div className="min-w-0 space-y-4">
        <h3 className="font-display text-2xl font-semibold">Add it to your client</h3>
        <CopyBox label="MCP server URL (Streamable HTTP)" value={url} />
        <CopyBox label="Claude Code" value={`claude mcp add --transport http eci-events ${url}`} />
        <details>
          <summary className="cursor-pointer text-sm font-medium text-teal-800 underline">
            JSON config (Cursor, VS Code, Windsurf)
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-neutral-300 bg-neutral-50 p-3 font-mono text-sm">
            {json}
          </pre>
        </details>
      </div>
      <div className="min-w-0 space-y-4">
        <h3 className="font-display text-2xl font-semibold">Or let your agent do it</h3>
        <CopyBox label="Paste this link to your agent" value={`${origin()}/connect.md`} />
        <details>
          <summary className="cursor-pointer text-sm font-medium text-teal-800 underline">
            Auth and protocol details
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
            <li>MCP 2026-07-28, stateless; 2025-11-25 clients work too.</li>
            <li>OAuth 2.1 with PKCE S256; CIMD and DCR. No token in the URL.</li>
            <li>
              Sign-in opens <code className="font-mono">/connect</code>; paste an EdgeOS key from{" "}
              <a className="underline" href={agenticAccessUrl()}>
                /portal/agentic-access
              </a>
              . Tools follow the key's scopes.
            </li>
            <li>
              Start with <code className="font-mono">edgeos_initialize</code>; writes go through{" "}
              <code className="font-mono">edgeos_propose</code> →{" "}
              <code className="font-mono">edgeos_confirm</code>.
            </li>
            <li>
              Every instruction:{" "}
              <a className="underline" href="/how-it-works">
                /how-it-works
              </a>{" "}
              · Key handling:{" "}
              <a className="underline" href="/trust">
                /trust
              </a>
            </li>
          </ul>
        </details>
      </div>
    </div>
  );
}
