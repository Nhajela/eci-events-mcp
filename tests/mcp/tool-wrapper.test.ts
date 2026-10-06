import { describe, expect, it, vi } from "vitest";
import { EdgeosError } from "@/lib/edgeos/client";
import { ToolError, withToolHandler } from "@/mcp/lib/tool-wrapper";
import { TEST_ACCESS, useTestSecrets } from "../helpers";

// biome-ignore lint/correctness/useHookAtTopLevel: test helper registering beforeEach
useTestSecrets();

describe("withToolHandler", () => {
  it("maps EdgeOS 401 to a reconnect message", async () => {
    const h = withToolHandler("t", TEST_ACCESS, async () => {
      throw new EdgeosError(401, "Invalid token", null);
    });
    const r = await h({});
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("AUTH_EXPIRED");
    expect(r.content[0].text).toContain("https://mcp.test");
  });

  it("maps 429 with Retry-After", async () => {
    const h = withToolHandler("t", TEST_ACCESS, async () => {
      throw new EdgeosError(429, "slow", 7);
    });
    expect((await h({})).content[0].text).toContain("Wait 7 seconds");
  });

  it("names the missing scope on 403", async () => {
    const h = withToolHandler("t", TEST_ACCESS, async () => {
      throw new EdgeosError(403, "API key lacks required scope: events:write", null);
    });
    const text = (await h({})).content[0].text;
    expect(text).toContain("events:write");
    expect(text).toContain("/portal/agentic-access");
  });

  it("passes ToolError codes through", async () => {
    const h = withToolHandler("t", TEST_ACCESS, async () => {
      throw new ToolError("BAD_INPUT", "Pick a date.");
    });
    expect((await h({})).content[0].text).toBe("BAD_INPUT: Pick a date.");
  });

  it("hides internal errors and never logs the key", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const h = withToolHandler("t", TEST_ACCESS, async () => {
      throw new Error(`boom ${TEST_ACCESS.key}`);
    });
    const r = await h({});
    expect(r.content[0].text).toMatch(/^INTERNAL_ERROR/);
    const logged = log.mock.calls.flat().join(" ");
    expect(logged).not.toContain(TEST_ACCESS.key);
    expect(logged).toContain("eos_live_[redacted]");
    log.mockRestore();
  });
});
