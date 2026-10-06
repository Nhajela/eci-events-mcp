"use client";

import { useState } from "react";
import { track } from "@/components/analytics";

/**
 * One chunk per slide: a title, one line saying what to do, one thing to act
 * on, one picture. Anything else waits behind "More help".
 */
export type Slide = {
  id: string;
  title: string;
  lead: string;
  action?: React.ReactNode;
  visual?: React.ReactNode;
  more?: React.ReactNode;
};

export function Tutorial({ app, goal, slides }: { app: string; goal: string; slides: Slide[] }) {
  const [i, setI] = useState(0);
  const go = (n: number) => {
    setI(n);
    track("tutorial_step_viewed", { app, step: n + 1 });
  };
  const pct = Math.round(((i + 1) / slides.length) * 100);
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 bg-neutral-50 px-5 py-3 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-teal-900">
            <b>Goal:</b> {goal}
          </span>
          <span className="font-medium text-neutral-600">
            Step {i + 1} of {slides.length}
          </span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-neutral-200" aria-hidden="true">
          <div
            className="h-1.5 rounded-full bg-teal-700 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {slides.map((s, n) => (
        <section
          key={s.id}
          hidden={n !== i}
          aria-labelledby={`${app}-${s.id}`}
          className="grid gap-8 px-5 py-8 sm:px-8 md:grid-cols-[1fr_1.1fr] md:items-center"
        >
          <div className="min-w-0 space-y-5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 font-display text-lg text-white">
              {n + 1}
            </span>
            <h3 id={`${app}-${s.id}`} className="font-display text-3xl font-semibold leading-tight">
              {s.title}
            </h3>
            <p className="text-lg text-neutral-700">{s.lead}</p>
            {s.action && <div>{s.action}</div>}
            {s.more && (
              <details className="group rounded-lg text-neutral-700">
                <summary className="cursor-pointer select-none text-sm font-medium text-teal-800 underline">
                  More help
                </summary>
                <div className="mt-3 space-y-2 text-sm">{s.more}</div>
              </details>
            )}
          </div>
          {s.visual && <div className="min-w-0">{s.visual}</div>}
        </section>
      ))}

      <div className="flex items-center justify-between gap-3 border-t border-neutral-200 px-5 py-4 sm:px-8">
        <button
          type="button"
          onClick={() => go(Math.max(0, i - 1))}
          disabled={i === 0}
          className="rounded-lg px-4 py-2 font-medium text-neutral-700 hover:bg-neutral-100 disabled:invisible"
        >
          ← Back
        </button>
        {i < slides.length - 1 ? (
          <button
            type="button"
            onClick={() => go(i + 1)}
            className="rounded-lg bg-teal-700 px-6 py-3 font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Next →
          </button>
        ) : (
          <span className="font-medium text-teal-800">All done</span>
        )}
      </div>
    </div>
  );
}
