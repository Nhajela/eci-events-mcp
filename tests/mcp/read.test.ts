import { describe, expect, it, vi } from "vitest";
import { mockEdgeos } from "../edgeos-mock";
import { accessToken, useTestSecrets } from "../helpers";
import { connectClient } from "../mcp-client";

// biome-ignore lint/correctness/useHookAtTopLevel: not a React hook; registers vitest beforeEach
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
  venue_id: "v1",
  custom_location_name: null,
  custom_location_url: null,
  meeting_url: null,
  max_participant: 20,
  tags: ["wellness"],
  kind: null,
  track_id: null,
  visibility: "public",
  status: "published",
  highlighted: true,
  host_display_name: "Asha",
  require_approval: false,
  rrule: null,
  recurrence_master_id: null,
  my_rsvp_status: "registered",
  attendee_count: 12,
};
const VENUES = {
  results: [
    {
      id: "v1",
      title: "Beach Deck",
      description: null,
      location: "Riva Beach",
      capacity: 40,
      booking_mode: "free",
      status: "active",
      tags: [],
    },
  ],
  paging: { limit: 100, offset: 0, total: 1 },
};

const text = (r: { content: unknown }) => (r.content as { text: string }[])[0].text;

describe("read tools", () => {
  it("lists events for an IST window with local times and venue names", async () => {
    const m = mockEdgeos([
      {
        method: "GET",
        path: "/events/portal/events",
        body: { results: [EVENT], paging: { limit: 1, offset: 0, total: 1 } },
      },
      { method: "GET", path: "/event-venues/portal/venues", body: VENUES },
    ]);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({
      name: "edgeos_list_events",
      arguments: { from: "2026-10-14", days: 1 },
    });
    expect(text(r)).toContain("Wed 14 Oct");
    expect(text(r)).toContain("6:30 PM – 7:30 PM");
    expect(text(r)).toContain("Beach Deck");
    expect(text(r)).toContain("RSVP: registered");
    const call = m.calls.find((c) => c.url.pathname.endsWith("/events/portal/events"));
    expect(call).toBeDefined();
    const q = (call as NonNullable<typeof call>).url.searchParams;
    expect(q.get("popup_id")).toBe("ind");
    expect(q.get("event_status")).toBe("published");
    expect(q.get("start_after")).toBe("2026-10-13T18:30:00.000Z");
    expect(q.get("start_before")).toBe("2026-10-14T18:30:00.000Z");
  });

  it("defaults to the next 7 IST days", async () => {
    const m = mockEdgeos([
      {
        method: "GET",
        path: "/events/portal/events",
        body: { results: [], paging: { limit: 0, offset: 0, total: 0 } },
      },
      { method: "GET", path: "/event-venues/portal/venues", body: VENUES },
    ]);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({ name: "edgeos_list_events", arguments: {} });
    expect(text(r)).toContain("No events");
    const q = m.calls[0].url.searchParams;
    expect(q.get("start_before")).toBe("2026-10-20T18:30:00.000Z");
  });

  it("gets one event with attendee count", async () => {
    mockEdgeos([
      { method: "GET", path: "/events/portal/events/e1", body: EVENT },
      { method: "GET", path: "/event-venues/portal/venues", body: VENUES },
    ]);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({ name: "edgeos_get_event", arguments: { event_id: "e1" } });
    expect(text(r)).toContain("12 going (max 20)");
    expect(text(r)).toContain("Host: Asha");
  });

  it("only registers read tools the key allows", async () => {
    mockEdgeos([]);
    const client = await connectClient(await accessToken({ scopes: ["events:read"] }));
    const names = (await client.listTools()).tools.map((t) => t.name);
    expect(names).toContain("edgeos_list_events");
    expect(names).not.toContain("edgeos_propose");
  });

  it("returns a helpful error when EdgeOS rejects the key", async () => {
    mockEdgeos([
      { method: "GET", path: "/events/portal/events", status: 401, body: { detail: "expired" } },
      { method: "GET", path: "/event-venues/portal/venues", body: VENUES },
    ]);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({ name: "edgeos_list_events", arguments: {} });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("AUTH_EXPIRED");
  });

  it("rejects a malformed date", async () => {
    mockEdgeos([]);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({
      name: "edgeos_list_events",
      arguments: { from: "14/10/2026" },
    });
    expect(r.isError).toBe(true);
  });
});
