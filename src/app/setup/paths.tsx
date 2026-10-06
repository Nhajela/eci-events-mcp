"use client";

import { useState } from "react";
import { track } from "@/components/analytics";

type Path = "techy" | "new";

/**
 * The hero plus its two choices. The beginner guide shows by default; the
 * techy card replaces it when chosen. Both are rendered (one hidden) so the
 * page works without JavaScript.
 */
export function SetupPaths({
  hero,
  visual,
  techy,
  beginner,
}: {
  hero: React.ReactNode;
  visual: React.ReactNode;
  techy: React.ReactNode;
  beginner: React.ReactNode;
}) {
  const [path, setPath] = useState<Path>("new");
  const choose = (p: Path) => {
    setPath(p);
    track("setup_path_selected", { path: p });
    document.getElementById("setup")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <>
      <section className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
        <div className="min-w-0">
          {hero}
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={() => choose("new")}
              aria-controls="setup-new"
              className="rounded-lg bg-teal-700 px-6 py-3 text-lg font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              I'm new to this, walk me through it
            </button>
            <button
              type="button"
              onClick={() => choose("techy")}
              aria-controls="setup-techy"
              className="px-2 py-3 text-lg font-medium text-teal-800 underline underline-offset-4 hover:text-teal-950"
            >
              I know MCP servers →
            </button>
          </div>
        </div>
        <div className="min-w-0">{visual}</div>
      </section>

      <section id="setup" className="mt-20 scroll-mt-6">
        <h2 className="font-display text-3xl font-semibold">
          {path === "new" ? "Set it up in 7 steps" : "Quick setup"}
        </h2>
        <div id="setup-new" hidden={path !== "new"} className="mt-6">
          {beginner}
        </div>
        <div id="setup-techy" hidden={path !== "techy"} className="mt-6">
          {techy}
          <button
            type="button"
            onClick={() => choose("new")}
            className="mt-4 text-sm font-medium text-teal-800 underline"
          >
            Prefer the step-by-step guide?
          </button>
        </div>
      </section>
    </>
  );
}
