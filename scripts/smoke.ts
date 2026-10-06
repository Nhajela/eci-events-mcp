// Live check against EdgeOS with a real test key. Reads EDGEOS_TEST_KEY from
// the environment (pnpm smoke loads .env.local if it exists); never prints the key.
//   pnpm smoke                       detect popup + scopes, list next 2 days
//   pnpm smoke --rsvp <event_id>     RSVP then cancel, to prove writes work

import { edgeos } from "../src/lib/edgeos/client";
import { detectAccess } from "../src/lib/edgeos/detect";
import type { EdgeEvent, ListModel } from "../src/lib/edgeos/types";
import { formatIstRange, istDate, istDayWindow } from "../src/lib/time";

const rsvpAt = process.argv.indexOf("--rsvp");
const rsvpId = rsvpAt > 0 ? process.argv[rsvpAt + 1] : undefined;
if (rsvpAt > 0 && (!rsvpId || rsvpId.startsWith("--"))) {
  console.error("Usage: pnpm smoke [--rsvp <event_id>]");
  process.exit(2);
}

const key = process.env.EDGEOS_TEST_KEY;
if (!key) throw new Error("Set EDGEOS_TEST_KEY");
const r = await detectAccess(key);
console.log(JSON.stringify({ ...r }, null, 2));
if (!r.ok) process.exit(1);
const w = istDayWindow(istDate(new Date()), 2);
const list = await edgeos<ListModel<EdgeEvent>>(key, "GET", "/events/portal/events", {
  query: {
    popup_id: r.popup.id,
    event_status: "published",
    start_after: w.startAfter,
    start_before: w.startBefore,
  },
});
for (const e of list.results.slice(0, 10))
  console.log(`${formatIstRange(e.start_time, e.end_time)}  ${e.title}  (${e.id})`);

if (rsvpId) {
  const id = encodeURIComponent(rsvpId);
  console.log(
    "RSVP:",
    await edgeos(key, "POST", `/event-participants/portal/register/${id}`, { body: {} }),
  );
  try {
    console.log(
      "Cancel:",
      await edgeos(key, "POST", `/event-participants/portal/cancel-registration/${id}`, {
        body: {},
      }),
    );
  } catch (e) {
    console.error("Cancel failed; cancel this RSVP by hand in the portal.");
    throw e;
  }
}
