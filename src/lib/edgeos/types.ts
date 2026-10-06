// Hand-written shapes for the EdgeOS fields this server reads.
// Source of truth: spec/edgeos-openapi.json (see src/generated/reference.ts).

export type ListModel<T> = {
  results: T[];
  paging: { limit: number; offset: number; total: number };
};

export type PopupPublic = {
  id: string;
  name: string;
  slug: string;
  start_date: string | null;
  end_date: string | null;
  location?: string | null;
};

export type RsvpStatus = "registered" | "checked_in" | "cancelled";

export type EdgeEvent = {
  id: string;
  popup_id: string;
  title: string;
  content: string | null;
  start_time: string;
  end_time: string;
  timezone: string;
  venue_id: string | null;
  custom_location_name: string | null;
  custom_location_url: string | null;
  meeting_url: string | null;
  max_participant: number | null;
  tags: string[];
  kind: string | null;
  track_id: string | null;
  visibility: "public" | "private" | "unlisted";
  status: "draft" | "published" | "cancelled" | "pending_approval" | "rejected";
  highlighted: boolean;
  host_display_name: string | null;
  require_approval: boolean;
  rrule: string | null;
  recurrence_master_id: string | null;
  my_rsvp_status?: RsvpStatus | null;
  attendee_count?: number;
};

export type Venue = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
  booking_mode: string;
  status: string;
  tags: string[];
};

export type Track = { id: string; name: string; description: string | null };

export type Participant = {
  id: string;
  status: RsvpStatus;
  role: string;
  first_name: string | null;
  last_name: string | null;
  occurrence_start: string | null;
};

export type RsvpEligibility = { allowed: boolean; reason: string | null };
export type DayEventCount = { day: string; count: number };
export type TimeRange = { start?: string; end?: string; start_time?: string; end_time?: string };
export type VenueAvailability = {
  venue_id: string;
  timezone: string;
  open_ranges: TimeRange[];
  busy: TimeRange[];
};

export function isRecurring(e: EdgeEvent): boolean {
  return Boolean(e.rrule || e.recurrence_master_id);
}
