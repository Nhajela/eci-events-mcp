# Reading the schedule

- Always give `edgeos_list_events` a date range. "Today", "tomorrow" and "this weekend" are India dates: pass `from` as the IST date (YYYY-MM-DD) and `days`.
- Times come back already converted to IST. Quote them as given, with "IST". Never convert again and never read the UTC value out loud.
- Group answers by day. For each event give the time, title and venue, and say if the attendee already RSVPed.
- `highlighted_only` shows the events organisers featured.
- An event with `require_approval` needs the host to accept the RSVP; say so.
- Results come from EdgeOS live. Don't fill gaps from memory.
