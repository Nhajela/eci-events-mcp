import { z } from "zod";
import type { GuideTopic } from "@/generated/guides";
import { ENUMS } from "@/generated/reference";
import { edgeos } from "@/lib/edgeos/client";
import type { EdgeEvent, Venue } from "@/lib/edgeos/types";
import { formatIstRange } from "@/lib/time";
import type { Access, WriteScope } from "@/lib/types";

const withOffset = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/,
    "Use ISO-8601 with an offset, e.g. 2026-10-14T18:30:00+05:30 for 6:30 PM IST",
  );
const id = z.string().min(1);
const visibility = z.enum(
  (ENUMS.EventVisibility ?? ["public", "private", "unlisted"]) as [string, ...string[]],
);

const eventFields = {
  title: z.string().min(3).max(200),
  start_time: withOffset,
  end_time: withOffset,
  content: z.string().max(10_000).optional().describe("Description"),
  venue_id: z.string().optional(),
  custom_location_name: z.string().optional(),
  custom_location_url: z.string().url().optional(),
  meeting_url: z.string().url().optional(),
  max_participant: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  kind: z.string().optional(),
  track_id: z.string().optional(),
  visibility: visibility.optional(),
  require_approval: z.boolean().optional(),
};

const venueFields = {
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  location: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
};

const strip = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

export type ActionName =
  | "rsvp"
  | "cancel_rsvp"
  | "create_event"
  | "update_event"
  | "cancel_event"
  | "hide_event"
  | "unhide_event"
  | "invite"
  | "remove_invitation"
  | "create_venue"
  | "update_venue"
  | "delete_venue";

export type ActionDef = {
  scope: WriteScope;
  title: string;
  guide: GuideTopic;
  reviewed: boolean;
  schema: z.ZodObject;
  // biome-ignore lint/suspicious/noExplicitAny: params are validated by `schema` before execute runs
  execute(access: Access, params: any): Promise<{ text: string; data: unknown }>;
};

export const ACTIONS: Record<ActionName, ActionDef> = {
  rsvp: {
    scope: "rsvp:write",
    title: "RSVP",
    guide: "rsvp",
    reviewed: false,
    schema: z.object({
      event_id: id,
      occurrence_start: z.string().optional(),
      message: z.string().max(500).optional(),
    }),
    async execute(a, p) {
      const data = await edgeos(
        a.key,
        "POST",
        `/event-participants/portal/register/${encodeURIComponent(String(p.event_id))}`,
        { body: strip({ occurrence_start: p.occurrence_start, message: p.message }) },
      );
      return { text: "Done: the attendee is RSVPed.", data };
    },
  },
  cancel_rsvp: {
    scope: "rsvp:write",
    title: "Cancel RSVP",
    guide: "rsvp",
    reviewed: false,
    schema: z.object({ event_id: id, occurrence_start: z.string().optional() }),
    async execute(a, p) {
      const data = await edgeos(
        a.key,
        "POST",
        `/event-participants/portal/cancel-registration/${encodeURIComponent(String(p.event_id))}`,
        { body: strip({ occurrence_start: p.occurrence_start }) },
      );
      return { text: "Done: the RSVP is cancelled.", data };
    },
  },
  create_event: {
    scope: "events:write",
    title: "Host a new event",
    guide: "hosting",
    reviewed: true,
    schema: z.object(eventFields),
    async execute(a, p) {
      const e = await edgeos<EdgeEvent>(a.key, "POST", "/events/portal/events", {
        body: { ...strip(p), popup_id: a.popup.id, timezone: "Asia/Kolkata" },
      });
      return { text: `Done: “${e.title}” is created (id ${e.id}, status ${e.status}).`, data: e };
    },
  },
  update_event: {
    scope: "events:write",
    title: "Change an event",
    guide: "hosting",
    reviewed: true,
    schema: z.object({
      event_id: id,
      ...Object.fromEntries(Object.entries(eventFields).map(([k, v]) => [k, v.optional()])),
    }),
    async execute(a, p) {
      const { event_id, ...rest } = p;
      const e = await edgeos<EdgeEvent>(
        a.key,
        "PATCH",
        `/events/portal/events/${encodeURIComponent(String(event_id))}`,
        { body: strip(rest) },
      );
      return { text: `Done: “${e.title}” is updated.`, data: e };
    },
  },
  cancel_event: {
    scope: "events:write",
    title: "Cancel an event",
    guide: "hosting",
    reviewed: false,
    schema: z.object({ event_id: id }),
    async execute(a, p) {
      const data = await edgeos(
        a.key,
        "POST",
        `/events/portal/events/${encodeURIComponent(String(p.event_id))}/cancel`,
      );
      return { text: "Done: the event is cancelled.", data };
    },
  },
  hide_event: {
    scope: "events:write",
    title: "Hide an event",
    guide: "hosting",
    reviewed: false,
    schema: z.object({ event_id: id }),
    async execute(a, p) {
      const data = await edgeos(
        a.key,
        "POST",
        `/events/portal/events/${encodeURIComponent(String(p.event_id))}/hide`,
      );
      return { text: "Done: the event is hidden from the calendar.", data };
    },
  },
  unhide_event: {
    scope: "events:write",
    title: "Unhide an event",
    guide: "hosting",
    reviewed: false,
    schema: z.object({ event_id: id }),
    async execute(a, p) {
      const data = await edgeos(
        a.key,
        "DELETE",
        `/events/portal/events/${encodeURIComponent(String(p.event_id))}/hide`,
      );
      return { text: "Done: the event is visible again.", data };
    },
  },
  invite: {
    scope: "events:write",
    title: "Invite people",
    guide: "hosting",
    reviewed: false,
    schema: z.object({ event_id: id, emails: z.array(z.string().email()).min(1).max(100) }),
    async execute(a, p) {
      const data = await edgeos(
        a.key,
        "POST",
        `/events/portal/events/${encodeURIComponent(String(p.event_id))}/invitations`,
        { body: { emails: p.emails } },
      );
      return { text: `Done: invited ${p.emails.length} people.`, data };
    },
  },
  remove_invitation: {
    scope: "events:write",
    title: "Remove an invitation",
    guide: "hosting",
    reviewed: false,
    schema: z.object({ event_id: id, invitation_id: id }),
    async execute(a, p) {
      const data = await edgeos(
        a.key,
        "DELETE",
        `/events/portal/events/${encodeURIComponent(String(p.event_id))}/invitations/${encodeURIComponent(String(p.invitation_id))}`,
      );
      return { text: "Done: the invitation is removed.", data };
    },
  },
  create_venue: {
    scope: "venues:write",
    title: "Add a venue",
    guide: "venues",
    reviewed: true,
    schema: z.object(venueFields),
    async execute(a, p) {
      const v = await edgeos<Venue>(a.key, "POST", "/event-venues/portal/venues", {
        body: { ...strip(p), popup_id: a.popup.id },
      });
      return { text: `Done: venue “${v.title}” is added (id ${v.id}).`, data: v };
    },
  },
  update_venue: {
    scope: "venues:write",
    title: "Change a venue",
    guide: "venues",
    reviewed: true,
    schema: z.object({
      venue_id: id,
      ...Object.fromEntries(Object.entries(venueFields).map(([k, v]) => [k, v.optional()])),
    }),
    async execute(a, p) {
      const { venue_id, ...rest } = p;
      const v = await edgeos<Venue>(
        a.key,
        "PATCH",
        `/event-venues/portal/venues/${encodeURIComponent(String(venue_id))}`,
        { body: strip(rest) },
      );
      return { text: `Done: venue “${v.title}” is updated.`, data: v };
    },
  },
  delete_venue: {
    scope: "venues:write",
    title: "Delete a venue",
    guide: "venues",
    reviewed: false,
    schema: z.object({ venue_id: id }),
    async execute(a, p) {
      const data = await edgeos(
        a.key,
        "DELETE",
        `/event-venues/portal/venues/${encodeURIComponent(String(p.venue_id))}`,
      );
      return { text: "Done: the venue is deleted.", data };
    },
  },
};

export function whenText(start: string, end: string): string {
  return formatIstRange(start, end);
}
