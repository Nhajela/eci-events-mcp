import type { EdgeEvent, TimeRange } from "@/lib/edgeos/types";
import { isRecurring } from "@/lib/edgeos/types";
import { formatIst, formatIstRange, formatIstTime, istDate, istDayLabel } from "@/lib/time";

export function groupByIstDay(events: EdgeEvent[]): [string, EdgeEvent[]][] {
  const days = new Map<string, EdgeEvent[]>();
  for (const e of [...events].sort((a, b) => a.start_time.localeCompare(b.start_time))) {
    const d = istDate(new Date(e.start_time));
    days.set(d, [...(days.get(d) ?? []), e]);
  }
  return [...days.entries()];
}

function place(e: EdgeEvent, venues: Map<string, string>): string {
  if (e.venue_id) return venues.get(e.venue_id) ?? "venue";
  return e.custom_location_name ?? (e.meeting_url ? "online" : "no venue set");
}

export function eventLine(e: EdgeEvent, venues: Map<string, string>): string {
  const bits = [
    `${formatIstTime(e.start_time)} – ${formatIstTime(e.end_time)}`,
    `**${e.title}**`,
    place(e, venues),
  ];
  if (e.highlighted) bits.push("featured");
  if (e.my_rsvp_status) bits.push(`RSVP: ${e.my_rsvp_status}`);
  let line = `- ${bits.join(" · ")} · id \`${e.id}\``;
  if (isRecurring(e)) line += ` · occurrence_start \`${e.start_time}\``;
  return line;
}

export function eventRow(e: EdgeEvent, venues: Map<string, string>): Record<string, unknown> {
  return {
    id: e.id,
    title: e.title,
    start_time: e.start_time,
    end_time: e.end_time,
    when_ist: formatIstRange(e.start_time, e.end_time),
    place: place(e, venues),
    venue_id: e.venue_id,
    my_rsvp_status: e.my_rsvp_status ?? null,
    highlighted: e.highlighted,
    tags: e.tags,
    recurring: isRecurring(e),
    occurrence_start: isRecurring(e) ? e.start_time : null,
  };
}

export function eventsMarkdown(events: EdgeEvent[], venues: Map<string, string>): string {
  if (events.length === 0) return "No events in this window.";
  return groupByIstDay(events)
    .map(
      ([day, list]) =>
        `### ${istDayLabel(day)}\n${list.map((e) => eventLine(e, venues)).join("\n")}`,
    )
    .join("\n\n");
}

export function rangeText(r: TimeRange): string {
  const start = r.start ?? r.start_time;
  const end = r.end ?? r.end_time;
  return start && end ? formatIstRange(start, end) : JSON.stringify(r);
}

export { formatIst };
