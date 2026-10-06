import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { agenticAccessUrl } from "@/lib/env";
import { formatIst } from "@/lib/time";
import { type Access, hasScope } from "@/lib/types";
import { type ContextSection, composeSections } from "./lib/context";
import { ok } from "./lib/result";
import { withToolHandler } from "./lib/tool-wrapper";

export const RULES = `## Rules
1. Never fabricate. If a tool didn't return it, say you don't know.
2. Times are India time (IST). Tools already convert; quote them as given.
3. Every change goes through \`edgeos_propose\`, then \`edgeos_confirm\` only after an explicit yes to the summary.
4. Never ask for the attendee's EdgeOS key in chat.
5. For depth on any area, call \`edgeos_guide\` with a topic: schedule, recurring, rsvp, hosting, venues, limits.`;

export const NOT_AVAILABLE = `## Not available here
EdgeOS doesn't let API keys reach these, so say so and point to the Edge City portal: messages to attendees, check-in and attendance, the attendee directory, anyone's profile, admin notes. EdgeOS has no recordings or transcripts.`;

function missing(access: Access): string | null {
  const lines: string[] = [];
  if (!hasScope(access, "rsvp:write")) lines.push("- This key can't RSVP (no “RSVP to events”).");
  if (!hasScope(access, "events:write"))
    lines.push("- This key can't host or edit events (no “Create events”).");
  if (!hasScope(access, "venues:write"))
    lines.push("- This key can't manage venues (no “Manage venues”).");
  if (!lines.length) return null;
  return `## Not enabled on this key\n${lines.join("\n")}\nIf the attendee wants these, they can make a new key at ${agenticAccessUrl()} with those boxes ticked, then reconnect.`;
}

export function buildInitialize(access: Access, now: Date, sections: ContextSection[]): string {
  const p = access.popup;
  const header = `# ${p.name}${p.startDate && p.endDate ? ` (${p.startDate} to ${p.endDate})` : ""}
Now: ${formatIst(now.toISOString())}
This key can: ${access.scopes.join(", ")}`;
  return [header, RULES, composeSections(access, sections), missing(access), NOT_AVAILABLE]
    .filter(Boolean)
    .join("\n\n");
}

export function registerInitialize(
  server: McpServer,
  access: Access,
  now: Date,
  sections: ContextSection[],
): void {
  server.registerTool(
    "edgeos_initialize",
    {
      title: "Start here",
      description:
        "Call first in every conversation. Returns today's date in IST, what this attendee's key allows, the rules, and which tools to use.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    withToolHandler("edgeos_initialize", access, async () =>
      ok(buildInitialize(access, now, sections)),
    ),
  );
}
