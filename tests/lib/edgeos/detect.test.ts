import { afterEach, describe, expect, it, vi } from "vitest";
import { detectAccess } from "@/lib/edgeos/detect";
import { mockEdgeos } from "../../edgeos-mock";

const KEY = "eos_live_AbCdEfGhIjKlMnOpQrStUvWxYz012345";
const NOW = new Date("2026-10-14T06:00:00Z");
const POPUPS = [
  {
    id: "esm",
    name: "Edge Esmeralda 2026",
    slug: "edge-esmeralda-2026",
    start_date: "2026-05-30",
    end_date: "2026-06-27",
  },
  {
    id: "ind",
    name: "Edge City India",
    slug: "edge-india-2026",
    start_date: "2026-10-11",
    end_date: "2026-11-01",
  },
];
describe("detectAccess", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("finds the key's popup and detects write scopes by 403 vs 404", async () => {
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        const method = (init?.method ?? "GET").toUpperCase();
        const path = url.pathname.replace(/^\/api\/v1/, "");
        if (method === "GET" && path === "/popups/portal/list") return json(200, POPUPS);
        if (method === "GET" && path === "/events/portal/events") {
          return url.searchParams.get("popup_id") === "ind"
            ? json(200, { results: [], paging: {} })
            : json(403, { detail: "This API key does not have access to this popup" });
        }
        if (method === "POST" && /^\/event-participants\/portal\/register\//.test(path))
          return json(404, {});
        if (method === "POST" && /^\/events\/portal\/events\/.+\/cancel$/.test(path))
          return json(403, { detail: "API key lacks required scope: events:write" });
        if (method === "PATCH" && /^\/event-venues\/portal\/venues\//.test(path))
          return json(403, { detail: "API key lacks required scope: venues:write" });
        return json(404, {});
      }),
    );

    const r = await detectAccess(KEY, NOW);
    expect(r).toEqual({
      ok: true,
      popup: {
        id: "ind",
        name: "Edge City India",
        slug: "edge-india-2026",
        startDate: "2026-10-11",
        endDate: "2026-11-01",
      },
      scopes: ["events:read", "rsvp:write"],
      probes: { "rsvp:write": 404, "events:write": 403, "venues:write": 403 },
    });
  });

  it("treats an unreachable probe as present (fallback)", async () => {
    const m = mockEdgeos([
      { method: "GET", path: "/popups/portal/list", body: [POPUPS[1]] },
      { method: "GET", path: "/events/portal/events", body: { results: [], paging: {} } },
      { method: "POST", path: /register/, status: 500, body: { detail: "boom" } },
      { method: "POST", path: /cancel$/, status: 422, body: { detail: "invalid" } },
      { method: "PATCH", path: /venues/, status: 403, body: { detail: "no" } },
    ]);
    const r = await detectAccess(KEY, NOW);
    expect(r.ok && r.scopes).toEqual(["events:read", "rsvp:write", "events:write"]);
    expect(m.calls.some((c) => c.method === "POST")).toBe(true);
  });

  it("reports an invalid key", async () => {
    mockEdgeos([
      { method: "GET", path: "/popups/portal/list", status: 401, body: { detail: "Invalid" } },
    ]);
    expect(await detectAccess(KEY, NOW)).toEqual({ ok: false, reason: "invalid_key" });
  });

  it("reports a key without events:read", async () => {
    mockEdgeos([
      { method: "GET", path: "/popups/portal/list", status: 403, body: { detail: "lacks" } },
    ]);
    expect(await detectAccess(KEY, NOW)).toEqual({ ok: false, reason: "no_events_read" });
  });

  it("reports no popup when every popup refuses", async () => {
    mockEdgeos([
      { method: "GET", path: "/popups/portal/list", body: POPUPS },
      { method: "GET", path: "/events/portal/events", status: 403, body: { detail: "no access" } },
    ]);
    expect(await detectAccess(KEY, NOW)).toEqual({ ok: false, reason: "no_popup" });
  });
});
