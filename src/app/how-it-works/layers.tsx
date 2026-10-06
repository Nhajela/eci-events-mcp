import { Mermaid } from "@/components/mermaid";
import { GUIDES } from "@/generated/guides";
import { SPEC_VERSION } from "@/generated/reference";
import { REPO_URL } from "@/lib/env";
import { formatIst } from "@/lib/time";
import { type CatalogTool, SAMPLE_ACCESS } from "@/mcp/catalog";
import { buildInitialize } from "@/mcp/initialize";
import { SERVER_INSTRUCTIONS } from "@/mcp/instructions";
import { PROMPTS } from "@/mcp/prompts";
import { ACTIONS } from "@/mcp/propose/actions";
import { CHECK_LIST } from "@/mcp/propose/check-list";
import { proposeContextSection, REVIEW_FAILED, STEERING } from "@/mcp/propose/register";
import { RUBRIC } from "@/mcp/propose/reviewer";
import { readContextSection } from "@/mcp/tools/read";
import policy from "../../../spec/route-policy.json";

const SPEC_PATH = "docs/superpowers/specs/2026-10-06-eci-events-mcp-design.md";
const SAMPLE_NOW = "2026-10-14T06:00:00Z";

function Pre({ children }: { children: string }) {
  return (
    <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg border border-neutral-200 bg-neutral-50 p-4 font-mono text-[13px] leading-relaxed">
      {children}
    </pre>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-10 font-display text-xl font-semibold">{children}</h3>;
}

export function NewToThis() {
  return (
    <div className="space-y-4 text-lg text-neutral-800">
      <p>
        Claude and ChatGPT can use “connectors”: small services that let them do things for you.
        This is one. It lets your AI read the Edge City calendar and, if you allow it, RSVP or host
        events for you.
      </p>
      <p>
        When you ask “what's on tonight?”, your AI doesn't guess. It asks this connector, which asks
        the Edge City system (EdgeOS) as you, and passes back the real list.
      </p>
      <p>
        We also give the AI a short set of house rules. The main ones: never make things up, always
        use India time, and never change anything, like an RSVP, until you've seen exactly what will
        happen and said yes. Every word of those rules is in the “Technical” tab. Nothing is hidden.
      </p>
      <p>
        Your EdgeOS key stays locked the whole time. See{" "}
        <a className="underline" href="/trust">
          How is this safe?
        </a>
      </p>
      <Mermaid
        caption="Asking a question"
        chart={`flowchart LR
  You -->|"what's on tonight?"| AI[Your AI]
  AI -->|asks, following our house rules| Us[This connector]
  Us -->|as you| EdgeOS
  EdgeOS -->|real events| Us
  Us -->|events in India time| AI
  AI -->|answer| You`}
      />
      <Mermaid
        caption="Changing something: you always see it first"
        chart={`flowchart LR
  A[You: RSVP me to the breathwork] --> B[AI asks us to check it]
  B --> C[We check: full? clashing? already over?]
  C --> D[AI shows you the exact summary and any warnings]
  D -->|you say yes| E[Only then is the RSVP made]
  D -->|you say no| F[Nothing happens]`}
      />
    </div>
  );
}

export function Curious({ tools }: { tools: CatalogTool[] }) {
  const reads = tools.filter(
    (t) =>
      t.annotations?.readOnlyHint &&
      !["edgeos_initialize", "edgeos_guide", "edgeos_propose"].includes(t.name),
  );
  return (
    <div className="space-y-4 text-neutral-800">
      <p>A connector gives an AI three kinds of things. Here is what ours contains.</p>
      <H>1. Instructions</H>
      <p>Text the AI reads so it behaves well, in four layers from always-on to on-demand:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <b>Server instructions</b>: a few lines every AI app receives when it connects.
        </li>
        <li>
          <b>Start-here tool</b> (<code>edgeos_initialize</code>): the AI calls it first. It says
          today's date in India time, what your key allows, the rules, and which tools to use.
          Because it arrives as the latest tool result, the rules stay fresh in long chats.
        </li>
        <li>
          <b>Guides</b> (<code>edgeos_guide</code>): deeper notes on one topic (schedule, recurring
          events, RSVPs, hosting, venues, limits) plus the exact EdgeOS fields, generated from
          EdgeOS's own published API description.
        </li>
        <li>
          <b>Nudges at the moment of action</b>: when the AI proposes a change, our reply carries
          the summary to show you, any warnings, the matching guideline, and the instruction to wait
          for your yes.
        </li>
      </ul>
      <H>2. Tools</H>
      <p>Actions the AI can take. You only get the ones your key allows.</p>
      <ul className="list-disc space-y-1 pl-5">
        {reads.map((t) => (
          <li key={t.name}>
            <code>{t.name}</code>: {t.description}
          </li>
        ))}
        <li>
          <code>edgeos_propose</code> then <code>edgeos_confirm</code>: every change, in two steps.
          Changes available: {Object.keys(ACTIONS).join(", ")}.
        </li>
      </ul>
      <H>3. Prompts</H>
      <p>
        Ready-made starting points you can pick in your AI app:{" "}
        {PROMPTS.map((p) => p.title).join(", ")}.
      </p>
      <H>The checks before any change</H>
      <ul className="list-disc space-y-1 pl-5">
        {CHECK_LIST.map((c) => (
          <li key={c.rule}>
            <b>{c.kind === "blocker" ? "Stops it" : c.kind === "warning" ? "Warns" : "Rule"}</b> (
            {c.action}): {c.rule}
          </li>
        ))}
      </ul>
      <H>Where the instructions come from</H>
      <p>
        Field names and allowed values come from EdgeOS's published API description (OpenAPI,
        version {SPEC_VERSION}), saved in the repo and checked daily; if EdgeOS changes, a pull
        request shows exactly what changed. The house rules and guides are written by us and live in
        the <code>guides/</code> folder.
      </p>
    </div>
  );
}

export function Technical({
  tools,
  prompts,
}: {
  tools: CatalogTool[];
  prompts: { name: string; description?: string }[];
}) {
  const sampleInit = buildInitialize(SAMPLE_ACCESS, new Date(SAMPLE_NOW), [
    readContextSection,
    proposeContextSection,
  ]);
  return (
    <div className="space-y-4 text-neutral-800">
      <p>
        Everything below is rendered from the running code, not copied by hand. Source:{" "}
        <a className="underline" href={REPO_URL}>
          {REPO_URL.replace("https://", "")}
        </a>
        . Design spec:{" "}
        <a className="underline" href={`${REPO_URL}/blob/main/${SPEC_PATH}`}>
          {SPEC_PATH}
        </a>
        .
      </p>

      <p>
        This page reflects this deployment's configuration; it is rebuilt on every deploy and
        refreshed hourly.
      </p>

      <H>Protocol</H>
      <p>
        Streamable HTTP at <code>/api/mcp</code>, MCP 2026-07-28 (stateless, no session), with
        2025-11-25 clients served by the SDK's legacy handling. A fresh <code>McpServer</code> is
        built per request for the caller's scopes. Auth is OAuth 2.1 with PKCE S256, CIMD and DCR
        clients, and sealed JWE tokens; see{" "}
        <a className="underline" href="/trust">
          /trust
        </a>
        .
      </p>

      <H>Server instructions (sent on connect)</H>
      <Pre>{SERVER_INSTRUCTIONS}</Pre>

      <H>
        <code>edgeos_initialize</code> output for a sample attendee with every scope, at{" "}
        {formatIst(SAMPLE_NOW)}
      </H>
      <Pre>{sampleInit}</Pre>

      <H>Tools exactly as the AI receives them ({tools.length})</H>
      {tools.map((t) => (
        <details key={t.name} className="rounded-lg border border-neutral-200 p-3">
          <summary className="cursor-pointer font-mono">
            {t.name}
            {t.annotations?.readOnlyHint ? " · read-only" : ""}
            {t.annotations?.destructiveHint ? " · makes changes" : ""}
          </summary>
          <p className="mt-2">{t.description}</p>
          <Pre>
            {JSON.stringify({ inputSchema: t.inputSchema, annotations: t.annotations }, null, 2)}
          </Pre>
        </details>
      ))}

      <H>Proposal steering (added to every proposal reply)</H>
      <Pre>{STEERING}</Pre>

      <H>Second-model reviewer rubric (event and venue proposals, when enabled)</H>
      <Pre>{RUBRIC}</Pre>
      <p>
        The reviewer runs only when the operator has configured a reviewer model (
        <code>REVIEWER_MODEL</code> and Vertex AI credentials). It is a Gemini model on Vertex AI
        and receives this rubric, the hosting or venues guide, and the proposal's fields. Never
        sent: keys or attendee lists. If the reviewer is configured but can't run (an error or a
        timeout), the proposal still goes ahead and the AI is told:
      </p>
      <Pre>{REVIEW_FAILED}</Pre>

      <H>Prompts ({prompts.length})</H>
      {PROMPTS.map((p) => (
        <div key={p.name}>
          <p className="font-mono">
            {p.name}: {p.description}
          </p>
          <Pre>{p.text}</Pre>
        </div>
      ))}

      <H>
        Guides (served by <code>edgeos_guide</code>, and quoted in proposals)
      </H>
      {Object.entries(GUIDES).map(([k, v]) => (
        <details key={k} className="rounded-lg border border-neutral-200 p-3">
          <summary className="cursor-pointer font-mono">{k}</summary>
          <Pre>{v}</Pre>
        </details>
      ))}

      <H>Write actions</H>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Action</th>
              <th>Needs</th>
              <th>Second-model review</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(ACTIONS).map(([n, a]) => (
              <tr key={n} className="border-b">
                <td className="py-2 font-mono">{n}</td>
                <td>{a.scope}</td>
                <td>{a.reviewed ? "yes, if enabled" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H>EdgeOS routes an API key can reach (copied from EdgeOS's own policy)</H>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Method</th>
              <th>Path</th>
              <th>Scope</th>
            </tr>
          </thead>
          <tbody>
            {policy.map((r) => (
              <tr key={`${r.method}${r.path}`} className="border-b">
                <td className="py-2 font-mono">{r.method}</td>
                <td className="font-mono">
                  {r.path}
                  {r.exact ? "" : "…"}
                </td>
                <td>{r.scopes.join(" or ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H>Analytics</H>
      <p>
        Analytics runs only when the operator has set <code>POSTHOG_PROJECT_TOKEN</code> and{" "}
        <code>POSTHOG_ID_SALT</code>. Then PostHog MCP Analytics records one event per tool call:
        tool name, success or error, duration, AI app and model, the AI's one-line reason (a{" "}
        <code>context</code> argument PostHog adds), a conversation id, and requests for missing
        features (a <code>get_more_tools</code> tool PostHog adds). It also records connection and
        listing events (initialize, tools list, prompts list), and every event carries the popup
        slug and your key's scopes. Tool arguments, responses and error messages are dropped before
        sending. The only identity is an HMAC of your key's public prefix; there are no person
        profiles. Proposal events record the action, the warning count, and whether it was
        confirmed. When analytics is on, the tool list above also shows the PostHog-added{" "}
        <code>context</code> and <code>conversation_id</code> arguments and{" "}
        <code>get_more_tools</code>, because that is what the AI sees.
      </p>
    </div>
  );
}
