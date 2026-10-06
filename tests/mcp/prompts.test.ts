import { describe, expect, it } from "vitest";
import { accessToken, useTestSecrets } from "../helpers";
import { connectClient } from "../mcp-client";

// biome-ignore lint/correctness/useHookAtTopLevel: not a React hook; registers vitest beforeEach
useTestSecrets();

describe("prompts", () => {
  it("offers the three workflows", async () => {
    const client = await connectClient(await accessToken());
    const names = (await client.listPrompts()).prompts.map((p) => p.name);
    expect(names).toEqual(
      expect.arrayContaining(["whats_on_today", "plan_my_week", "host_an_event"]),
    );
    const p = await client.getPrompt({ name: "whats_on_today" });
    expect(JSON.stringify(p.messages)).toContain("edgeos_initialize");
  });
});
