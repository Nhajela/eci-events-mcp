import { describe, expect, it } from "vitest";

describe("social preview image", () => {
  it("is a 1200x630 PNG with descriptive alt text", async () => {
    const mod = await import("@/app/opengraph-image");
    expect(mod.size).toEqual({ width: 1200, height: 630 });
    expect(mod.contentType).toBe("image/png");
    expect(mod.alt).toContain("Edge City India");
    const res = await mod.default();
    expect(res.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(1, 4)].map((b) => String.fromCharCode(b)).join("")).toBe("PNG");
  }, 30_000);

  it("is reused for the Twitter/X card", async () => {
    const tw = await import("@/app/twitter-image");
    expect(tw.size).toEqual({ width: 1200, height: 630 });
    expect(tw.alt).toContain("Edge City India");
  });
});
