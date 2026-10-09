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
  it("landing is only the hero: headline, demo chips, chat and See how", async () => {
    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());
    const disclaimer = html.indexOf("Community-built, not an official Edge City app");
    expect(disclaimer).toBeGreaterThan(-1);
    expect(disclaimer).toBeLessThan(html.indexOf("<h1"));
    expect(html).toContain("@HiiNaman");
    expect(html).toContain("Let your AI agents handle your Edge City events");
    for (const t of ["Find events", "RSVP", "Create new events", "Confirm?", "Done ✓"])
      expect(html).toContain(t);
    expect(html).toMatch(/href="\/setup"[^>]*>See how/);
    expect(html).toContain("/landing/beach-tall.webp");
    expect(html).toContain("/landing/beach-wide.webp");
    expect(html).not.toContain("<h2");
  });

  it("setup is a 3-step slide tutorial for Claude and ChatGPT", async () => {
    const { default: Setup } = await import("@/app/setup/page");
    const html = renderToStaticMarkup(await Setup());
    expect(html).toContain("Set it up in 3 steps");
    expect(html).toContain("your Claude can see Edge City events");
    for (const t of [
      "Go to claude.ai → Customize → Connectors",
      "Add a custom connector with this link",
      "Add your Edge City key on the page that opens",
      "You&#x27;re done",
      "Go to ChatGPT → Plugins",
      "Add a custom MCP server with this link",
    ])
      expect(html).toContain(t);
    expect(html).toContain("Step 1 of 4");
    expect(html).toContain("https://mcp.test/api/mcp");
    expect(html).toContain("/portal/agentic-access");
    expect(html).toContain("Never paste your key into a chat");
    // detail is behind progressive disclosure
    expect(html.split("More help").length - 1).toBeGreaterThanOrEqual(6);
    expect(html).toContain("claude-add-custom-connector.png");
    expect(html).toContain("I use another AI agent");
    expect(html).toContain("Copy prompt");
    expect(html).toContain("Read the setup guide: https://mcp.test/connect.md");
    expect(html).toContain("claude mcp add --transport http eci-events");
    expect(html).toContain("/connect.md");
    expect(html).toContain("What we track");
    expect(html).toContain("We never keep your key");
  });

  it("claude.ai steps match the current Customize > Connectors flow", async () => {
    const { default: Setup } = await import("@/app/setup/page");
    const html = renderToStaticMarkup(await Setup());
    expect(html).toContain("https://claude.ai/customize/connectors");
    expect(html).toContain("Add custom connector");
    expect(html).toContain("Use Claude&#x27;s published identity");
    expect(html).toContain("Organization settings → Connectors");
    expect(html).not.toContain("Settings → Connectors → Add custom connector");
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
      "setup_viewed",
      "trust_viewed",
      "how_it_works_viewed",
      "connect_viewed",
      "client_tab_selected",
      "tutorial_step_viewed",
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
