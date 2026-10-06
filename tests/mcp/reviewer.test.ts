import { afterEach, describe, expect, it, vi } from "vitest";
import { reviewProposal } from "@/mcp/propose/reviewer";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.REVIEWER_MODEL;
});

const params = {
  title: "Jam",
  start_time: "2026-10-15T18:00:00+05:30",
  end_time: "2026-10-15T19:00:00+05:30",
};
const summary = `Create ${String.fromCharCode(0x201c)}Jam${String.fromCharCode(0x201d)}`;

describe("reviewProposal", () => {
  it("is off when REVIEWER_MODEL is unset", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await reviewProposal("create_event", params, summary)).toEqual({
      status: "off",
      notes: [],
    });
    expect(f).not.toHaveBeenCalled();
  });

  it("calls Vertex with the guidelines and returns notes", async () => {
    process.env.REVIEWER_MODEL = "gemini-flash-latest";
    process.env.GOOGLE_CLOUD_PROJECT = "123";
    process.env.GEMINI_API_KEY = "AQ.test";
    const f = vi.fn(async (_url: string, _init: RequestInit) =>
      Response.json({
        candidates: [{ content: { parts: [{ text: '{"notes":["Add what to bring."]}' }] } }],
      }),
    );
    vi.stubGlobal("fetch", f);
    expect(await reviewProposal("create_event", params, summary)).toEqual({
      status: "ok",
      notes: ["Add what to bring."],
    });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(
      "https://aiplatform.googleapis.com/v1/projects/123/locations/global/publishers/google/models/gemini-flash-latest:generateContent?key=AQ.test",
    );
    expect(String(init.body)).toContain("A good village event has");
    expect(String(init.body)).not.toContain("eos_live_");
  });

  it("reports failed on an error, nonsense, or missing credentials", async () => {
    const failed = { status: "failed", notes: [] };
    process.env.REVIEWER_MODEL = "m";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    expect(await reviewProposal("create_event", params, "s")).toEqual(failed);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ candidates: [{ content: { parts: [{ text: "not json" }] } }] }),
      ),
    );
    expect(await reviewProposal("create_event", params, "s")).toEqual(failed);
    delete process.env.GEMINI_API_KEY;
    expect(await reviewProposal("create_event", params, "s")).toEqual(failed);
  });
});
