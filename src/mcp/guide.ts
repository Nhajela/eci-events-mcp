import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { GUIDES, type GuideTopic } from "@/generated/guides";
import { ROUTES } from "@/generated/reference";
import type { Access } from "@/lib/types";
import { ok } from "./lib/result";
import { withToolHandler } from "./lib/tool-wrapper";
import { ACTIONS, type ActionName } from "./propose/actions";

export const TOPIC_ROUTES: Record<GuideTopic, string[]> = {
  schedule: ["GET /events/portal/events", "GET /events/portal/events/{event_id}"],
  recurring: ["GET /events/portal/events", "GET /event-participants/portal/participants"],
  rsvp: [
    "POST /event-participants/portal/register/{event_id}",
    "POST /event-participants/portal/cancel-registration/{event_id}",
  ],
  hosting: [
    "POST /events/portal/events",
    "PATCH /events/portal/events/{event_id}",
    "POST /events/portal/events/check-availability",
  ],
  venues: [
    "GET /event-venues/portal/venues",
    "POST /event-venues/portal/venues",
    "PATCH /event-venues/portal/venues/{venue_id}",
  ],
  limits: [],
};

/** Write routes are reached only through propose actions, so their tables list only what those actions accept. */
const ROUTE_ACTIONS: Record<string, ActionName[]> = {
  "POST /events/portal/events": ["create_event"],
  "PATCH /events/portal/events/{event_id}": ["update_event"],
  "POST /events/portal/events/check-availability": ["create_event"],
  "POST /event-venues/portal/venues": ["create_venue"],
  "PATCH /event-venues/portal/venues/{venue_id}": ["update_venue"],
};

export const PORTAL_ONLY_NOTE =
  "Other EdgeOS fields (e.g. recurrence, cover image) can't be set through this server; use the Edge City portal.";

function accepted(key: string): Set<string> | null {
  const actions = ROUTE_ACTIONS[key];
  if (!actions) return null;
  return new Set(actions.flatMap((a) => Object.keys(ACTIONS[a].schema.shape)));
}

function routeTable(key: string): string {
  const r = ROUTES[key];
  if (!r) return "";
  const allow = accepted(key);
  const fields = [...r.query, ...r.body]
    .filter((f) => !allow || allow.has(f.name))
    .map(
      (f) =>
        `| ${f.name}${f.required ? " *" : ""} | ${f.type}${f.enum ? ` (${f.enum.join(", ")})` : ""} | ${f.description.replace(/\|/g, "/").replace(/\n/g, " ")} |`,
    )
    .join("\n");
  return `### ${r.summary} (\`${key}\`, needs ${r.scopes.join(" or ")})\n| field | type | notes |\n|---|---|---|\n${fields}`;
}

export function guideFor(topic: GuideTopic): string {
  const keys = TOPIC_ROUTES[topic];
  const tables = keys.map(routeTable).filter(Boolean);
  const note = keys.some((k) => ROUTE_ACTIONS[k]) ? PORTAL_ONLY_NOTE : "";
  return [GUIDES[topic], tables.length ? `## EdgeOS reference\n${tables.join("\n\n")}` : "", note]
    .filter(Boolean)
    .join("\n\n");
}

export function registerGuide(server: McpServer, access: Access): void {
  const topics = Object.keys(GUIDES) as [GuideTopic, ...GuideTopic[]];
  server.registerTool(
    "edgeos_guide",
    {
      title: "Guide",
      description: `Detailed guidance plus the EdgeOS field reference for one area: ${Object.keys(GUIDES).join(", ")}.`,
      inputSchema: z.object({ topic: z.enum(topics).describe("Which area.") }),
      annotations: { readOnlyHint: true },
    },
    withToolHandler("edgeos_guide", access, async (p) => ok(guideFor(p.topic))),
  );
}
