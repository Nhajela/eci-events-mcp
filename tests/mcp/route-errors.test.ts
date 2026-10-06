import { afterEach, describe, expect, it, vi } from "vitest";
import { accessToken, newSecret, useTestSecrets } from "../helpers";

// biome-ignore lint/correctness/useHookAtTopLevel: test helper registering beforeEach
useTestSecrets();

afterEach(() => {
  vi.doUnmock("@/mcp/server");
  vi.doUnmock("@/mcp/analytics");
  vi.doUnmock("@/lib/oauth/token");
  vi.restoreAllMocks();
  vi.resetModules();
});

const KEY = "eos_live_AbCdEfGhIjKlMnOpQrStUvWxYz012345";

describe("/api/mcp error paths", () => {
  it("flushes analytics even when the handler throws", async () => {
    vi.resetModules();
    const flushAnalytics = vi.fn(async () => {});
    vi.doMock("@/mcp/analytics", () => ({ flushAnalytics }));
    vi.doMock("@/mcp/server", () => ({
      buildServer: () => {
        throw new Error("boom");
      },
    }));
    const { POST } = await import("@/app/api/mcp/route");
    const req = new Request("https://mcp.test/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-11-25",
        authorization: `Bearer ${await accessToken()}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "t", version: "1" },
        },
      }),
    });
    await expect(POST(req)).rejects.toThrow("boom");
    expect(flushAnalytics).toHaveBeenCalledTimes(1);
  });

  it("adds error=invalid_token when a presented token is invalid", async () => {
    const token = await accessToken();
    process.env.TOKEN_SECRETS = newSecret();
    const { POST } = await import("@/app/api/mcp/route");
    const res = await POST(
      new Request("https://mcp.test/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: "{}",
      }),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBe(
      'Bearer error="invalid_token", resource_metadata="https://mcp.test/.well-known/oauth-protected-resource"',
    );
  });
});

describe("/oauth/token error logging", () => {
  it("logs a scrubbed one-line JSON error and no body or headers", async () => {
    vi.resetModules();
    vi.doMock("@/lib/oauth/token", () => ({
      parseTokenBody: async () => ({}),
      exchangeToken: async () => {
        throw new Error(`exploded near ${KEY}`);
      },
    }));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("@/app/oauth/token/route");
    const res = await POST(
      new Request("https://mcp.test/oauth/token", {
        method: "POST",
        headers: { authorization: "Bearer secret-header" },
        body: "grant_type=refresh_token&refresh_token=secret-body",
      }),
    );
    expect(res.status).toBe(500);
    expect(err).toHaveBeenCalledTimes(1);
    const line = String(err.mock.calls[0][0]);
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({ scope: "oauth_token", status: "server_error" });
    expect(parsed.message).toContain("exploded near");
    expect(line).not.toContain("AbCdEfGh");
    expect(line).not.toContain("secret-header");
    expect(line).not.toContain("secret-body");
  });
});
