import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SERVER_INSTRUCTIONS } from "@/mcp/instructions";
import { PROMPTS } from "@/mcp/prompts";
import { STEERING } from "@/mcp/propose/register";
import { RUBRIC } from "@/mcp/propose/reviewer";
import { useTestSecrets } from "../helpers";

// biome-ignore lint/correctness/useHookAtTopLevel: not a React hook; registers vitest beforeEach
useTestSecrets();
vi.mock("next/font/google", () => ({
  Instrument_Sans: () => ({ className: "", variable: "" }),
  Bricolage_Grotesque: () => ({ className: "", variable: "" }),
  JetBrains_Mono: () => ({ className: "", variable: "" }),
}));

const esc = (s: string) => renderToStaticMarkup(<>{s}</>);

describe("/how-it-works", () => {
  it("has three layers and shows every injected text verbatim", async () => {
    const { default: Page } = await import("@/app/how-it-works/page");
    const html = renderToStaticMarkup(await Page());
    for (const t of ["New to this", "Curious", "Technical"]) expect(html).toContain(t);
    expect(html).toContain(esc(SERVER_INSTRUCTIONS.split("\n")[0]));
    expect(html).toContain(esc(STEERING));
    expect(html).toContain(esc(RUBRIC.split("\n")[0]));
    for (const p of PROMPTS) expect(html).toContain(esc(p.text));
    expect(html).toContain("edgeos_venue_availability");
    expect(html).toContain("2026-10-06-eci-events-mcp-design.md");
  });
});
