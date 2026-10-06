import { describe, expect, it } from "vitest";
import { ACTIONS } from "@/mcp/propose/actions";
import { runChecks } from "@/mcp/propose/checks";
import { mockEdgeos } from "../edgeos-mock";
import { TEST_ACCESS, useTestSecrets } from "../helpers";

// biome-ignore lint/correctness/useHookAtTopLevel: not a React hook
useTestSecrets();
const NOW = new Date("2026-10-14T06:00:00Z");
const ctx = {
  access: {
    ...TEST_ACCESS,
    scopes: ["events:read", "rsvp:write", "events:write", "venues:write"] as const,
  },
  now: NOW,
} as never;

const base = {
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
const empty = { results: [], paging: { limit: 0, offset: 0, total: 0 } };
const venues = { results: [{ id: "v1", title: "Beach Deck" }], paging: {} };

describe("rsvp checks", () => {
  it("passes a normal RSVP with an IST summary", async () => {
    mockEdgeos([
      { method: "GET", path: "/events/portal/events/e1", body: base },
      { method: "GET", path: /eligibility/, body: { allowed: true, reason: null } },
      { method: "GET", path: "/events/portal/events", body: empty },
      { method: "GET", path: "/event-venues/portal/venues", body: venues },
    ]);
    const r = await runChecks("rsvp", { event_id: "e1" }, ctx);
    expect(r.blockers).toEqual([]);
    expect(r.summary).toBe(
      "RSVP to “Sunset Breathwork”, Wed 14 Oct, 6:30 PM – 7:30 PM IST, at Beach Deck.",
    );
  });

  it("blocks when already RSVPed, past, or not eligible", async () => {
    mockEdgeos([
      {
        method: "GET",
        path: "/events/portal/events/e1",
        body: {
          ...base,
          my_rsvp_status: "registered",
          end_time: "2026-10-13T10:00:00Z",
          start_time: "2026-10-13T09:00:00Z",
        },
      },
      {
        method: "GET",
        path: /eligibility/,
        body: { allowed: false, reason: "No ticket this week" },
      },
      { method: "GET", path: "/events/portal/events", body: empty },
      { method: "GET", path: "/event-venues/portal/venues", body: venues },
    ]);
    const r = await runChecks("rsvp", { event_id: "e1" }, ctx);
    expect(r.blockers.join(" ")).toContain("already RSVPed");
    expect(r.blockers.join(" ")).toContain("already over");
    expect(r.blockers.join(" ")).toContain("No ticket this week");
  });

  it("blocks a recurring event without an occurrence", async () => {
    mockEdgeos([
      { method: "GET", path: "/events/portal/events/e1", body: { ...base, rrule: "FREQ=DAILY" } },
      { method: "GET", path: /eligibility/, body: { allowed: true, reason: null } },
      { method: "GET", path: "/events/portal/events", body: empty },
      { method: "GET", path: "/event-venues/portal/venues", body: venues },
    ]);
    const r = await runChecks("rsvp", { event_id: "e1" }, ctx);
    expect(r.blockers.join(" ")).toContain("recurring");
  });

  it("warns about a full event and a clash", async () => {
    const clash = {
      ...base,
      id: "e2",
      title: "Dinner talk",
      start_time: "2026-10-14T13:30:00Z",
      end_time: "2026-10-14T15:00:00Z",
      my_rsvp_status: "registered",
    };
    mockEdgeos([
      { method: "GET", path: "/events/portal/events/e1", body: { ...base, attendee_count: 20 } },
      { method: "GET", path: /eligibility/, body: { allowed: true, reason: null } },
      { method: "GET", path: "/events/portal/events", body: { results: [clash], paging: {} } },
      { method: "GET", path: "/event-venues/portal/venues", body: venues },
    ]);
    const r = await runChecks("rsvp", { event_id: "e1" }, ctx);
    expect(r.warnings.join(" ")).toContain("full");
    expect(r.warnings.join(" ")).toContain("Dinner talk");
  });
});

describe("hosting checks", () => {
  const ok = [
    { method: "POST", path: "/events/portal/events/check-availability", body: { available: true } },
    { method: "GET", path: "/event-venues/portal/venues", body: venues },
  ];

  it("rejects times without an offset", () => {
    const parsed = ACTIONS.create_event.schema.safeParse({
      title: "Jam",
      start_time: "2026-10-14T18:00:00",
      end_time: "2026-10-14T19:00:00+05:30",
    });
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toContain("+05:30");
  });

  it("warns on a likely UTC misread, missing description and missing place", async () => {
    mockEdgeos(ok);
    const r = await runChecks(
      "create_event",
      {
        title: "Jam",
        start_time: "2026-10-15T03:00:00+05:30",
        end_time: "2026-10-15T04:00:00+05:30",
      },
      ctx,
    );
    expect(r.warnings.join(" ")).toContain("3:00 AM");
    expect(r.warnings.join(" ")).toContain("description");
    expect(r.warnings.join(" ")).toContain("venue");
  });

  it("blocks an end before the start and a start in the past", async () => {
    mockEdgeos(ok);
    const r = await runChecks(
      "create_event",
      {
        title: "Jam",
        start_time: "2026-10-13T18:00:00+05:30",
        end_time: "2026-10-13T17:00:00+05:30",
        content: "x",
        venue_id: "v1",
      },
      ctx,
    );
    expect(r.blockers.join(" ")).toContain("ends before it starts");
    expect(r.blockers.join(" ")).toContain("in the past");
  });

  it("blocks a taken venue", async () => {
    mockEdgeos([
      {
        method: "POST",
        path: "/events/portal/events/check-availability",
        body: { available: false, conflicts: [{ title: "Yoga" }] },
      },
      { method: "GET", path: "/event-venues/portal/venues", body: venues },
    ]);
    const r = await runChecks(
      "create_event",
      {
        title: "Jam",
        start_time: "2026-10-15T18:00:00+05:30",
        end_time: "2026-10-15T19:00:00+05:30",
        content: "x",
        venue_id: "v1",
      },
      ctx,
    );
    expect(r.blockers.join(" ")).toContain("Beach Deck isn't free");
  });

  it("warns outside the popup dates", async () => {
    mockEdgeos(ok);
    const r = await runChecks(
      "create_event",
      {
        title: "Jam",
        start_time: "2026-11-05T18:00:00+05:30",
        end_time: "2026-11-05T19:00:00+05:30",
        content: "x",
        venue_id: "v1",
      },
      ctx,
    );
    expect(r.warnings.join(" ")).toContain("outside");
  });

  it("warns when cancelling an event people RSVPed to", async () => {
    mockEdgeos([
      { method: "GET", path: "/events/portal/events/e1", body: base },
      { method: "GET", path: "/event-venues/portal/venues", body: venues },
    ]);
    const r = await runChecks("cancel_event", { event_id: "e1" }, ctx);
    expect(r.warnings.join(" ")).toContain("3 people");
  });

  const past = {
    ...base,
    start_time: "2026-10-13T09:00:00Z",
    end_time: "2026-10-13T10:00:00Z",
    rrule: "FREQ=DAILY",
  };
  const evRoutes = (body: unknown) => [
    { method: "GET", path: "/events/portal/events/e1", body },
    { method: "GET", path: "/event-venues/portal/venues", body: venues },
  ];

  it("lets a title-only update through on a recurring event already under way", async () => {
    mockEdgeos(evRoutes(past));
    const r = await runChecks("update_event", { event_id: "e1", title: "Breathwork II" }, ctx);
    expect(r.blockers).toEqual([]);
  });

  it("lists every changed field in an update summary", async () => {
    mockEdgeos(evRoutes(base));
    const r = await runChecks("update_event", { event_id: "e1", visibility: "private" }, ctx);
    expect(r.summary).toContain("visibility: private");
    expect(r.summary).not.toContain("event_id");
  });

  it("truncates long values in the changes line", async () => {
    mockEdgeos(evRoutes(base));
    const r = await runChecks("update_event", { event_id: "e1", content: "x".repeat(200) }, ctx);
    expect(r.summary).toContain(`${"x".repeat(80)}${String.fromCharCode(0x2026)}`);
  });

  it("lists emails for an invite and caps at 20", async () => {
    mockEdgeos(evRoutes(base));
    const emails = Array.from({ length: 25 }, (_, i) => `p${i}@x.in`);
    const r = await runChecks("invite", { event_id: "e1", emails }, ctx);
    expect(r.summary).toContain("p0@x.in");
    expect(r.summary).toContain("and 5 more");
    expect(r.summary).not.toContain("p24@x.in");
    expect(r.warnings.join(" ")).toContain("25 invitations");
  });

  it("summarises removing an invitation", async () => {
    mockEdgeos(evRoutes(base));
    const r = await runChecks("remove_invitation", { event_id: "e1", invitation_id: "i1" }, ctx);
    expect(r.blockers).toEqual([]);
    expect(r.summary).toContain("Remove an invitation from");
  });

  it("rejects an impossible date", () => {
    const parsed = ACTIONS.create_event.schema.safeParse({
      title: "Jam",
      start_time: "2026-13-45T25:99+05:30",
      end_time: "2026-10-14T19:00:00+05:30",
    });
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toContain("Not a real date");
  });
});
