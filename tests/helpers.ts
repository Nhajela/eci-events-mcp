import { base64url } from "jose";
import { beforeEach } from "vitest";
import { seal } from "@/lib/seal";
import type { Access } from "@/lib/types";

export function newSecret(): string {
  return base64url.encode(crypto.getRandomValues(new Uint8Array(32)));
}

export function useTestSecrets() {
  const secrets = { secretA: newSecret(), secretB: newSecret() };
  beforeEach(() => {
    process.env.TOKEN_SECRETS = secrets.secretA;
    process.env.PUBLIC_ORIGIN = "https://mcp.test";
  });
  return secrets;
}

export const TEST_ACCESS: Access = {
  key: "eos_live_AbCdEfGhIjKlMnOpQrStUvWxYz012345",
  scopes: ["events:read", "rsvp:write"],
  popup: {
    id: "ind",
    name: "Edge City India",
    slug: "edge-india-2026",
    startDate: "2026-10-11",
    endDate: "2026-11-01",
  },
};

export async function accessToken(over: Partial<Access> = {}): Promise<string> {
  const a = { ...TEST_ACCESS, ...over };
  return seal("access", a, { ttlSeconds: 3600, audience: "https://mcp.test/api/mcp" });
}
