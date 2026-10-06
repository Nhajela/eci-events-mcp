import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { edgeos } from "@/lib/edgeos/client";
import type {
  DayEventCount,
  EdgeEvent,
  ListModel,
  Participant,
  RsvpEligibility,
  Track,
  Venue,
  VenueAvailability,
} from "@/lib/edgeos/types";
import { formatIstRange, istDate, istDayLabel, istDayWindow } from "@/lib/time";
import { type Access, hasScope } from "@/lib/types";
import type { ContextSection } from "@/mcp/lib/context";
import { ok } from "@/mcp/lib/result";
import { withToolHandler } from "@/mcp/lib/tool-wrapper";
import { eventRow, eventsMarkdown, rangeText } from "./format";

const RO = { readOnlyHint: true, openWorldHint: true } as const;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use an India date as YYYY-MM-DD");
const uuid = z.string().min(1);

export const readContextSection: ContextSection = (a) =>
  hasScope(a, "events:read")
    ? `## Schedule (read)
- \`edgeos_list_events\`: events for India dates (\`from\` YYYY-MM-DD, \`days\` 1–31, default next 7 days). Filters: search, tags, kind, venue_id, track_ids, mine (my RSVPs), managed (events I host), highlighted_only.
- \`edgeos_get_event\`: one event with description, host, attendee count and my RSVP status. Pass \`occurrence_start\` for one occurrence of a recurring event.
- \`edgeos_calendar_summary\`: how many events per day.
- \`edgeos_list_participants\`: who is going to one event (host and hidden attendees aren't listed).
- \`edgeos_rsvp_eligibility\`: whether this attendee may RSVP at all.
- \`edgeos_list_tracks\`, \`edgeos_track_events\`: programme tracks.
- \`edgeos_list_venues\`, \`edgeos_venue_availability\`: places and when they're free.
- \`edgeos_list_invitations\`: invitations on an event the attendee hosts.
Times come back in IST already. Quote them as given.`
    : null;

async function venueNames(access: Access): Promise<Map<string, string>> {
  const v = await edgeos<ListModel<Venue>>(access.key, "GET", "/event-venues/portal/venues", {
    query: { popup_id: access.popup.id, limit: 1000 },
  });
  return new Map(v.results.map((x) => [x.id, x.title]));
}

export function registerReadTools(server: McpServer, access: Access, now: Date): void {
  if (!hasScope(access, "events:read")) return;
  const today = istDate(now);

  server.registerTool(
    "edgeos_list_events",
    {
      title: "List events",
      description:
        "List published events in an India-date window, grouped by day, with IST times, venue, and the attendee's RSVP status.",
      inputSchema: z.object({
        from: isoDate
          .optional()
          .describe("First India date, YYYY-MM-DD. Defaults to today in IST."),
        days: z.number().int().min(1).max(31).optional().describe("Number of days, default 7."),
        search: z.string().optional().describe("Words in the title."),
        tags: z.array(z.string()).optional().describe("Match any of these tags."),
        kind: z.string().optional(),
        venue_id: z.string().optional(),
        track_ids: z.array(z.string()).optional(),
        mine: z.boolean().optional().describe("Only events this attendee RSVPed to."),
        managed: z.boolean().optional().describe("Only events this attendee hosts or co-hosts."),
        highlighted_only: z.boolean().optional().describe("Only events organisers featured."),
      }),
      annotations: RO,
    },
    withToolHandler("edgeos_list_events", access, async (p) => {
      const w = istDayWindow(p.from ?? today, p.days ?? 7);
      const [list, venues] = await Promise.all([
        edgeos<ListModel<EdgeEvent>>(access.key, "GET", "/events/portal/events", {
          query: {
            popup_id: access.popup.id,
            event_status: "published",
            start_after: w.startAfter,
            start_before: w.startBefore,
            search: p.search,
            tags: p.tags,
            kind: p.kind,
            venue_id: p.venue_id,
            track_ids: p.track_ids,
            rsvped_only: p.mine || undefined,
            managed_only: p.managed || undefined,
          },
        }),
        venueNames(access),
      ]);
      const events = p.highlighted_only ? list.results.filter((e) => e.highlighted) : list.results;
      const header = `Events from ${istDayLabel(p.from ?? today)} for ${p.days ?? 7} day(s), times in IST:\n\n`;
      return ok(header + eventsMarkdown(events, venues), {
        events: events.map((e) => eventRow(e, venues)),
      });
    }),
  );

  server.registerTool(
    "edgeos_get_event",
    {
      title: "Get event",
      description:
        "One event in full: description, IST time, place, host, attendee count and the attendee's RSVP status.",
      inputSchema: z.object({
        event_id: uuid,
        occurrence_start: z
          .string()
          .optional()
          .describe("For a recurring event, the occurrence's start_time exactly as listed."),
      }),
      annotations: RO,
    },
    withToolHandler("edgeos_get_event", access, async (p) => {
      const [e, venues] = await Promise.all([
        edgeos<EdgeEvent>(
          access.key,
          "GET",
          `/events/portal/events/${encodeURIComponent(p.event_id)}`,
          { query: { occurrence_start: p.occurrence_start } },
        ),
        venueNames(access),
      ]);
      const lines = [
        `## ${e.title}`,
        formatIstRange(e.start_time, e.end_time),
        `Place: ${e.venue_id ? (venues.get(e.venue_id) ?? "venue") : (e.custom_location_name ?? "not set")}${e.custom_location_url ? ` (${e.custom_location_url})` : ""}`,
        e.host_display_name ? `Host: ${e.host_display_name}` : null,
        `${e.attendee_count ?? 0} going${e.max_participant ? ` (max ${e.max_participant})` : ""}`,
        `Your RSVP: ${e.my_rsvp_status ?? "none"}`,
        e.require_approval ? "The host approves each RSVP." : null,
        e.tags.length ? `Tags: ${e.tags.join(", ")}` : null,
        e.meeting_url ? `Online: ${e.meeting_url}` : null,
        "",
        (e.content ?? "No description.").slice(0, 2000),
      ].filter((l) => l !== null);
      return ok(lines.join("\n"), {
        event: {
          ...eventRow(e, venues),
          attendee_count: e.attendee_count ?? 0,
          max_participant: e.max_participant,
          content: e.content,
        },
      });
    }),
  );

  server.registerTool(
    "edgeos_calendar_summary",
    {
      title: "Events per day",
      description: "How many published events fall on each India day in a window.",
      inputSchema: z.object({
        from: isoDate.optional(),
        days: z.number().int().min(1).max(31).optional(),
      }),
      annotations: RO,
    },
    withToolHandler("edgeos_calendar_summary", access, async (p) => {
      const w = istDayWindow(p.from ?? today, p.days ?? 14);
      const days = await edgeos<DayEventCount[]>(
        access.key,
        "GET",
        "/events/portal/events/calendar-summary",
        {
          query: {
            popup_id: access.popup.id,
            start_after: w.startAfter,
            start_before: w.startBefore,
          },
        },
      );
      const text = days.length
        ? days
            .map(
              (d) =>
                `- ${/^\d{4}-\d{2}-\d{2}/.test(d.day) ? istDayLabel(d.day.slice(0, 10)) : d.day}: ${d.count}`,
            )
            .join("\n")
        : "No events in this window.";
      return ok(text, { days });
    }),
  );

  server.registerTool(
    "edgeos_list_participants",
    {
      title: "Who's going",
      description:
        "People who RSVPed to one event. The host and attendees who hide their name aren't listed. For a recurring event pass occurrence_start.",
      inputSchema: z.object({ event_id: uuid, occurrence_start: z.string().optional() }),
      annotations: RO,
    },
    withToolHandler("edgeos_list_participants", access, async (p) => {
      const rows: Participant[] = [];
      for (let skip = 0; skip < 5000; skip += 1000) {
        const page = await edgeos<ListModel<Participant>>(
          access.key,
          "GET",
          "/event-participants/portal/participants",
          {
            query: {
              event_id: p.event_id,
              occurrence_start: p.occurrence_start,
              skip,
              limit: 1000,
            },
          },
        );
        rows.push(...page.results);
        if (skip + page.results.length >= page.paging.total || page.results.length === 0) break;
      }
      const going = rows.filter((r) => r.status !== "cancelled");
      const names = going.map(
        (r) =>
          `- ${[r.first_name, r.last_name].filter(Boolean).join(" ") || "(name hidden)"} · ${r.status}`,
      );
      return ok(
        going.length ? `${going.length} going:\n${names.join("\n")}` : "Nobody listed yet.",
        { participants: going },
      );
    }),
  );

  server.registerTool(
    "edgeos_rsvp_eligibility",
    {
      title: "Can I RSVP?",
      description:
        "Whether this attendee is allowed to RSVP to events in the popup, and why not if they can't.",
      inputSchema: z.object({}),
      annotations: RO,
    },
    withToolHandler("edgeos_rsvp_eligibility", access, async () => {
      const r = await edgeos<RsvpEligibility>(
        access.key,
        "GET",
        `/event-participants/portal/eligibility/${encodeURIComponent(access.popup.id)}`,
      );
      return ok(
        r.allowed ? "Yes, this attendee can RSVP." : `No: ${r.reason ?? "EdgeOS gave no reason."}`,
        r,
      );
    }),
  );

  server.registerTool(
    "edgeos_list_invitations",
    {
      title: "Event invitations",
      description: "Invitations on an event the attendee hosts.",
      inputSchema: z.object({ event_id: uuid }),
      annotations: RO,
    },
    withToolHandler("edgeos_list_invitations", access, async (p) => {
      const r = await edgeos<unknown>(
        access.key,
        "GET",
        `/events/portal/events/${encodeURIComponent(p.event_id)}/invitations`,
      );
      const list = (
        Array.isArray(r) ? r : ((r as { results?: unknown[] })?.results ?? [])
      ) as Record<string, unknown>[];
      const lines = list.map(
        (i) =>
          `- ${String(i.email ?? i.invitee_email ?? i.id)}${i.status ? ` · ${String(i.status)}` : ""}`,
      );
      return ok(lines.length ? lines.join("\n") : "No invitations.", { invitations: list });
    }),
  );

  server.registerTool(
    "edgeos_list_tracks",
    {
      title: "Programme tracks",
      description: "The popup's programme tracks.",
      inputSchema: z.object({ search: z.string().optional() }),
      annotations: RO,
    },
    withToolHandler("edgeos_list_tracks", access, async (p) => {
      const r = await edgeos<ListModel<Track>>(access.key, "GET", "/tracks/portal/tracks", {
        query: { popup_id: access.popup.id, search: p.search, limit: 1000 },
      });
      return ok(
        r.results
          .map(
            (t) => `- **${t.name}** · id \`${t.id}\`${t.description ? `: ${t.description}` : ""}`,
          )
          .join("\n") || "No tracks.",
        { tracks: r.results },
      );
    }),
  );

  server.registerTool(
    "edgeos_track_events",
    {
      title: "Track events",
      description: "Events in one programme track, with IST times.",
      inputSchema: z.object({ track_id: uuid }),
      annotations: RO,
    },
    withToolHandler("edgeos_track_events", access, async (p) => {
      const [r, venues] = await Promise.all([
        edgeos<ListModel<EdgeEvent>>(
          access.key,
          "GET",
          `/tracks/portal/tracks/${encodeURIComponent(p.track_id)}/events`,
          { query: { limit: 1000 } },
        ),
        venueNames(access),
      ]);
      return ok(eventsMarkdown(r.results, venues), {
        events: r.results.map((e) => eventRow(e, venues)),
      });
    }),
  );

  server.registerTool(
    "edgeos_list_venues",
    {
      title: "Venues",
      description: "Active venues in the popup with capacity and location.",
      inputSchema: z.object({ search: z.string().optional() }),
      annotations: RO,
    },
    withToolHandler("edgeos_list_venues", access, async (p) => {
      const r = await edgeos<ListModel<Venue>>(access.key, "GET", "/event-venues/portal/venues", {
        query: { popup_id: access.popup.id, search: p.search, limit: 1000 },
      });
      const lines = r.results.map(
        (v) =>
          `- **${v.title}** · ${v.location ?? "no address"}${v.capacity ? ` · up to ${v.capacity}` : ""} · ${v.booking_mode} · id \`${v.id}\``,
      );
      return ok(lines.join("\n") || "No venues.", { venues: r.results });
    }),
  );

  server.registerTool(
    "edgeos_venue_availability",
    {
      title: "Venue availability",
      description: "Open hours and busy slots for one venue on India dates, in IST.",
      inputSchema: z.object({
        venue_id: uuid,
        date: isoDate.optional(),
        days: z.number().int().min(1).max(7).optional(),
      }),
      annotations: RO,
    },
    withToolHandler("edgeos_venue_availability", access, async (p) => {
      const w = istDayWindow(p.date ?? today, p.days ?? 1);
      const r = await edgeos<VenueAvailability>(
        access.key,
        "GET",
        `/event-venues/portal/venues/${encodeURIComponent(p.venue_id)}/availability`,
        {
          query: { start: w.startAfter, end: w.startBefore },
        },
      );
      const open = r.open_ranges.map((x) => `- open ${rangeText(x)}`);
      const busy = r.busy.map((x) => `- busy ${rangeText(x)}`);
      return ok([...open, ...busy].join("\n") || "No opening hours set for this window.", r);
    }),
  );
}
