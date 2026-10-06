import { mcpUrl } from "@/lib/env";
import { seal, unseal } from "@/lib/seal";
import type { Access } from "@/lib/types";
import { REFRESH_UNTIL } from "./authorize";
import { verifyPkce } from "./pkce";

type CodePayload = Access & {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  resource: string | null;
};
type RefreshPayload = Access & { clientId: string };
type TokenResult = { status: number; body: Record<string, unknown> };

const err = (error: string, description: string, status = 400): TokenResult => ({
  status,
  body: { error, error_description: description },
});

export async function parseTokenBody(request: Request): Promise<URLSearchParams> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const j = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return new URLSearchParams(
      Object.entries(j).filter(([, v]) => typeof v === "string") as [string, string][],
    );
  }
  return new URLSearchParams(await request.text());
}

async function issue(access: Access, clientId: string): Promise<TokenResult> {
  const base = { key: access.key, scopes: access.scopes, popup: access.popup };
  const accessToken = await seal("access", base, { ttlSeconds: 3600, audience: mcpUrl() });
  const refreshToken = await seal("refresh", { ...base, clientId }, { expiresAt: REFRESH_UNTIL });
  return {
    status: 200,
    body: {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: access.scopes.join(" "),
    },
  };
}

export async function exchangeToken(p: URLSearchParams): Promise<TokenResult> {
  const grant = p.get("grant_type");
  if (grant === "authorization_code") {
    const code = await unseal<CodePayload>("code", p.get("code") ?? "");
    if (!code) return err("invalid_grant", "The code is invalid or expired.");
    if (p.get("client_id") && p.get("client_id") !== code.clientId)
      return err("invalid_grant", "Code was issued to another client.");
    if (p.get("redirect_uri") !== code.redirectUri)
      return err("invalid_grant", "redirect_uri does not match.");
    if (!verifyPkce(p.get("code_verifier") ?? "", code.codeChallenge))
      return err("invalid_grant", "PKCE verification failed.");
    const resource = p.get("resource");
    if (resource && resource.replace(/\/+$/, "") !== mcpUrl())
      return err("invalid_target", "Unknown resource.");
    return issue(code, code.clientId);
  }
  if (grant === "refresh_token") {
    const r = await unseal<RefreshPayload>("refresh", p.get("refresh_token") ?? "");
    if (!r) return err("invalid_grant", "The refresh token is invalid or expired. Connect again.");
    if (p.get("client_id") && p.get("client_id") !== r.clientId)
      return err("invalid_grant", "Refresh token was issued to another client.");
    return issue(r, r.clientId);
  }
  return err("unsupported_grant_type", "Use authorization_code or refresh_token.");
}
