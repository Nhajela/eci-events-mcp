import { afterEach, describe, expect, it, vi } from "vitest";
import { buildInfo } from "@/lib/build";
import { agenticAccessUrl, edgeosBase, mcpUrl, origin } from "@/lib/env";

afterEach(() => {
  vi.unstubAllEnvs();
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

  it("honours overrides outside production", () => {
    process.env.EDGEOS_API_BASE = "https://staging.edgeos.test/";
    process.env.EDGEOS_PORTAL_URL = "https://portal.staging.test";
    expect(edgeosBase()).toBe("https://staging.edgeos.test/api/v1");
    expect(agenticAccessUrl()).toBe("https://portal.staging.test/portal/agentic-access");
  });

  it("ignores EdgeOS overrides in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.EDGEOS_API_BASE = "https://evil.example.com";
    process.env.EDGEOS_PORTAL_URL = "https://evil.example.com";
    expect(edgeosBase()).toBe("https://api.edgeos.world/api/v1");
    expect(agenticAccessUrl()).toBe("https://portal.edgecity.live/portal/agentic-access");
  });

  it("shows the effective EdgeOS base in build info", () => {
    expect(buildInfo().edgeosBase).toBe("https://api.edgeos.world/api/v1");
    process.env.EDGEOS_API_BASE = "https://staging.edgeos.test";
    expect(buildInfo().edgeosBase).toBe("https://staging.edgeos.test/api/v1");
  });
});
