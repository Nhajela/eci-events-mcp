import { afterEach, describe, expect, it, vi } from "vitest";
import { analyticsBeforeSend } from "@/mcp/analytics";

describe("analytics privacy", () => {
  it("drops parameters and responses, keeps input keys", () => {
    const out = analyticsBeforeSend({
      properties: {
        $mcp_tool_name: "edgeos_get_event",
        $mcp_parameters: { event_id: "e1" },
        $mcp_response: "Sunset Breathwork",
        $mcp_input_keys: ["event_id"],
      },
    });
    expect(out?.properties).toEqual({
      $mcp_tool_name: "edgeos_get_event",
      $mcp_input_keys: ["event_id"],
      $process_person_profile: false,
    });
  });

  it("scrubs keys from any remaining string", () => {
    const out = analyticsBeforeSend({
      properties: { $exception_message: "bad eos_live_AbCdEfGhIjKlMnOpQrStUvWx" },
    });
    expect(JSON.stringify(out)).not.toContain("AbCdEfGh");
  });
});

describe("analytics privacy, more", () => {
  it("drops tool error text", () => {
    const out = analyticsBeforeSend({
      properties: { $mcp_error_message: "no such event my-secret-title", $mcp_is_error: true },
    });
    expect(out?.properties).toEqual({ $mcp_is_error: true, $process_person_profile: false });
  });

  it("scrubs a key embedded in an exception list", () => {
    const out = analyticsBeforeSend({
      properties: {
        $exception_list: [
          { type: "Error", value: "failed with eos_live_ZyXwVuTsRqPoNmLkJiHgFeDc" },
        ],
      },
    });
    expect(JSON.stringify(out)).not.toContain("ZyXwVuTs");
  });
});

describe("analytics is off without token and salt", () => {
  const access = {
    key: "eos_live_AbCdEfGhIjKlMnOpQrStUvWx",
    popup: { slug: "ind" },
    scopes: ["events:read"],
  } as never;

  const load = async (env: Record<string, string | undefined>) => {
    vi.resetModules();
    vi.stubEnv("POSTHOG_PROJECT_TOKEN", env.token ?? "");
    vi.stubEnv("POSTHOG_ID_SALT", env.salt ?? "");
    const instrument = vi.fn();
    vi.doMock("@posthog/mcp", () => ({ instrument }));
    const mod = await import("@/mcp/analytics");
    return { mod, instrument };
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@posthog/mcp");
  });

  it("is a no-op without the token", async () => {
    const { mod, instrument } = await load({ salt: "s" });
    mod.instrumentServer({} as never, access);
    mod.captureEvent(access, "x", {});
    await mod.flushAnalytics();
    expect(instrument).not.toHaveBeenCalled();
  });

  it("is a no-op without the salt", async () => {
    const { mod, instrument } = await load({ token: "phc_t" });
    mod.instrumentServer({} as never, access);
    expect(instrument).not.toHaveBeenCalled();
  });

  it("instruments when both are set", async () => {
    const { mod, instrument } = await load({ token: "phc_t", salt: "s" });
    mod.instrumentServer({} as never, access);
    expect(instrument).toHaveBeenCalledTimes(1);
  });
});

describe("instrumented server never sends tool error text", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("posthog-node");
    vi.resetModules();
  });

  it("sends no $exception event and no error text for a failing tool", async () => {
    vi.resetModules();
    vi.stubEnv("POSTHOG_PROJECT_TOKEN", "phc_test");
    vi.stubEnv("POSTHOG_ID_SALT", "salt");
    const sent: { event: string; properties?: Record<string, unknown> }[] = [];
    vi.doMock("posthog-node", () => ({
      PostHog: class {
        capture(e: { event: string; properties?: Record<string, unknown> }) {
          sent.push(e);
        }
        async flush() {}
      },
    }));
    const { newSecret, accessToken } = await import("../helpers");
    vi.stubEnv("TOKEN_SECRETS", newSecret());
    vi.stubEnv("PUBLIC_ORIGIN", "https://mcp.test");
    const { mockEdgeos } = await import("../edgeos-mock");
    mockEdgeos([
      {
        method: "GET",
        path: "/events/portal/events/zz-secret-id",
        status: 404,
        body: { detail: "Event zz-secret-id not found" },
      },
    ]);
    const { connectClient } = await import("../mcp-client");
    const client = await connectClient(await accessToken());
    const r = await client.callTool({
      name: "edgeos_get_event",
      arguments: { event_id: "zz-secret-id", context: "checking an event" },
    });
    expect(r.isError).toBe(true);
    await vi.waitFor(() => expect(sent.some((e) => e.event === "$mcp_tool_call")).toBe(true));
    expect(sent.map((e) => e.event)).not.toContain("$exception");
    expect(JSON.stringify(sent)).not.toContain("zz-secret-id");
  });

  it("drops any $exception event in beforeSend", () => {
    expect(
      analyticsBeforeSend({ event: "$exception", properties: { $exception_list: [] } }),
    ).toBeNull();
  });
});
