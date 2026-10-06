import { describe, expect, it } from "vitest";
import { accessToken, newSecret, TEST_ACCESS, useTestSecrets } from "../helpers";
import { connectClient } from "../mcp-client";

// biome-ignore lint/correctness/useHookAtTopLevel: test helper registering beforeEach
useTestSecrets();

const post = async (headers: Record<string, string>, body: unknown) => {
  const { POST } = await import("@/app/api/mcp/route");
  return POST(
    new Request("https://mcp.test/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );
};

describe("/api/mcp", () => {
  it("answers 401 with resource metadata when there is no token", async () => {
    const res = await post({}, { jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBe(
      'Bearer resource_metadata="https://mcp.test/.well-known/oauth-protected-resource"',
    );
  });

  it("stale token gets 401 with resource metadata", async () => {
    const token = await accessToken();
    process.env.TOKEN_SECRETS = newSecret();
    const res = await post(
      { authorization: `Bearer ${token}` },
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("resource_metadata");
  });

  it("rejects a token minted for another audience", async () => {
    const { seal } = await import("@/lib/seal");
    const token = await seal("access", TEST_ACCESS, {
      ttlSeconds: 60,
      audience: "https://other/api/mcp",
    });
    const res = await post(
      { authorization: `Bearer ${token}` },
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
    );
    expect(res.status).toBe(401);
  });

  it("serves a 2025-11-25 client that sends initialize", async () => {
    const res = await post(
      { authorization: `Bearer ${await accessToken()}`, "mcp-protocol-version": "2025-11-25" },
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "legacy", version: "1" },
        },
      },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result.protocolVersion).toBe("2025-11-25");
    expect(json.result.instructions).toContain("edgeos_initialize");
  });

  it("serves a current SDK client end to end", async () => {
    const client = await connectClient(await accessToken());
    const tools = await client.listTools();
    expect(tools.tools.map((t) => t.name)).toContain("edgeos_initialize");
  });

  it("refuses GET", async () => {
    const { GET } = await import("@/app/api/mcp/route");
    expect(GET().status).toBe(405);
  });
});
