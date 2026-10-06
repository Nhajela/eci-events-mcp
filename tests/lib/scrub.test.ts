import { describe, expect, it } from "vitest";
import { keyPrefix, looksLikeKey, normalizeKey, pseudonymId, scrubKeys } from "@/lib/scrub";

const KEY = "eos_live_AbCdEfGhIjKlMnOpQrStUvWxYz012345";

describe("scrub", () => {
  it("redacts keys anywhere in a string", () => {
    expect(scrubKeys(`bad token ${KEY} here`)).toBe("bad token eos_live_[redacted] here");
  });
  it("keeps only the public prefix", () => {
    expect(keyPrefix(KEY)).toBe("eos_live_AbCdEfGh");
  });
  it("makes a stable pseudonym that is not the prefix", () => {
    const a = pseudonymId(KEY, "salt");
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).toBe(pseudonymId(KEY, "salt"));
    expect(a).not.toBe(pseudonymId(KEY, "other"));
  });
  it("normalizes pasted keys", () => {
    expect(normalizeKey(`  Bearer ${KEY}\n`)).toBe(KEY);
    expect(normalizeKey(`"${KEY}"`)).toBe(KEY);
  });
  it("recognizes key shape", () => {
    expect(looksLikeKey(KEY)).toBe(true);
    expect(looksLikeKey("eos_live_short")).toBe(false);
    expect(looksLikeKey("sk-123")).toBe(false);
  });
});
