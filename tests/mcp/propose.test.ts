import { describe, expect, it, vi } from "vitest";
import { mockEdgeos } from "../edgeos-mock";
import { accessToken, useTestSecrets } from "../helpers";
import { connectClient } from "../mcp-client";

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
const routes = [
  { method: "GET", path: "/events/portal/events/e1", body: EVENT },
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
const codeIn = (t: string) => t.match(/Proposal code[^`]*`([^`]+)`/)?.[1];

describe("propose → confirm", () => {
  it("proposes with steering, then confirms exactly that action", async () => {
    const m = mockEdgeos(routes);
    const client = await connectClient(await accessToken());
    const p = await client.callTool({
      name: "edgeos_propose",
      arguments: { action: "rsvp", params: { event_id: "e1" } },
    });
    const t = text(p);
    expect(t).toContain(
      "> RSVP to “Sunset Breathwork”, Wed 14 Oct, 6:30 PM – 7:30 PM IST, at North lawn.",
    );
    expect(t).toContain("explicit yes");
    expect(t).toContain("## Guideline");
    expect(m.calls.some((c) => c.method === "POST")).toBe(false);

    const c = await client.callTool({ name: "edgeos_confirm", arguments: { code: codeIn(t) } });
    expect(text(c)).toContain("RSVPed");
    const post = m.calls.find((x) => x.method === "POST")!;
    expect(post.url.pathname).toBe("/api/v1/event-participants/portal/register/e1");
  });

  it("issues no code when blocked", async () => {
    mockEdgeos([
      { ...routes[0], body: { ...EVENT, my_rsvp_status: "registered" } },
      ...routes.slice(1),
    ]);
    const client = await connectClient(await accessToken());
    const t = text(
      await client.callTool({
        name: "edgeos_propose",
        arguments: { action: "rsvp", params: { event_id: "e1" } },
      }),
    );
    expect(t).toContain("Not possible as proposed");
    expect(codeIn(t)).toBeUndefined();
  });

  it("refuses a code from another attendee or an expired code", async () => {
    mockEdgeos(routes);
    const a = await connectClient(await accessToken());
    const code = codeIn(
      text(
        await a.callTool({
          name: "edgeos_propose",
          arguments: { action: "rsvp", params: { event_id: "e1" } },
        }),
      ),
    )!;
    const b = await connectClient(
      await accessToken({ key: "eos_live_ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ" }),
    );
    expect(text(await b.callTool({ name: "edgeos_confirm", arguments: { code } }))).toContain(
      "another attendee",
    );
    vi.setSystemTime(new Date("2026-10-14T06:11:00Z"));
    expect(text(await a.callTool({ name: "edgeos_confirm", arguments: { code } }))).toContain(
      "expired",
    );
    vi.setSystemTime(new Date("2026-10-14T06:00:00Z"));
  });

  it("refuses actions the key's scopes don't allow", async () => {
    mockEdgeos(routes);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({
      name: "edgeos_propose",
      arguments: { action: "create_venue", params: { title: "Shack" } },
    });
    expect(text(r)).toContain("venues:write");
  });

  it("explains invalid params", async () => {
    mockEdgeos(routes);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({
      name: "edgeos_propose",
      arguments: { action: "rsvp", params: {} },
    });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("event_id");
  });
});
