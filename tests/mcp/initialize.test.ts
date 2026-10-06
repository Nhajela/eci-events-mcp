import { describe, expect, it } from "vitest";
import { buildInitialize } from "@/mcp/initialize";
import { readContextSection } from "@/mcp/tools/read";
import { TEST_ACCESS, useTestSecrets } from "../helpers";

// biome-ignore lint/correctness/useHookAtTopLevel: not a React hook; registers vitest beforeEach
useTestSecrets();
const NOW = new Date("2026-10-14T06:00:00Z");

describe("edgeos_initialize", () => {
  it("names the popup, the IST date and the scopes", () => {
    const text = buildInitialize(TEST_ACCESS, NOW, [readContextSection]);
    expect(text).toContain("Edge City India");
    expect(text).toContain("Wed 14 Oct, 11:30 AM IST");
    expect(text).toContain("events:read, rsvp:write");
    expect(text).toContain("edgeos_list_events");
  });

  it("lists what EdgeOS doesn't offer", () => {
    expect(buildInitialize(TEST_ACCESS, NOW, [])).toContain("attendee directory");
  });

  it("explains missing write scopes and where to get them", () => {
    const text = buildInitialize({ ...TEST_ACCESS, scopes: ["events:read"] }, NOW, []);
    expect(text).toContain("can't RSVP");
    expect(text).toContain("/portal/agentic-access");
  });
});
