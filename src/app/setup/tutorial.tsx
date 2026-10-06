"use client";

import { useState } from "react";
import { track } from "@/components/analytics";

export type Slide = { id: string; title: string; body: React.ReactNode };

/**
 * One slide at a time with Back/Next. Every slide is rendered (hidden ones
 * use the hidden attribute) so the whole guide works without JavaScript and
 * is readable by search engines and screen-reader "find".
 */
export function Tutorial({ app, slides }: { app: string; slides: Slide[] }) {
  const [i, setI] = useState(0);
  const go = (n: number) => {
    setI(n);
    track("tutorial_step_viewed", { app, step: n + 1 });
  };
  return (
    <div className="rounded-2xl border border-neutral-200 p-5 sm:p-8">
      <ol className="flex flex-wrap gap-2" aria-label="Steps">
        {slides.map((s, n) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => go(n)}
              aria-current={n === i ? "step" : undefined}
              aria-label={`Step ${n + 1}: ${s.title}`}
              className={`h-8 min-w-8 rounded-full px-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-teal-700 ${
                n === i
                  ? "bg-teal-700 text-white"
                  : n < i
                    ? "bg-teal-100 text-teal-900"
                    : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {n + 1}
            </button>
          </li>
        ))}
      </ol>
      {slides.map((s, n) => (
        <section key={s.id} hidden={n !== i} aria-labelledby={`${app}-${s.id}`} className="mt-6">
          <p className="text-sm font-medium uppercase tracking-wider text-teal-800">
            Step {n + 1} of {slides.length}
          </p>
          <h3 id={`${app}-${s.id}`} className="mt-1 font-display text-2xl font-semibold">
            {s.title}
          </h3>
          <div className="mt-4 space-y-4 text-neutral-800">{s.body}</div>
        </section>
      ))}
      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(Math.max(0, i - 1))}
          disabled={i === 0}
          className="rounded-lg border border-neutral-300 px-4 py-2 font-medium disabled:opacity-40"
        >
          Back
        </button>
        {i < slides.length - 1 ? (
          <button
            type="button"
            onClick={() => go(i + 1)}
            className="rounded-lg bg-teal-700 px-5 py-2 font-medium text-white hover:bg-teal-800"
          >
            Next: {slides[i + 1].title}
          </button>
        ) : (
          <span className="font-medium text-teal-800">You're done</span>
        )}
      </div>
    </div>
  );
}
