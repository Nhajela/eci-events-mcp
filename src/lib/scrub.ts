import { createHmac } from "node:crypto";

const KEY_RE = /eos_live_[A-Za-z0-9_-]+/g;
const PREFIX_LEN = "eos_live_".length + 8; // what EdgeOS itself shows in its UI

export function scrubKeys(s: string): string {
  return s.replace(KEY_RE, "eos_live_[redacted]");
}

export function keyPrefix(key: string): string {
  return key.slice(0, PREFIX_LEN);
}

/** Stable, non-reversible id for analytics and logs. */
export function pseudonymId(key: string, salt: string): string {
  return createHmac("sha256", salt).update(keyPrefix(key)).digest("hex").slice(0, 32);
}

export function normalizeKey(input: string): string {
  return input
    .trim()
    .replace(/^bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

export function looksLikeKey(s: string): boolean {
  return /^eos_live_[A-Za-z0-9_-]{20,}$/.test(s);
}
