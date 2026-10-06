import { afterEach, describe, expect, it, vi } from "vitest";
import { seal, unseal } from "@/lib/seal";
import { useTestSecrets } from "../helpers";

// biome-ignore lint/correctness/useHookAtTopLevel: not a React hook; registers vitest beforeEach
const secrets = useTestSecrets();

afterEach(() => vi.useRealTimers());

describe("seal/unseal", () => {
  it("round-trips a payload", async () => {
    const t = await seal("access", { key: "eos_live_abc" }, { ttlSeconds: 60 });
    const out = await unseal<{ key: string }>("access", t);
    expect(out?.key).toBe("eos_live_abc");
  });

  it("produces ciphertext that does not contain the key", async () => {
    const t = await seal("access", { key: "eos_live_SECRETSECRET" }, { ttlSeconds: 60 });
    expect(t).not.toContain("eos_live_");
    expect(Buffer.from(t.split(".")[0], "base64url").toString()).toContain('"alg":"dir"');
  });

  it("rejects a tampered token", async () => {
    const t = await seal("access", { key: "k" }, { ttlSeconds: 60 });
    const parts = t.split(".");
    const ct = parts[3];
    parts[3] = (ct[0] === "A" ? "B" : "A") + ct.slice(1);
    expect(await unseal("access", parts.join("."))).toBeNull();
  });

  it("rejects the wrong artifact type", async () => {
    const code = await seal("code", { key: "k" }, { ttlSeconds: 60 });
    expect(await unseal("access", code)).toBeNull();
  });

  it("rejects expired artifacts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T00:00:00Z"));
    const t = await seal("code", { key: "k" }, { ttlSeconds: 60 });
    vi.setSystemTime(new Date("2026-10-14T00:02:00Z"));
    expect(await unseal("code", t)).toBeNull();
  });

  it("honours an absolute expiry", async () => {
    const t = await seal("refresh", { key: "k" }, { expiresAt: new Date(Date.now() + 3600_000) });
    const out = await unseal<{ key: string }>("refresh", t);
    expect(out?.exp).toBeGreaterThan(Date.now() / 1000);
  });

  it("checks the audience when asked", async () => {
    const t = await seal(
      "access",
      { key: "k" },
      { ttlSeconds: 60, audience: "https://mcp.test/api/mcp" },
    );
    expect(await unseal("access", t, { audience: "https://mcp.test/api/mcp" })).not.toBeNull();
    expect(await unseal("access", t, { audience: "https://other/api/mcp" })).toBeNull();
  });

  it("opens with an older secret after rotation and stops after removal", async () => {
    const t = await seal("access", { key: "k" }, { ttlSeconds: 60 });
    process.env.TOKEN_SECRETS = `${secrets.secretB},${secrets.secretA}`;
    expect(await unseal("access", t)).not.toBeNull();
    process.env.TOKEN_SECRETS = secrets.secretB;
    expect(await unseal("access", t)).toBeNull();
  });

  it("returns null for garbage", async () => {
    expect(await unseal("access", "not-a-token")).toBeNull();
  });

  it("refuses secrets that are not 32 bytes", async () => {
    process.env.TOKEN_SECRETS = "c2hvcnQ";
    await expect(seal("access", {}, { ttlSeconds: 1 })).rejects.toThrow("32 bytes");
  });
});
