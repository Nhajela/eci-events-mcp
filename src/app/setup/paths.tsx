"use client";

import { useState } from "react";
import { track } from "@/components/analytics";

type Path = "techy" | "new";

/** Two big choices; both panels are rendered, the unchosen one is hidden. */
export function SetupPaths({
  techy,
  beginner,
}: {
  techy: React.ReactNode;
  beginner: React.ReactNode;
}) {
  const [path, setPath] = useState<Path | null>(null);
  const choose = (p: Path) => {
    setPath(p);
    track("setup_path_selected", { path: p });
  };
  const btn = (p: Path, title: string, sub: string) => (
    <button
      type="button"
      onClick={() => choose(p)}
      aria-pressed={path === p}
      aria-controls={`setup-${p}`}
      className={`flex min-w-0 flex-col items-start rounded-2xl border-2 p-5 text-left transition focus-visible:outline-2 focus-visible:outline-teal-700 ${
        path === p ? "border-teal-700 bg-teal-50" : "border-neutral-200 hover:border-teal-600"
      }`}
    >
      <span className="font-display text-xl font-semibold">{title}</span>
      <span className="mt-1 text-neutral-700">{sub}</span>
    </button>
  );
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {btn(
          "new",
          "I'm new to this, walk me through it",
          "Step by step, with pictures. About 3 minutes.",
        )}
        {btn("techy", "I know MCP servers", "Just the URL, auth details and config snippets.")}
      </div>
      <div id="setup-new" hidden={path !== "new" && path !== null} className="mt-8">
        {beginner}
      </div>
      <div id="setup-techy" hidden={path !== "techy"} className="mt-8">
        {techy}
      </div>
    </div>
  );
}
