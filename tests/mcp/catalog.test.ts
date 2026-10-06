import { describe, expect, it, vi } from "vitest";
import { getCatalog } from "@/mcp/catalog";
import { useTestSecrets } from "../helpers";

// biome-ignore lint/correctness/useHookAtTopLevel: not a React hook; registers vitest beforeEach
useTestSecrets();

describe("catalog", () => {
  it("lists every tool an all-scopes attendee gets, with schemas", async () => {
    const c = await getCatalog();
    const names = c.tools.map((t) => t.name);
    for (const n of [
      "edgeos_initialize",
      "edgeos_guide",
      "edgeos_list_events",
      "edgeos_venue_availability",
      "edgeos_propose",
      "edgeos_confirm",
    ]) {
      expect(names).toContain(n);
    }
    const list = c.tools.find((t) => t.name === "edgeos_list_events");
    expect(JSON.stringify(list?.inputSchema)).toContain("from");
    expect(c.prompts.map((p) => p.name)).toContain("host_an_event");
  });

  it("makes no network calls", async () => {
    const before = globalThis.fetch;
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      throw new Error("no network");
    }) as typeof fetch;
    try {
      await getCatalog();
    } finally {
      globalThis.fetch = before;
    }
    expect(called).toBe(false);
  });
});

describe("catalog with analytics configured", () => {
  it("lists get_more_tools and never sends anything", async () => {
    vi.stubEnv("POSTHOG_PROJECT_TOKEN", "phc_test");
    vi.stubEnv("POSTHOG_ID_SALT", "salt");
    vi.resetModules();
    const fetchStub = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchStub);
    try {
      const { getCatalog: fresh } = await import("@/mcp/catalog");
      const c = await fresh();
      const { flushAnalytics } = await import("@/mcp/analytics");
      await flushAnalytics();
      await new Promise((r) => setTimeout(r, 100));
      expect(c.tools.map((t) => t.name)).toContain("get_more_tools");
      expect(JSON.stringify(c.tools)).toContain("conversation_id");
      expect(fetchStub).not.toHaveBeenCalled();
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });
});
