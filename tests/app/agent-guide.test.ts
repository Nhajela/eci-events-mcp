import { describe, expect, it } from "vitest";
import { useTestSecrets } from "../helpers";

// biome-ignore lint/correctness/useHookAtTopLevel: test helper, not a React hook
useTestSecrets();

describe("agent guide (/connect.md)", () => {
  it("serves Markdown an AI agent can follow to add the server", async () => {
    const { GET } = await import("@/app/api/agent-guide/route");
    const res = GET();
    expect(res.headers.get("content-type")).toContain("text/markdown");
    const md = await res.text();
    expect(md).toContain("https://mcp.test/api/mcp");
    expect(md).toContain("claude mcp add --transport http eci-events https://mcp.test/api/mcp");
    expect(md).toContain('"url": "https://mcp.test/api/mcp"');
    expect(md).toContain("[mcp_servers.eci-events]");
    expect(md).toContain("Customize → Connectors");
    expect(md).toContain("Add custom MCP server");
    expect(md).toContain("/portal/agentic-access");
    expect(md).toContain("Never ask the user to paste their EdgeOS key into the chat");
    expect(md).toContain("edgeos_initialize");
  });
});
