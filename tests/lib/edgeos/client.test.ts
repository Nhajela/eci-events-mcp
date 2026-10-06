import { describe, expect, it, vi } from "vitest";
import { EdgeosError, edgeos } from "@/lib/edgeos/client";
import { mockEdgeos } from "../../edgeos-mock";

const fail = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error("expected rejection");
    },
    (e) => e as EdgeosError,
  );

const KEY = "eos_live_AbCdEfGhIjKlMnOpQrStUvWxYz012345";

describe("edgeos client", () => {
  it("sends the key as a bearer and builds the query", async () => {
    const m = mockEdgeos([
      { method: "GET", path: "/events/portal/events", body: { results: [], paging: {} } },
    ]);
    await edgeos(KEY, "GET", "/events/portal/events", {
      query: { popup_id: "p1", tags: ["AI", "Music"], search: undefined, rsvped_only: true },
    });
    const call = m.calls[0];
    expect(call.auth).toBe(`Bearer ${KEY}`);
    expect(call.url.origin + call.url.pathname).toBe(
      "https://api.edgeos.world/api/v1/events/portal/events",
    );
    expect(call.url.searchParams.getAll("tags")).toEqual(["AI", "Music"]);
    expect(call.url.searchParams.has("search")).toBe(false);
    expect(call.url.searchParams.get("rsvped_only")).toBe("true");
  });

  it("sends JSON bodies", async () => {
    const m = mockEdgeos([
      { method: "POST", path: /^\/event-participants\/portal\/register\//, body: { ok: true } },
    ]);
    await edgeos(KEY, "POST", "/event-participants/portal/register/e1", {
      body: { occurrence_start: null },
    });
    expect(m.calls[0].body).toEqual({ occurrence_start: null });
  });

  it("raises EdgeosError with scrubbed detail", async () => {
    mockEdgeos([
      { method: "GET", path: "/x", status: 403, body: { detail: `key ${KEY} lacks scope` } },
    ]);
    const err = await fail(edgeos(KEY, "GET", "/x"));
    expect(err).toBeInstanceOf(EdgeosError);
    expect(err.status).toBe(403);
    expect(err.detail).toBe("key eos_live_[redacted] lacks scope");
    expect(String(err.message)).not.toContain(KEY);
  });

  it("parses Retry-After", async () => {
    mockEdgeos([
      {
        method: "GET",
        path: "/x",
        status: 429,
        body: { detail: "slow down" },
        headers: { "retry-after": "12" },
      },
    ]);
    const err = await fail(edgeos(KEY, "GET", "/x"));
    expect(err.retryAfter).toBe(12);
  });

  it("does not pass HTML error pages through", async () => {
    mockEdgeos([
      { method: "GET", path: "/x", status: 502, body: "<html><body>Bad gateway</body></html>" },
    ]);
    const err = await fail(edgeos(KEY, "GET", "/x"));
    expect(err.detail).toBe("EdgeOS returned 502");
  });

  it("maps network failures to status 0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    const err = await fail(edgeos(KEY, "GET", "/x"));
    expect(err.status).toBe(0);
    vi.unstubAllGlobals();
  });
});
