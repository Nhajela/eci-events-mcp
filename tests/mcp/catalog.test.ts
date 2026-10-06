import { describe, expect, it } from "vitest";
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
