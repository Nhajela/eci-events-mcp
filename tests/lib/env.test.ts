import { afterEach, describe, expect, it } from "vitest";
import { agenticAccessUrl, edgeosBase, mcpUrl, origin } from "@/lib/env";

afterEach(() => {
  delete process.env.PUBLIC_ORIGIN;
  delete process.env.EDGEOS_API_BASE;
  delete process.env.EDGEOS_PORTAL_URL;
});

describe("env", () => {
  it("strips trailing slashes from the origin", () => {
    process.env.PUBLIC_ORIGIN = "https://events.example.com/";
    expect(origin()).toBe("https://events.example.com");
    expect(mcpUrl()).toBe("https://events.example.com/api/mcp");
  });

  it("throws a clear error when PUBLIC_ORIGIN is missing", () => {
    expect(() => origin()).toThrow("PUBLIC_ORIGIN is not set");
  });

  it("defaults EdgeOS base and portal", () => {
    expect(edgeosBase()).toBe("https://api.edgeos.world/api/v1");
    expect(agenticAccessUrl()).toBe("https://portal.edgecity.live/portal/agentic-access");
  });
});
