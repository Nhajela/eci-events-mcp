import {
  type AuthInfo,
  createMcpHandler,
  isLegacyRequest,
  WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/server";
import { after } from "next/server";
import { origin } from "@/lib/env";
import type { Access } from "@/lib/types";
import { flushAnalytics } from "@/mcp/analytics";
import { resolveAccess } from "@/mcp/lib/auth";
import { buildServer } from "@/mcp/server";

// Stateless: a fresh McpServer per request, built for this attendee's scopes.
// 2026-07-28 clients go through createMcpHandler. 2025-era clients (initialize
// handshake, 2025-11-25) are routed with isLegacyRequest to a per-request
// transport with enableJsonResponse, because the SDK's built-in legacy
// fallback always answers with SSE and offers no way to ask for JSON.
const handler = createMcpHandler(
  ({ authInfo }) => {
    const access = authInfo?.extra?.access as Access | undefined;
    if (!access) throw new Error("MCP handler invoked without authInfo.extra.access");
    return buildServer(access);
  },
  {
    legacy: "reject",
    responseMode: "json",
  },
);

async function serveLegacy(
  request: Request,
  authInfo: AuthInfo,
  access: Access,
): Promise<Response> {
  const server = buildServer(access);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  try {
    await server.connect(transport);
    // enableJsonResponse: the body is fully built before handleRequest resolves.
    return await transport.handleRequest(request, { authInfo });
  } finally {
    await server.close().catch(() => {});
  }
}

function unauthorized(): Response {
  return Response.json(
    {
      error: "unauthorized",
      error_description: "Connect this server from your MCP client to sign in.",
    },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": `Bearer resource_metadata="${origin()}/.well-known/oauth-protected-resource"`,
      },
    },
  );
}

export async function POST(request: Request): Promise<Response> {
  const access = await resolveAccess(request.headers.get("authorization"));
  if (!access) return unauthorized();
  const authInfo: AuthInfo = {
    token: "[sealed]",
    clientId: "eci-events",
    scopes: access.scopes,
    extra: { access },
  };
  const res = (await isLegacyRequest(request))
    ? await serveLegacy(request, authInfo, access)
    : await handler.fetch(request, { authInfo });
  after(flushAnalytics);
  return res;
}

export function GET(): Response {
  return Response.json({ error: "Use POST." }, { status: 405, headers: { Allow: "POST" } });
}

export const DELETE = GET;
