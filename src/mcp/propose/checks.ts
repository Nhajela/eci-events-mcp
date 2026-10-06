import { EdgeosError, edgeos } from "@/lib/edgeos/client";
import type { EdgeEvent, ListModel, RsvpEligibility, Venue } from "@/lib/edgeos/types";
import { isRecurring } from "@/lib/edgeos/types";
import { formatIstRange, formatIstTime, istDate, istDayWindow, istHour } from "@/lib/time";
import type { Access } from "@/lib/types";
import type { ActionName } from "./actions";

export type CheckContext = { access: Access; now: Date };
export type CheckResult = {
  blockers: string[];
  warnings: string[];
  summary: string;
  event?: EdgeEvent;
};

type P = Record<string, unknown>;

const ELLIPSIS = String.fromCharCode(0x2026);
const clip = (v: string) => (v.length > 80 ? `${v.slice(0, 80)}${ELLIPSIS}` : v);
const show = (v: unknown): string =>
  typeof v === "string" ? clip(v) : Array.isArray(v) ? clip(v.join(", ")) : clip(JSON.stringify(v));

/** "Changes: field: value; ..." for every param not in `skip`. */
function changesLine(p: P, skip: string[]): string {
  const parts = Object.entries(p)
    .filter(([k, v]) => !skip.includes(k) && v !== undefined)
    .map(([k, v]) => `${k}: ${show(v)}`);
  return parts.length ? ` Changes: ${parts.join("; ")}.` : "";
}
const s = (v: unknown) => (typeof v === "string" ? v : undefined);

async function venueMap(a: Access): Promise<Map<string, string>> {
  const v = await edgeos<ListModel<Venue>>(a.key, "GET", "/event-venues/portal/venues", {
    query: { popup_id: a.popup.id, limit: 1000 },
  });
  return new Map(v.results.map((x) => [x.id, x.title]));
}

async function getEvent(a: Access, id: string, occ?: string): Promise<EdgeEvent | null> {
  try {
    return await edgeos<EdgeEvent>(
      a.key,
      "GET",
      `/events/portal/events/${encodeURIComponent(id)}`,
      { query: { occurrence_start: occ } },
    );
  } catch (err) {
    if (err instanceof EdgeosError && err.status === 404) return null;
    throw err;
  }
}

const placeOf = (
  e: { venue_id?: string | null; custom_location_name?: string | null },
  venues: Map<string, string>,
) =>
  e.venue_id ? (venues.get(e.venue_id) ?? "the chosen venue") : (e.custom_location_name ?? null);

async function rsvpChecks(
  action: "rsvp" | "cancel_rsvp",
  p: P,
  { access, now }: CheckContext,
): Promise<CheckResult> {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const occ = s(p.occurrence_start);
  const [e, venues] = await Promise.all([
    getEvent(access, String(p.event_id), occ),
    venueMap(access),
  ]);
  if (!e)
    return {
      blockers: ["No such event, or it's hidden from this attendee."],
      warnings,
      summary: "",
    };

  const where = placeOf(e, venues);
  const verb = action === "rsvp" ? "RSVP to" : "Cancel the RSVP for";
  const summary = `${verb} “${e.title}”, ${formatIstRange(e.start_time, e.end_time)}${where ? `, at ${where}` : ""}.`;

  if (isRecurring(e) && !occ)
    blockers.push(
      "This is a recurring event. Pick one occurrence: list events for that day and pass its occurrence_start.",
    );
  if (occ && new Date(occ).getTime() !== new Date(e.start_time).getTime())
    blockers.push("No occurrence of this event starts at that time.");
  if (new Date(e.end_time) < now) blockers.push("This event is already over.");

  if (action === "rsvp") {
    if (e.my_rsvp_status === "registered" || e.my_rsvp_status === "checked_in")
      blockers.push("The attendee has already RSVPed to this event.");
    const elig = await edgeos<RsvpEligibility>(
      access.key,
      "GET",
      `/event-participants/portal/eligibility/${encodeURIComponent(access.popup.id)}`,
    );
    if (!elig.allowed)
      blockers.push(`EdgeOS says this attendee can't RSVP: ${elig.reason ?? "no reason given"}.`);
    if (e.max_participant && (e.attendee_count ?? 0) >= e.max_participant)
      warnings.push(
        `The event looks full (${e.attendee_count}/${e.max_participant}). EdgeOS may refuse or waitlist.`,
      );
    if (e.require_approval)
      warnings.push("The host approves each RSVP, so this is a request until they accept.");
    const prevDay = istDate(new Date(new Date(e.start_time).getTime() - 24 * 60 * 60 * 1000));
    const day = istDayWindow(prevDay, 2);
    const mine = await edgeos<ListModel<EdgeEvent>>(access.key, "GET", "/events/portal/events", {
      query: {
        popup_id: access.popup.id,
        event_status: "published",
        rsvped_only: true,
        start_after: day.startAfter,
        start_before: day.startBefore,
      },
    });
    for (const o of mine.results) {
      if (o.id === e.id) continue;
      if (
        new Date(o.start_time) < new Date(e.end_time) &&
        new Date(o.end_time) > new Date(e.start_time)
      ) {
        warnings.push(
          `This overlaps with “${o.title}” (${formatIstRange(o.start_time, o.end_time)}), which the attendee already RSVPed to.`,
        );
      }
    }
  } else if (e.my_rsvp_status !== "registered" && e.my_rsvp_status !== "checked_in") {
    blockers.push("The attendee isn't RSVPed to this event, so there's nothing to cancel.");
  }
  return { blockers, warnings, summary, event: e };
}

function timeChecks(
  start: string,
  end: string,
  { access, now }: CheckContext,
  blockers: string[],
  warnings: string[],
) {
  const s0 = new Date(start);
  const e0 = new Date(end);
  if (e0 <= s0) blockers.push("The event ends before it starts.");
  if (s0 < now) blockers.push("The start time is in the past.");
  const minutes = (e0.getTime() - s0.getTime()) / 60_000;
  if (minutes > 0 && minutes < 15)
    warnings.push(`It's only ${minutes} minutes long. Is that right?`);
  if (minutes > 360) warnings.push(`It runs ${Math.round(minutes / 60)} hours. Is that right?`);
  if (istHour(start) < 6)
    warnings.push(
      `It starts at ${formatIstTime(start)} IST. If the attendee meant a daytime time, the offset may be wrong (UTC read as IST).`,
    );
  const startDate = access.popup.startDate?.slice(0, 10);
  const endDate = access.popup.endDate?.slice(0, 10);
  if (startDate && endDate) {
    const d = istDate(s0);
    if (d < startDate || d > endDate)
      warnings.push(`That date is outside ${access.popup.name} (${startDate} to ${endDate}).`);
  }
}

async function hostingChecks(
  action: "create_event" | "update_event",
  p: P,
  ctx: CheckContext,
): Promise<CheckResult> {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const venues = await venueMap(ctx.access);
  let current: EdgeEvent | null = null;
  if (action === "update_event") {
    current = await getEvent(ctx.access, String(p.event_id));
    if (!current)
      return {
        blockers: ["No such event, or it's hidden from this attendee."],
        warnings,
        summary: "",
      };
  }
  const merged = { ...(current ?? {}), ...p } as P & {
    title: string;
    start_time: string;
    end_time: string;
  };
  const timeGiven = "start_time" in p || "end_time" in p;
  if (timeGiven) timeChecks(merged.start_time, merged.end_time, ctx, blockers, warnings);
  if (!s(merged.content))
    warnings.push(
      "There's no description. A few sentences on what happens and who it's for helps people decide.",
    );
  const where = placeOf(merged as never, venues);
  if (!where)
    warnings.push(
      "There's no venue or location. Pick a venue from edgeos_list_venues or set custom_location_name.",
    );
  if (s(merged.venue_id) && ("venue_id" in p || timeGiven)) {
    const r = await edgeos<{ available?: boolean; conflicts?: { title?: string }[] }>(
      ctx.access.key,
      "POST",
      "/events/portal/events/check-availability",
      {
        body: {
          venue_id: merged.venue_id,
          start_time: merged.start_time,
          end_time: merged.end_time,
          exclude_event_id: current?.id ?? null,
        },
      },
    );
    if (r && r.available === false) {
      const names = (r.conflicts ?? [])
        .map((c) => c.title)
        .filter(Boolean)
        .join(", ");
      blockers.push(
        `${where} isn't free then${names ? ` (booked: ${names})` : ""}. Pick another time or venue.`,
      );
    }
  }
  const verb = action === "create_event" ? "Create" : "Update";
  const extra =
    action === "create_event"
      ? changesLine(p, ["title", "start_time", "end_time", "venue_id", "custom_location_name"])
      : changesLine(p, ["event_id"]);
  const summary = `${verb} “${merged.title}”, ${formatIstRange(merged.start_time, merged.end_time)}${where ? `, at ${where}` : ""}.${extra}`;
  return { blockers, warnings, summary, event: current ?? undefined };
}

export async function runChecks(action: ActionName, p: P, ctx: CheckContext): Promise<CheckResult> {
  if (action === "rsvp" || action === "cancel_rsvp") return rsvpChecks(action, p, ctx);
  if (action === "create_event" || action === "update_event") return hostingChecks(action, p, ctx);

  const blockers: string[] = [];
  const warnings: string[] = [];
  if (action === "create_venue" || action === "update_venue") {
    return {
      blockers,
      warnings,
      summary: `${action === "create_venue" ? "Add" : "Update"} the venue “${String(p.title ?? p.venue_id)}”.${changesLine(p, ["venue_id"])}`,
    };
  }
  if (action === "delete_venue") {
    const day = istDayWindow(istDate(ctx.now), 60);
    const upcoming = await edgeos<ListModel<EdgeEvent>>(
      ctx.access.key,
      "GET",
      "/events/portal/events",
      {
        query: {
          popup_id: ctx.access.popup.id,
          event_status: "published",
          venue_id: String(p.venue_id),
          start_after: ctx.now.toISOString(),
          start_before: day.startBefore,
        },
      },
    );
    if (upcoming.results.length)
      warnings.push(`${upcoming.results.length} upcoming events use this venue.`);
    return { blockers, warnings, summary: `Delete venue ${String(p.venue_id)}.` };
  }

  // Event-scoped actions: cancel/hide/unhide/invite/remove_invitation
  const e = await getEvent(ctx.access, String(p.event_id));
  if (!e)
    return {
      blockers: ["No such event, or it's hidden from this attendee."],
      warnings,
      summary: "",
    };
  const when = formatIstRange(e.start_time, e.end_time);
  if (new Date(e.end_time) < ctx.now) warnings.push("This event is already over.");
  if (action === "cancel_event" && (e.attendee_count ?? 0) > 0)
    warnings.push(
      `${e.attendee_count} people have RSVPed. Tell them yourself; this server doesn't message attendees.`,
    );
  const emails = Array.isArray(p.emails) ? (p.emails as string[]) : [];
  if (action === "invite" && emails.length > 20)
    warnings.push(`That's ${emails.length} invitations at once. Double-check the list.`);
  const verbs: Record<string, string> = {
    cancel_event: "Cancel",
    hide_event: "Hide",
    unhide_event: "Unhide",
    invite: `Invite ${emails.length} ${emails.length === 1 ? "person" : "people"} to`,
    remove_invitation: "Remove an invitation from",
  };
  const shown = emails.slice(0, 20).join(", ");
  const more = emails.length > 20 ? ` and ${emails.length - 20} more` : "";
  const tail = action === "invite" ? ` Emails: ${shown}${more}.` : "";
  return {
    blockers,
    warnings,
    summary: `${verbs[action]} “${e.title}”, ${when}.${tail}`,
    event: e,
  };
}
