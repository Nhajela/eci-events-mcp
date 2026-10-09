// Plain-Markdown setup guide for AI agents, served at /connect.md and
// /agents/connect.md (rewrites in next.config.ts). Someone can paste that link
// into their agent and the agent can add the server itself.

import { agenticAccessUrl, mcpUrl, origin } from "@/lib/env";
import { SITE_NAME } from "@/lib/site";

/** What people paste into any other AI agent so it works out the setup for its own app. */
export function agentSetupPrompt(): string {
  return `Help me connect you to the Edge City India events MCP server, so you can find Edge City events for me, RSVP and host events.

1. Read the setup guide: ${origin()}/connect.md
2. Work out how the app I'm using you in adds a remote MCP server (Streamable HTTP, OAuth sign-in). If you're not sure, search that app's current docs.
3. If you can add it yourself, do it and tell me when to sign in. If you can't, give me short numbered steps for my exact app, with the server URL to paste.

Never ask me to paste my EdgeOS key into this chat. I'll paste it only on the page that opens when I sign in.`;
}

export function agentGuide(): string {
  const url = mcpUrl();
  return `# ${SITE_NAME}: setup guide for AI agents

You are reading this because a person wants you (their AI assistant) to connect to the Edge City India events system.

**The goal:** once connected, you can talk to Edge City's events system (EdgeOS) for this person: find events, check what's on, RSVP, plan their week and host events, always asking them before you change anything.

- MCP server URL: \`${url}\`
- Transport: Streamable HTTP (MCP 2026-07-28; 2025-11-25 clients also work)
- Auth: OAuth 2.1 with PKCE. Client ID Metadata Documents and Dynamic Client Registration are both supported. No token goes in the URL.
- Community built, not an official Edge City app. How keys are protected: ${origin()}/trust

## Rules

1. Never ask the user to paste their EdgeOS key into the chat. They paste it only on this server's connect page, which opens in their browser during sign-in.
2. Before connecting, the user needs an EdgeOS key. Ask them to make one at ${agenticAccessUrl()} and tick what they want you to do: read events (always on), RSVP, host events, manage venues. Write permissions need an expiry.

## If you can add MCP servers yourself

**Claude Code**

\`\`\`bash
claude mcp add --transport http eci-events ${url}
\`\`\`

Then run \`/mcp\` and choose eci-events to sign in. A browser window opens; the user pastes their key there.

**Cursor, VS Code, Windsurf and other JSON-configured clients** (add to the MCP servers config):

\`\`\`json
{
  "mcpServers": {
    "eci-events": {
      "url": "${url}"
    }
  }
}
\`\`\`

**Codex** (\`~/.codex/config.toml\`):

\`\`\`toml
[mcp_servers.eci-events]
url = "${url}"
\`\`\`

Then sign in when your client prompts (for Codex: \`codex mcp login eci-events\`).

## If the user is on claude.ai or ChatGPT

You can't add connectors there yourself. Walk the user through it:

**claude.ai / Claude app:** Customize → Connectors → + Add → Add custom connector. Name: "Edge City events". URL: \`${url}\`. Continue, choose Sign in now and "Use Claude's published identity" if asked, press Add, then Connect and paste the EdgeOS key on the page that opens. In a chat: + → Connectors → turn it on.

**ChatGPT:** Plugins → + → Add custom MCP server. Name: "Edge City events". URL: \`${url}\`. Choose OAuth, accept the warning ("I understand and want to continue"), create it, sign in and paste the key on the page that opens. In a chat, type @ and pick it. On some plans this needs developer mode: Settings → Apps → Advanced settings.

Step-by-step pictures: ${origin()}/setup

## Once connected

Call \`edgeos_initialize\` first. It tells you today's date in India time, what the key allows, and the rules. Every change (RSVP, hosting, venues) goes through \`edgeos_propose\`, then \`edgeos_confirm\` only after the user says yes.

Everything this server tells you, word for word: ${origin()}/how-it-works
`;
}

export function GET(): Response {
  return new Response(agentGuide(), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
}
