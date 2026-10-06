export const MCP_PATH = "/api/mcp";
export const REPO_URL = "https://github.com/Nhajela/eci-events-mcp";

const trim = (s: string) => s.replace(/\/+$/, "");

export function origin(): string {
  const o = process.env.PUBLIC_ORIGIN;
  if (!o) throw new Error("PUBLIC_ORIGIN is not set");
  return trim(o);
}

export function mcpUrl(): string {
  return `${origin()}${MCP_PATH}`;
}

const DEFAULT_EDGEOS = "https://api.edgeos.world";
const DEFAULT_PORTAL = "https://portal.edgecity.live";

// Overrides are for local development and staging only. In production the
// EdgeOS and portal hosts are fixed in code, so changing them needs a deploy.
function override(name: "EDGEOS_API_BASE" | "EDGEOS_PORTAL_URL"): string | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  return process.env[name] || undefined;
}

export function edgeosBase(): string {
  return `${trim(override("EDGEOS_API_BASE") ?? DEFAULT_EDGEOS)}/api/v1`;
}

export function portalUrl(): string {
  return trim(override("EDGEOS_PORTAL_URL") ?? DEFAULT_PORTAL);
}

export function agenticAccessUrl(): string {
  return `${portalUrl()}/portal/agentic-access`;
}
