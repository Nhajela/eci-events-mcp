import { describe, expect, it, vi } from "vitest";
import { mockEdgeos } from "../edgeos-mock";
import { accessToken, useTestSecrets } from "../helpers";
import { connectClient } from "../mcp-client";

const captureEvent = vi.hoisted(() => vi.fn());
vi.mock("@/mcp/analytics", () => ({
  captureEvent,
  instrumentServer: () => {},
  flushAnalytics: async () => {},
}));

// biome-ignore lint/correctness/useHookAtTopLevel: not a React hook
useTestSecrets();
vi.useFakeTimers({ toFake: ["Date"] });
vi.setSystemTime(new Date("2026-10-14T06:00:00Z"));

const EVENT = {
  id: "e1",
  popup_id: "ind",
  title: "Sunset Breathwork",
  content: "Breathe.",
  start_time: "2026-10-14T13:00:00Z",
  end_time: "2026-10-14T14:00:00Z",
  timezone: "Asia/Kolkata",
  venue_id: null,
  custom_location_name: "North lawn",
  custom_location_url: null,
  meeting_url: null,
  max_participant: null,
  tags: [],
  kind: null,
  track_id: null,
  visibility: "public",
  status: "published",
  highlighted: false,
  host_display_name: null,
  require_approval: false,
  rrule: null,
  recurrence_master_id: null,
  my_rsvp_status: null,
  attendee_count: 3,
};
const routes = (event: object) => [
  { method: "GET", path: "/events/portal/events/e1", body: event },
  { method: "GET", path: /eligibility/, body: { allowed: true, reason: null } },
  { method: "GET", path: "/events/portal/events", body: { results: [], paging: {} } },
  { method: "GET", path: "/event-venues/portal/venues", body: { results: [], paging: {} } },
  {
    method: "POST",
    path: "/event-participants/portal/register/e1",
    body: { id: "p1", status: "registered" },
  },
];
const text = (r: { content: unknown }) => (r.content as { text: string }[])[0].text;
const propose = {
  name: "edgeos_propose",
  arguments: { action: "rsvp", params: { event_id: "e1" } },
};

describe("proposal analytics events", () => {
  it("captures a blocked proposal", async () => {
    captureEvent.mockClear();
    mockEdgeos(routes({ ...EVENT, my_rsvp_status: "registered" }));
    const client = await connectClient(await accessToken());
    await client.callTool(propose);
    expect(captureEvent).toHaveBeenCalledTimes(1);
    expect(captureEvent.mock.calls[0].slice(1)).toEqual([
      "proposal_created",
      { action: "rsvp", blocked: true, warnings: 0, reviewer_used: false },
    ]);
  });

  it("captures a normal proposal, then the confirm", async () => {
    captureEvent.mockClear();
    mockEdgeos(routes(EVENT));
    const client = await connectClient(await accessToken());
    const t = text(await client.callTool(propose));
    expect(captureEvent).toHaveBeenCalledTimes(1);
    expect(captureEvent.mock.calls[0].slice(1)).toEqual([
      "proposal_created",
      { action: "rsvp", blocked: false, warnings: 0, reviewer_used: false },
    ]);
    const code = t.match(/Proposal code[^`]*`([^`]+)`/)?.[1] ?? "";
    vi.setSystemTime(new Date("2026-10-14T06:00:42Z"));
    await client.callTool({ name: "edgeos_confirm", arguments: { code } });
    expect(captureEvent).toHaveBeenCalledTimes(2);
    const [, name, props] = captureEvent.mock.calls[1];
    expect(name).toBe("proposal_confirmed");
    expect(props).toMatchObject({ action: "rsvp" });
    expect(props.seconds_to_confirm).toBe(42);
  });
});
