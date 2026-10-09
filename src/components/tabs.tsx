"use client";

import { useEffect, useState } from "react";

export type TabItem = {
  id: string;
  label: string;
  /** One line under the label; shown by the "buttons" variant. */
  hint?: string;
  content: React.ReactNode;
};

const STYLES = {
  underline: {
    list: "flex flex-wrap gap-2 border-b border-neutral-200",
    tab: "-mb-px rounded-t-lg border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-teal-700",
    on: "border-neutral-200 border-b-white bg-white text-neutral-950",
    off: "border-transparent text-neutral-600 hover:text-neutral-950",
  },
  // big side-by-side buttons, for when picking the tab is the first decision on the page
  buttons: {
    list: "grid gap-3 sm:grid-cols-3",
    tab: "flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900",
    on: "border-teal-900 bg-teal-900 text-white shadow-lg",
    off: "border-teal-900/25 bg-white text-teal-950 shadow-sm hover:-translate-y-0.5 hover:border-teal-900 hover:shadow-md",
  },
};

export function Tabs({
  tabs,
  onChange,
  variant = "underline",
  linkable = false,
}: {
  tabs: TabItem[];
  onChange?: (id: string) => void;
  variant?: keyof typeof STYLES;
  /** Follow the URL hash, so any `<a href="#id">` on the page switches tabs. */
  linkable?: boolean;
}) {
  const [active, setActive] = useState(tabs[0].id);
  const st = STYLES[variant];
  const choose = (id: string) => {
    if (id !== active) onChange?.(id);
    setActive(id);
  };

  useEffect(() => {
    if (!linkable) return;
    const sync = () => {
      const id = location.hash.slice(1);
      if (!tabs.some((t) => t.id === id)) return;
      setActive(id);
      document.getElementById(`tab-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    sync();
    addEventListener("hashchange", sync);
    return () => removeEventListener("hashchange", sync);
  }, [linkable, tabs]);

  return (
    <div>
      <div role="tablist" className={st.list}>
        {tabs.map((t) => {
          const on = active === t.id;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls={`panel-${t.id}`}
              onClick={() => {
                choose(t.id);
                if (linkable) history.replaceState(null, "", `#${t.id}`);
              }}
              className={`${st.tab} ${on ? st.on : st.off} scroll-mt-6`}
            >
              {variant === "buttons" ? (
                <>
                  <span
                    aria-hidden="true"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                      on ? "border-white bg-white text-teal-900" : "border-teal-900/40"
                    }`}
                  >
                    {on && "✓"}
                  </span>
                  <span>
                    <span className="block text-xl font-semibold">{t.label}</span>
                    {t.hint && (
                      <span className={`block text-sm ${on ? "text-teal-50" : "text-neutral-600"}`}>
                        {t.hint}
                      </span>
                    )}
                  </span>
                </>
              ) : (
                t.label
              )}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          id={`panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${t.id}`}
          hidden={active !== t.id}
          className="pt-6"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
