// Plain-language list of every proposal check in checks.ts, shown on
// /how-it-works. Update this file whenever checks.ts changes.

export const CHECK_LIST: { action: string; kind: "blocker" | "warning"; rule: string }[] = [
  {
    action:
      "rsvp, cancel_rsvp, update_event, cancel_event, hide_event, unhide_event, invite, remove_invitation",
    kind: "blocker",
    rule: "The event must exist and be visible to the attendee.",
  },
  {
    action: "rsvp, cancel_rsvp",
    kind: "blocker",
    rule: "A recurring event needs one occurrence picked, and that occurrence must exist.",
  },
  { action: "rsvp, cancel_rsvp", kind: "blocker", rule: "The event must not be over." },
  {
    action: "rsvp",
    kind: "blocker",
    rule: "The attendee must not already be RSVPed, and EdgeOS must say they're eligible.",
  },
  {
    action: "rsvp",
    kind: "warning",
    rule: "The event looks full, or the host approves each RSVP.",
  },
  {
    action: "rsvp",
    kind: "warning",
    rule: "It overlaps another event the attendee already RSVPed to that day.",
  },
  {
    action: "cancel_rsvp",
    kind: "blocker",
    rule: "The attendee must currently be RSVPed.",
  },
  {
    action: "create_event, update_event",
    kind: "blocker",
    rule: "When a start or end time is given: it must end after it starts and start in the future. For an update, this runs only if the start or end time is being changed.",
  },
  {
    action: "create_event, update_event",
    kind: "blocker",
    rule: "When a venue is chosen (or the venue or times change on an update), the venue must be free then, by EdgeOS's availability check.",
  },
  {
    action: "create_event, update_event",
    kind: "warning",
    rule: "When a start or end time is given: it starts between midnight and 6 AM IST (likely a UTC mix-up), is shorter than 15 minutes or longer than 6 hours, or falls outside the popup's dates.",
  },
  {
    action: "create_event, update_event",
    kind: "warning",
    rule: "There is no description, or no venue or place.",
  },
  {
    action: "create_event, update_event, create_venue, update_venue",
    kind: "warning",
    rule: "Optional second-model review against the hosting or venue guidelines, when enabled; its notes are labelled as a second opinion.",
  },
  {
    action: "cancel_event, hide_event, unhide_event, invite, remove_invitation",
    kind: "warning",
    rule: "The event is already over.",
  },
  {
    action: "cancel_event",
    kind: "warning",
    rule: "People have RSVPed; the attendee should tell them.",
  },
  {
    action: "invite",
    kind: "warning",
    rule: "More than 20 invitations at once. The summary lists the email addresses (the first 20, then a count).",
  },
  { action: "delete_venue", kind: "warning", rule: "Upcoming events use the venue." },
  {
    action: "every change",
    kind: "blocker",
    rule: "The proposal code expires after 10 minutes, works only for the attendee who proposed it (it is bound to a hash of their key), and carries the exact change, so nothing can be swapped before confirming. Confirm it once: a repeated confirm repeats the change.",
  },
];
