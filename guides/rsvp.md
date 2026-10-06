# RSVPs

- Every RSVP and cancellation goes through `edgeos_propose` with action `rsvp` or `cancel_rsvp`, one event at a time.
- Show the attendee the summary from the proposal word for word, raise every warning, and wait for an explicit yes ("yes", "go ahead", "confirm"). Earlier intent ("RSVP me to anything about AI") is not a yes.
- Then call `edgeos_confirm` with the proposal code. If the attendee changes anything, propose again.
- To see their RSVPs, list events with `mine: true` for a date range.
