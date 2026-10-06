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

export function edgeosBase(): string {
  return `${trim(process.env.EDGEOS_API_BASE ?? "https://api.edgeos.world")}/api/v1`;
}

export function portalUrl(): string {
  return trim(process.env.EDGEOS_PORTAL_URL ?? "https://portal.edgecity.live");
}

export function agenticAccessUrl(): string {
  return `${portalUrl()}/portal/agentic-access`;
}
