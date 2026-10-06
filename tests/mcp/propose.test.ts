import { describe, expect, it, vi } from "vitest";
import { seal } from "@/lib/seal";
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
const codeIn = (t: string): string => {
  const c = t.match(/Proposal code[^`]*`([^`]+)`/)?.[1];
  if (!c) throw new Error("no proposal code in reply");
  return c;
};
const FULL = ["events:read", "rsvp:write", "events:write", "venues:write"] as const;

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
    const post = m.calls.find((x) => x.method === "POST");
    expect(post?.url.pathname).toBe("/api/v1/event-participants/portal/register/e1");
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
    expect(t).not.toContain("Proposal code");
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
    );
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

  const rsvpCode = async (client: Awaited<ReturnType<typeof connectClient>>) =>
    codeIn(
      text(
        await client.callTool({
          name: "edgeos_propose",
          arguments: { action: "rsvp", params: { event_id: "e1" } },
        }),
      ),
    );

  it("refuses a tampered code", async () => {
    mockEdgeos(routes);
    const client = await connectClient(await accessToken());
    const code = await rsvpCode(client);
    const i = Math.floor(code.length / 2);
    const bad = `${code.slice(0, i)}${code[i] === "A" ? "B" : "A"}${code.slice(i + 1)}`;
    const r = await client.callTool({ name: "edgeos_confirm", arguments: { code: bad } });
    expect(text(r)).toContain("PROPOSAL_EXPIRED");
  });

  it("refuses a sealed artifact of another type", async () => {
    mockEdgeos(routes);
    const client = await connectClient(await accessToken());
    const other = await seal("code", { x: 1 }, { ttlSeconds: 60 });
    const r = await client.callTool({ name: "edgeos_confirm", arguments: { code: other } });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("PROPOSAL_EXPIRED");
  });

  it("refuses to confirm when the key's scopes no longer include the action", async () => {
    const m = mockEdgeos(routes);
    const a = await connectClient(await accessToken({ scopes: [...FULL] }));
    const code = await rsvpCode(a);
    const b = await connectClient(await accessToken({ scopes: ["events:read", "events:write"] }));
    const r = await b.callTool({ name: "edgeos_confirm", arguments: { code } });
    expect(text(r)).toContain("NOT_ENABLED");
    expect(m.calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("encodes an event id containing a slash in the POST path", async () => {
    const m = mockEdgeos([
      { method: "GET", path: /events\/portal\/events\/a%2Fb/, body: { ...EVENT, id: "a/b" } },
      ...routes.slice(1, 4),
      { method: "POST", path: /register\/a%2Fb/, body: { id: "p1", status: "registered" } },
    ]);
    const client = await connectClient(await accessToken());
    const p = await client.callTool({
      name: "edgeos_propose",
      arguments: { action: "rsvp", params: { event_id: "a/b" } },
    });
    await client.callTool({ name: "edgeos_confirm", arguments: { code: codeIn(text(p)) } });
    const post = m.calls.find((x) => x.method === "POST");
    expect(post?.url.pathname).toBe("/api/v1/event-participants/portal/register/a%2Fb");
  });

  it("shows the invited emails and returns params in structured output", async () => {
    mockEdgeos(routes);
    const client = await connectClient(await accessToken({ scopes: [...FULL] }));
    const r = await client.callTool({
      name: "edgeos_propose",
      arguments: { action: "invite", params: { event_id: "e1", emails: ["a@x.in", "b@x.in"] } },
    });
    expect(text(r)).toContain("a@x.in, b@x.in");
    expect(r.structuredContent).toMatchObject({ params: { event_id: "e1" } });
    expect(text(r)).toContain("once per proposal");
  });
});
