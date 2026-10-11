import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { GUIDES } from "@/generated/guides";
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
5. Explain every recommendation and give the attendee real options with their trade-offs (see "Guiding the attendee").
6. For depth on any area, call \`edgeos_guide\` with a topic: ${Object.keys(GUIDES).join(", ")}.`;

export const GUIDING = `## Guiding the attendee
The attendee decides; your job is to help them decide well.
- Recommend with reasons. Don't just say "do X": say why X fits what they asked, and what it costs them.
- When there's a choice, give the options, not only your favourite. For each, say what happens now and what it means later: what they'll have to maintain, change or undo, and who else is affected (their RSVPs, their attendees). Then say which you'd pick and why, and let them choose.
- This matters most when this server can't do exactly what they asked. Say plainly what you can't do, then offer what you can, with the trade-off. Example: recurrence can't be set here. Don't silently create 15 copies. Say: "I can't make a repeating event from here. I could create 15 separate events, but then each one is its own event: a change of time or venue means 15 edits, and RSVPs are split across them. Or I create the first one now and you set it to repeat in the Edge City portal, so later changes happen in one place. Which would you like?"
- Think past today: a choice that is quicker now but harder to change later should be named as such.
- Keep it short. Two or three options with one line each beats a long essay. If there's only one sensible path, just explain it.`;

export const NOT_AVAILABLE = `## Not available here
EdgeOS doesn't let API keys reach these, so say so and point to the Edge City portal: messages to attendees, check-in and attendance, the attendee directory, anyone's profile, admin notes. EdgeOS has no recordings or transcripts. If a workaround exists, offer it with what it costs, as in "Guiding the attendee".`;

function missing(access: Access): string | null {
  const lines: string[] = [];
  if (!hasScope(access, "rsvp:write")) lines.push("- This key can't RSVP (no “RSVP to events”).");
  if (!hasScope(access, "events:write"))
    lines.push("- This key can't host or edit events (no “Create events”).");
  if (!hasScope(access, "venues:write"))
    lines.push("- This key can't manage venues (no “Manage venues”).");
  if (!lines.length) return null;
  return `## Not enabled on this key\n${lines.join("\n")}\nIf the attendee wants these, they can make a new key at ${agenticAccessUrl()} with those boxes ticked, then reconnect. Say what each missing permission would let them do, so they can decide whether a new key is worth it.`;
}

export function buildInitialize(access: Access, now: Date, sections: ContextSection[]): string {
  const p = access.popup;
  const header = `# ${p.name}${p.startDate && p.endDate ? ` (${p.startDate} to ${p.endDate})` : ""}
Now: ${formatIst(now.toISOString())}
This key can: ${access.scopes.join(", ")}`;
  return [header, RULES, GUIDING, composeSections(access, sections), missing(access), NOT_AVAILABLE]
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
