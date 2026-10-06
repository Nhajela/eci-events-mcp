// Builds the real server for a sample attendee with every scope and asks it
// for tools/list and prompts/list in-process, so /how-it-works shows exactly
// what an AI receives. Listing makes no EdgeOS calls; the sample key goes nowhere.

import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createMcpHandler } from "@modelcontextprotocol/server";
import type { Access } from "@/lib/types";
import { buildServer } from "./server";

export const SAMPLE_ACCESS: Access = {
  key: "eos_live_SAMPLE_NOT_A_REAL_KEY_000000",
  scopes: ["events:read", "rsvp:write", "events:write", "venues:write"],
  popup: {
    id: "00000000-0000-0000-0000-000000000000",
    name: "Edge City India",
    slug: "edge-india-2026",
    startDate: "2026-10-11",
    endDate: "2026-11-01",
  },
};

export type CatalogTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema: unknown;
  annotations?: Record<string, unknown>;
};

export async function getCatalog(): Promise<{
  tools: CatalogTool[];
  prompts: { name: string; description?: string }[];
}> {
  const handler = createMcpHandler(() => buildServer(SAMPLE_ACCESS), { responseMode: "json" });
  const authInfo = {
    token: "[sample]",
    clientId: "catalog",
    scopes: SAMPLE_ACCESS.scopes,
    extra: { access: SAMPLE_ACCESS },
  };
  const transport = new StreamableHTTPClientTransport(new URL("http://catalog.local/api/mcp"), {
    fetch: (url: string | URL | Request, init?: RequestInit) =>
      handler.fetch(new Request(url, init), { authInfo }),
  });
  const client = new Client({ name: "how-it-works", version: "1.0.0" });
  await client.connect(transport);
  try {
    const [tools, prompts] = await Promise.all([client.listTools(), client.listPrompts()]);
    return {
      tools: tools.tools.map((t) => ({
        name: t.name,
        title: t.title,
        description: t.description ?? "",
        inputSchema: t.inputSchema,
        annotations: t.annotations as Record<string, unknown> | undefined,
      })),
      prompts: prompts.prompts.map((p) => ({ name: p.name, description: p.description })),
    };
  } finally {
    await client.close();
  }
}
