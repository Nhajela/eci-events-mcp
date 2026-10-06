import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { seal } from "@/lib/seal";
import { useTestSecrets } from "../helpers";

// biome-ignore lint/correctness/useHookAtTopLevel: test helper, not a React hook
useTestSecrets();
vi.mock("next/font/google", () => ({
  Instrument_Sans: () => ({ className: "font-body", variable: "--font-body" }),
  Bricolage_Grotesque: () => ({ className: "font-display", variable: "--font-display" }),
  JetBrains_Mono: () => ({ className: "font-mono", variable: "--font-mono" }),
}));

describe("pages", () => {
  it("landing shows the MCP URL and both app guides", async () => {
    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain("https://mcp.test/api/mcp");
    expect(html).toContain("claude.ai");
    expect(html).toContain("ChatGPT");
    expect(html).toContain("/portal/agentic-access");
    expect(html).toContain("Never paste your key into a chat");
  });

  it("trust page explains at four levels and links the key files", async () => {
    const { default: Trust } = await import("@/app/trust/page");
    const html = renderToStaticMarkup(await Trust());
    for (const t of ["In plain words", "Analogy", "Technical", "Verify it yourself"])
      expect(html).toContain(t);
    expect(html).toContain("src/lib/seal.ts");
    expect(html).toContain("What is proven");
    expect(html).toContain("requests the AI makes for features we don");
    expect(html).toContain("Web pages");
    for (const e of [
      "landing_viewed",
      "trust_viewed",
      "how_it_works_viewed",
      "connect_viewed",
      "client_tab_selected",
      "connect_started",
      "key_accepted",
      "key_rejected",
    ])
      expect(html).toContain(e);
    expect(html).toContain("popup slug");
    expect(html).toContain("conversation id");
    expect(html).toContain("only when enabled");
    expect(html).toContain("You or your AI read the key files at the commit this server runs");
  });

  it("connect page explains an expired link", async () => {
    const { default: Connect } = await import("@/app/connect/page");
    const html = renderToStaticMarkup(
      await Connect({ searchParams: Promise.resolve({ req: "expired" }) }),
    );
    expect(html).toContain("expired");
  });

  it("connect page shows where the attendee will be sent back", async () => {
    const req = await seal(
      "authreq",
      {
        clientId: "c1",
        clientName: "Test App",
        redirectUri: "https://app.example.org/callback",
        codeChallenge: "x",
        state: null,
        resource: null,
      },
      { ttlSeconds: 600 },
    );
    const { default: Connect } = await import("@/app/connect/page");
    const html = renderToStaticMarkup(await Connect({ searchParams: Promise.resolve({ req }) }));
    expect(html).toContain("Test App");
    expect(html).toContain("You&#x27;ll be sent back to");
    expect(html).toContain("app.example.org");
  });
});
