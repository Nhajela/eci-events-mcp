import { describe, expect, it, vi } from "vitest";
import { protectedResourceMetadata } from "@/lib/oauth/metadata";
import { SITE_NAME } from "@/lib/site";
import { useTestSecrets } from "../helpers";

// biome-ignore lint/correctness/useHookAtTopLevel: test helper, not a React hook
useTestSecrets();
vi.mock("next/font/google", () => ({
  Instrument_Sans: () => ({ className: "", variable: "" }),
  Bricolage_Grotesque: () => ({ className: "", variable: "" }),
  JetBrains_Mono: () => ({ className: "", variable: "" }),
}));

describe("site name and metadata", () => {
  it("uses the community name everywhere", async () => {
    expect(SITE_NAME).toBe("Edge City India - Events MCP (Community Built)");
    const { metadata } = await import("@/app/layout");
    expect((metadata.title as { default: string }).default).toBe(SITE_NAME);
    expect(metadata.openGraph?.title).toBe(SITE_NAME);
    expect(protectedResourceMetadata().resource_name).toBe(SITE_NAME);
  });

  it("never names the hosting domain in metadata", async () => {
    const { metadata } = await import("@/app/layout");
    expect(JSON.stringify(metadata).toLowerCase()).not.toContain("positivesum");
  });
});
