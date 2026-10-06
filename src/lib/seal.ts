// The only module that encrypts or decrypts. Every OAuth artifact this server
// issues is a JWE (alg "dir", enc "A256GCM") under TOKEN_SECRETS: the data a
// database row would hold travels inside the token instead, so nothing is
// stored. The first secret seals; every listed secret opens (rotation).

import { createHash } from "node:crypto";
import { base64url, EncryptJWT, jwtDecrypt } from "jose";

export type ArtifactType = "client" | "authreq" | "code" | "access" | "refresh" | "proposal";

const RESERVED = ["iat", "exp", "nbf", "aud", "iss", "jti"];

type Keyed = { kid: string; key: Uint8Array };

function keys(): Keyed[] {
  const raw = process.env.TOKEN_SECRETS;
  if (!raw) throw new Error("TOKEN_SECRETS is not set");
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const key = base64url.decode(s);
      if (key.length !== 32)
        throw new Error("Each TOKEN_SECRETS entry must be 32 bytes, base64url");
      return { kid: createHash("sha256").update(key).digest("hex").slice(0, 8), key };
    });
}

export async function seal(
  typ: ArtifactType,
  payload: Record<string, unknown>,
  opts: { ttlSeconds?: number; expiresAt?: Date; audience?: string },
): Promise<string> {
  const [current] = keys();
  const hasExpiry =
    (opts.expiresAt instanceof Date && !Number.isNaN(opts.expiresAt.getTime())) ||
    (typeof opts.ttlSeconds === "number" && opts.ttlSeconds > 0);
  // Only the DCR client_id may live until the secret is rotated.
  if (!hasExpiry && typ !== "client")
    throw new Error(`seal(${typ}) needs expiresAt or ttlSeconds > 0`);
  const claims = { ...payload };
  for (const reserved of RESERVED) delete claims[reserved];
  let jwt = new EncryptJWT({ ...claims, typ })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", kid: current.kid })
    .setIssuedAt();
  if (opts.expiresAt) jwt = jwt.setExpirationTime(Math.floor(opts.expiresAt.getTime() / 1000));
  else if (opts.ttlSeconds && opts.ttlSeconds > 0)
    jwt = jwt.setExpirationTime(`${opts.ttlSeconds}s`);
  if (opts.audience) jwt = jwt.setAudience(opts.audience);
  return jwt.encrypt(current.key);
}

export async function unseal<T>(
  typ: ArtifactType,
  token: string,
  opts: { audience?: string } = {},
): Promise<(T & { iat: number; exp?: number }) | null> {
  const known = keys();
  // Access tokens are only valid for this server's MCP URL; never check one without it.
  if (typ === "access" && !opts.audience) return null;
  try {
    const { payload } = await jwtDecrypt(
      token,
      (header) => {
        const match = known.find((k) => k.kid === header.kid);
        if (!match) throw new Error("unknown kid");
        return match.key;
      },
      {
        audience: opts.audience,
        clockTolerance: 5,
        keyManagementAlgorithms: ["dir"],
        contentEncryptionAlgorithms: ["A256GCM"],
        requiredClaims: typ === "client" ? [] : ["exp"],
      },
    );
    if (payload.typ !== typ) return null;
    return payload as T & { iat: number; exp?: number };
  } catch {
    return null;
  }
}
