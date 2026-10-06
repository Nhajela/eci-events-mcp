import { createHash } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { GUIDES } from "@/generated/guides";
import { seal, unseal } from "@/lib/seal";
import { type Access, hasScope, WRITE_SCOPES } from "@/lib/types";
import type { ContextSection } from "@/mcp/lib/context";
import { ok } from "@/mcp/lib/result";
import { ToolError, withToolHandler } from "@/mcp/lib/tool-wrapper";
import { ACTIONS, type ActionName } from "./actions";
import { runChecks } from "./checks";

export type Reviewer = (
  action: ActionName,
  params: Record<string, unknown>,
  summary: string,
) => Promise<string[] | null>;

type ProposalPayload = {
  action: ActionName;
  params: Record<string, unknown>;
  kh: string;
  summary: string;
};

const allowed = (a: Access) =>
  (Object.keys(ACTIONS) as ActionName[]).filter((n) => hasScope(a, ACTIONS[n].scope));

export const proposeContextSection: ContextSection = (a) => {
  const names = allowed(a);
  if (!names.length) return null;
  return `## Making changes
Every change is two steps:
1. \`edgeos_propose\` with \`action\` and \`params\`. Actions on this key: ${names.map((n) => `\`${n}\``).join(", ")}.
2. Show the attendee the summary word for word and raise each warning. Only after an explicit yes, call \`edgeos_confirm\` with the proposal code.
Times you send must carry an offset, e.g. 2026-10-14T18:30:00+05:30.`;
};

const keyHash = (key: string) => createHash("sha256").update(key).digest("hex").slice(0, 32);

export const STEERING =
  "Show the attendee the summary above, word for word, and raise each warning. Call `edgeos_confirm` only after they explicitly say yes. If they change anything, call `edgeos_propose` again with the new details. Call edgeos_confirm once per proposal; a repeated confirm repeats the change.";

export function registerProposeTools(
  server: McpServer,
  access: Access,
  now: Date,
  review?: Reviewer,
): void {
  const names = allowed(access);
  if (!WRITE_SCOPES.some((s) => hasScope(access, s)) || !names.length) return;

  server.registerTool(
    "edgeos_propose",
    {
      title: "Propose a change",
      description: `Check a change before making it. Returns a summary to show the attendee, warnings, the guideline for this action, and a proposal code for edgeos_confirm. Actions: ${names.join(", ")}. Use edgeos_guide for the fields each takes.`,
      inputSchema: z.object({
        action: z.enum(Object.keys(ACTIONS) as [ActionName, ...ActionName[]]),
        params: z
          .record(z.string(), z.unknown())
          .describe("Fields for the action, e.g. { event_id } for rsvp."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    withToolHandler(
      "edgeos_propose",
      access,
      async ({ action, params }: { action: ActionName; params: Record<string, unknown> }) => {
        const def = ACTIONS[action];
        if (!hasScope(access, def.scope)) {
          throw new ToolError("NOT_ENABLED", `This key doesn't have ${def.scope}.`);
        }
        const parsed = def.schema.safeParse(params);
        if (!parsed.success) {
          const issues = parsed.error.issues
            .map((i) => `${i.path.join(".") || "params"}: ${i.message}`)
            .join("; ");
          throw new ToolError("BAD_PARAMS", `${issues}. See edgeos_guide topic "${def.guide}".`);
        }
        const clean = parsed.data as Record<string, unknown>;
        const checks = await runChecks(action, clean, { access, now });
        if (checks.blockers.length) {
          return ok(
            `## Not possible as proposed\n${checks.blockers.map((b) => `- ${b}`).join("\n")}\n\nNo proposal code was issued. Tell the attendee why, fix what you can, and propose again.`,
            { blocked: true, blockers: checks.blockers },
          );
        }
        const notes = def.reviewed && review ? await review(action, clean, checks.summary) : null;
        const code = await seal(
          "proposal",
          {
            action,
            params: clean,
            kh: keyHash(access.key),
            summary: checks.summary,
          } satisfies ProposalPayload,
          { ttlSeconds: 600 },
        );
        const parts = [
          `## Proposal: ${def.title}`,
          `> ${checks.summary}`,
          checks.warnings.length
            ? `## Warnings (raise each one)\n${checks.warnings.map((w) => `- ${w}`).join("\n")}`
            : "No warnings.",
          notes?.length
            ? `## Second opinion (another model checked this against the hosting guidelines)\n${notes.map((n) => `- ${n}`).join("\n")}`
            : null,
          `## Guideline\n${GUIDES[def.guide]}`,
          `## Next\n${STEERING}`,
          `Proposal code (expires in 10 minutes): \`${code}\``,
        ].filter(Boolean);
        return ok(parts.join("\n\n"), {
          blocked: false,
          summary: checks.summary,
          params: clean,
          warnings: checks.warnings,
          review: notes ?? [],
          code,
        });
      },
    ),
  );

  server.registerTool(
    "edgeos_confirm",
    {
      title: "Confirm a change",
      description:
        "Carry out a proposal after the attendee explicitly said yes. Takes the proposal code from edgeos_propose.",
      inputSchema: z.object({ code: z.string().min(10) }),
      annotations: { destructiveHint: true, openWorldHint: true },
    },
    withToolHandler("edgeos_confirm", access, async ({ code }: { code: string }) => {
      const p = await unseal<ProposalPayload>("proposal", code);
      if (!p)
        throw new ToolError(
          "PROPOSAL_EXPIRED",
          "That proposal code is invalid or expired (10 minutes). Propose again.",
        );
      if (p.kh !== keyHash(access.key))
        throw new ToolError("WRONG_ATTENDEE", "That proposal was made for another attendee.");
      const def = ACTIONS[p.action];
      if (!hasScope(access, def.scope))
        throw new ToolError("NOT_ENABLED", `This key doesn't have ${def.scope}.`);
      const r = await def.execute(access, p.params);
      return ok(`${r.text}\n(${p.summary})`, {
        action: p.action,
        result: r.data as Record<string, unknown>,
      });
    }),
  );
}
