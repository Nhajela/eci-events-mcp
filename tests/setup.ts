import { vi } from "vitest";

// Run `after` callbacks immediately so tests see their effects; keep the rest of next/server real.
vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  after: (fn: () => unknown) => void fn(),
}));
