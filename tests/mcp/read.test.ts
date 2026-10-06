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

const READ_TOOLS = [
  "edgeos_list_events",
  "edgeos_get_event",
  "edgeos_calendar_summary",
  "edgeos_list_participants",
  "edgeos_rsvp_eligibility",
  "edgeos_list_invitations",
  "edgeos_list_tracks",
  "edgeos_track_events",
  "edgeos_list_venues",
  "edgeos_venue_availability",
];

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
    for (const n of READ_TOOLS) expect(names).toContain(n);
  });

  it("hides every read tool from a key without events:read", async () => {
    mockEdgeos([]);
    const client = await connectClient(await accessToken({ scopes: ["rsvp:write"] }));
    const names = (await client.listTools()).tools.map((t) => t.name);
    for (const n of READ_TOOLS) expect(names).not.toContain(n);
    expect(names).toContain("edgeos_initialize");
    expect(names).toContain("edgeos_guide");
  });

  it("encodes ids inserted into paths", async () => {
    const m = mockEdgeos([
      { method: "GET", path: "/events/portal/events/a%2Fb%3Fx", body: EVENT },
      { method: "GET", path: "/event-venues/portal/venues", body: VENUES },
    ]);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({ name: "edgeos_get_event", arguments: { event_id: "a/b?x" } });
    expect(r.isError).toBeFalsy();
    expect(m.calls.some((c) => c.url.pathname.includes("a%2Fb%3Fx"))).toBe(true);
  });

  it("notes partial track results", async () => {
    mockEdgeos([
      {
        method: "GET",
        path: "/tracks/portal/tracks/t1/events",
        body: { results: [EVENT], paging: { limit: 1, offset: 0, total: 5 } },
      },
      { method: "GET", path: "/event-venues/portal/venues", body: VENUES },
    ]);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({ name: "edgeos_track_events", arguments: { track_id: "t1" } });
    expect(text(r)).toContain("(showing 1 of 5)");
  });

  it("notes partial participants and drops extra fields", async () => {
    mockEdgeos([
      {
        method: "GET",
        path: "/event-participants/portal/participants",
        body: {
          results: [
            {
              id: "p1",
              status: "registered",
              role: "attendee",
              first_name: "Ria",
              last_name: null,
              occurrence_start: null,
              email: "ria@example.com",
            },
          ],
          paging: { limit: 1, offset: 0, total: 9999 },
        },
      },
    ]);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({
      name: "edgeos_list_participants",
      arguments: { event_id: "e1" },
    });
    expect(text(r)).toContain("(showing 5 of 9999)");
    expect(JSON.stringify(r.structuredContent)).not.toContain("ria@example.com");
    expect(JSON.stringify(r.structuredContent)).toContain("Ria");
  });

  it("rejects a date that does not exist", async () => {
    mockEdgeos([]);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({
      name: "edgeos_list_events",
      arguments: { from: "2026-02-31" },
    });
    expect(r.isError).toBe(true);
  });

  it("formats venues", async () => {
    mockEdgeos([{ method: "GET", path: "/event-venues/portal/venues", body: VENUES }]);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({ name: "edgeos_list_venues", arguments: {} });
    expect(text(r)).toContain("**Beach Deck**");
    expect(text(r)).toContain("up to 40");
  });

  it("serves the hosting guide with an EdgeOS reference table", async () => {
    mockEdgeos([]);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({ name: "edgeos_guide", arguments: { topic: "hosting" } });
    expect(text(r)).toContain("A good village event has");
    expect(text(r)).toContain("## EdgeOS reference");
    expect(text(r)).toContain("| field | type | notes |");
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
