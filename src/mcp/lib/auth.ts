import { mcpUrl } from "@/lib/env";
import { unseal } from "@/lib/seal";
import type { Access } from "@/lib/types";

export async function resolveAccess(authHeader: string | null): Promise<Access | null> {
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return null;
  const a = await unseal<Access>("access", authHeader.slice(7).trim(), { audience: mcpUrl() });
  if (!a?.key || !Array.isArray(a.scopes) || !a.popup?.id) return null;
  return { key: a.key, scopes: a.scopes, popup: a.popup };
}
