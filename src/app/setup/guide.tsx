// The setup guide content: slides for beginners (Claude and ChatGPT) and a
// compact card for people who already know MCP servers.

import { agenticAccessUrl, mcpUrl, origin } from "@/lib/env";
import { ChatIllustration } from "../landing-sections";
import { LandingTabs } from "../landing-tabs";
import { CopyBox, GoalLine, Never, Shot } from "./parts";
import { type Slide, Tutorial } from "./tutorial";

const NAME = "Edge City events";

function KeySlide(): Slide {
  return {
    id: "key",
    title: "Make your Edge City key",
    body: (
      <>
        <p>
          A key lets your AI act as you on the Edge City calendar. You make it yourself, and you can
          delete it any time.
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Open{" "}
            <a className="font-medium underline" href={agenticAccessUrl()}>
              {agenticAccessUrl().replace("https://", "")}
            </a>{" "}
            and sign in to the Edge City portal.
          </li>
          <li>Create an API key.</li>
          <li>
            Tick what your AI may do: read events (always on), RSVP, host events, manage venues.
          </li>
          <li>Set an expiry. The portal asks for one when you tick a write box.</li>
          <li>Copy the key and keep it handy for step 5.</li>
        </ol>
        <Never />
      </>
    ),
  };
}

function introSlide(app: string): Slide {
  return {
    id: "intro",
    title: "What you'll get",
    body: (
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <p>
            When you're done, you can ask {app} “What's on tonight?” and it answers from the real
            Edge City calendar, in India time.
          </p>
          <p>
            It only changes things, like an RSVP, after it shows you exactly what it will do and you
            say yes.
          </p>
          <p className="text-neutral-600">
            You need: an Edge City portal login and about 3 minutes.
          </p>
        </div>
        <ChatIllustration />
      </div>
    ),
  };
}

function trySlide(app: string): Slide {
  return {
    id: "try",
    title: "Try it",
    body: (
      <>
        <p>Ask {app} things like:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>“What's on tonight at Edge City?”</li>
          <li>“Find me something about AI this week and RSVP me to the best one.”</li>
          <li>“Plan my Saturday around what I've already RSVPed to.”</li>
          <li>“Help me host a sunrise swim on Saturday.”</li>
        </ul>
        <p className="rounded-lg bg-teal-700 px-4 py-3 font-medium text-white">
          You're done: {app} can now see Edge City events and RSVP for you when you say yes.
        </p>
      </>
    ),
  };
}

function withGoal(app: string, slides: Slide[]): Slide[] {
  return slides.map((s) => ({
    ...s,
    body: (
      <>
        <GoalLine who={`your ${app}`} />
        {s.body}
      </>
    ),
  }));
}

export function claudeSlides(): Slide[] {
  const url = mcpUrl();
  return withGoal("Claude", [
    introSlide("Claude"),
    KeySlide(),
    {
      id: "open",
      title: "Open Customize → Connectors",
      body: (
        <>
          <p>
            In Claude (claude.ai or the Claude app), open{" "}
            <a className="font-medium underline" href="https://claude.ai/customize/connectors">
              Customize → Connectors
            </a>
            . Press <b>+ Add</b>, then <b>Add custom connector</b>.
          </p>
          <Shot
            src="/guide/claude-customize-connectors.png"
            width={872}
            height={229}
            alt="Claude's Customize page with the Connectors tab and the + Add button at the top right"
          />
        </>
      ),
    },
    {
      id: "paste",
      title: "Paste the name and link",
      body: (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <CopyBox label="Name" value={NAME} />
            <CopyBox label="MCP server URL" value={url} />
          </div>
          <Shot
            src="/guide/claude-add-custom-connector.png"
            width={482}
            height={401}
            alt="Claude's Add custom connector dialog with the name Edge City events and the server URL filled in"
          />
          <p>
            Press <b>Continue</b>. If Claude asks how to sign in, pick <b>Sign in now</b>, and for
            the OAuth client pick <b>Use Claude's published identity</b> (recommended). Then press{" "}
            <b>Add</b>.
          </p>
          <p className="text-sm text-neutral-600">
            Free plan: you can add one custom connector. Team or Enterprise: an Owner adds it once
            under <b>Organization settings → Connectors</b> (Add → Custom → Web), then everyone
            presses Connect on it in Customize → Connectors.
          </p>
        </>
      ),
    },
    {
      id: "connect",
      title: "Press Connect and paste your key",
      body: (
        <>
          <p>
            Claude shows the new connector with a <b>Connect</b> button. Press it. A page from this
            site opens:
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Paste the key from step 2 and press Connect.</li>
            <li>Check what your key allows, then press Continue to go back to Claude.</li>
          </ol>
          <Never />
          <p className="text-sm text-neutral-600">
            Not sure it's safe?{" "}
            <a className="underline" href="/trust">
              See how your key is protected
            </a>
            .
          </p>
        </>
      ),
    },
    {
      id: "chat",
      title: "Turn it on in a chat",
      body: (
        <>
          <p>
            Start a new chat. Press the <b>+</b> button, open <b>Connectors</b>, and switch on{" "}
            <b>{NAME}</b>.
          </p>
          <p className="text-neutral-600">
            The first time Claude uses it, it may ask permission for each tool. Allow the ones
            you're happy with.
          </p>
        </>
      ),
    },
    trySlide("Claude"),
  ]);
}

export function chatgptSlides(): Slide[] {
  const url = mcpUrl();
  return withGoal("ChatGPT", [
    introSlide("ChatGPT"),
    KeySlide(),
    {
      id: "open",
      title: "Open Plugins",
      body: (
        <>
          <p>
            In ChatGPT on the web, open <b>Plugins</b>, press <b>+</b>, then{" "}
            <b>Add custom MCP server</b>.
          </p>
          <p className="text-sm text-neutral-600">
            Don't see it? Some plans need developer mode first:{" "}
            <b>Settings → Apps → Advanced settings → Developer mode</b>.
          </p>
        </>
      ),
    },
    {
      id: "paste",
      title: "Paste the name and link",
      body: (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <CopyBox label="Name" value={NAME} />
            <CopyBox label="MCP server URL" value={url} />
          </div>
          <p>
            Under authentication choose <b>OAuth</b>. Read the warning, press{" "}
            <b>I understand and want to continue</b>, then create it.
          </p>
        </>
      ),
    },
    {
      id: "connect",
      title: "Sign in and paste your key",
      body: (
        <>
          <p>ChatGPT opens a page from this site:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Paste the key from step 2 and press Connect.</li>
            <li>Check what your key allows, then press Continue to go back to ChatGPT.</li>
          </ol>
          <Never />
        </>
      ),
    },
    {
      id: "chat",
      title: "Use it in a chat",
      body: (
        <p>
          In a chat, type <b>@</b> and pick <b>{NAME}</b>, then ask your question.
        </p>
      ),
    },
    trySlide("ChatGPT"),
  ]);
}

export function BeginnerGuide() {
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold">Set it up, step by step</h2>
      <p className="mt-1 text-neutral-700">Which app do you use?</p>
      <div className="mt-4">
        <LandingTabs
          tabs={[
            {
              id: "claude",
              label: "Claude",
              content: <Tutorial app="claude" slides={claudeSlides()} />,
            },
            {
              id: "chatgpt",
              label: "ChatGPT",
              content: <Tutorial app="chatgpt" slides={chatgptSlides()} />,
            },
          ]}
        />
      </div>
    </div>
  );
}

export function TechyCard() {
  const url = mcpUrl();
  const json = `{\n  "mcpServers": {\n    "eci-events": { "url": "${url}" }\n  }\n}`;
  return (
    <div className="space-y-5 rounded-2xl border border-neutral-200 p-5 sm:p-8">
      <h2 className="font-display text-2xl font-semibold">For people who know MCP</h2>
      <GoalLine who="your client" />
      <CopyBox label="MCP server URL (Streamable HTTP)" value={url} />
      <CopyBox label="Claude Code" value={`claude mcp add --transport http eci-events ${url}`} />
      <div>
        <p className="mb-1 text-sm font-medium text-neutral-700">
          JSON clients (Cursor, VS Code, Windsurf)
        </p>
        <pre className="overflow-x-auto rounded-lg border border-neutral-300 bg-neutral-50 p-3 font-mono text-sm">
          {json}
        </pre>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-neutral-800">
        <li>
          MCP 2026-07-28, stateless; 2025-11-25 clients work too. OAuth 2.1 with PKCE S256; CIMD and
          DCR clients both supported. No token in the URL.
        </li>
        <li>
          Sign-in opens <code className="font-mono">/connect</code>, where you paste an EdgeOS key
          from{" "}
          <a className="underline" href={agenticAccessUrl()}>
            /portal/agentic-access
          </a>
          . Tools appear according to the key's scopes: events:read, rsvp:write, events:write,
          venues:write.
        </li>
        <li>
          Writes go through <code className="font-mono">edgeos_propose</code> then{" "}
          <code className="font-mono">edgeos_confirm</code>. Start with{" "}
          <code className="font-mono">edgeos_initialize</code>.
        </li>
        <li>
          Using an agent? Paste it this link and it can set itself up:{" "}
          <a className="font-medium underline" href="/connect.md">
            {origin().replace("https://", "")}/connect.md
          </a>
        </li>
        <li>
          Every instruction and tool schema:{" "}
          <a className="underline" href="/how-it-works">
            /how-it-works
          </a>
          . Key handling and code:{" "}
          <a className="underline" href="/trust">
            /trust
          </a>
          .
        </li>
      </ul>
    </div>
  );
}
