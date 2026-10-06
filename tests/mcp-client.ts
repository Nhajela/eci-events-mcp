import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

/** A real MCP client talking to our POST handler in-process. */
export async function connectClient(token: string) {
  const { POST } = await import("@/app/api/mcp/route");
  const transport = new StreamableHTTPClientTransport(new URL("https://mcp.test/api/mcp"), {
    fetch: (url: string | URL | Request, init?: RequestInit) => POST(new Request(url, init)),
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  const client = new Client({ name: "vitest", version: "1.0.0" });
  await client.connect(transport);
  return client;
}
