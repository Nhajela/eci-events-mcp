import { describe, expect, it } from "vitest";
import config from "../../next.config";

describe("security headers", () => {
  it("forbids framing everywhere and drops the referrer on /connect", async () => {
    const rules = (await config.headers?.()) ?? [];
    const all = rules.find((r) => r.source === "/:path*");
    expect(all?.headers).toEqual(
      expect.arrayContaining([
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      ]),
    );
    const connect = rules.find((r) => r.source === "/connect");
    expect(connect?.headers).toEqual([{ key: "Referrer-Policy", value: "no-referrer" }]);
  });

  it("keeps the well-known rewrites", async () => {
    const r = (await config.rewrites?.()) as { beforeFiles: { source: string }[] };
    expect(r.beforeFiles.map((x) => x.source)).toContain("/.well-known/oauth-protected-resource");
  });
});
