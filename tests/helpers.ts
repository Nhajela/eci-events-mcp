import { base64url } from "jose";
import { beforeEach } from "vitest";

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
