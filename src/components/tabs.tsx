"use client";

import { useState } from "react";

export type TabItem = { id: string; label: string; content: React.ReactNode };

export function Tabs({ tabs, onChange }: { tabs: TabItem[]; onChange?: (id: string) => void }) {
  const [active, setActive] = useState(tabs[0].id);
  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-2 border-b border-neutral-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => {
              if (t.id !== active) onChange?.(t.id);
              setActive(t.id);
            }}
            className={`-mb-px rounded-t-lg border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-teal-700 ${
              active === t.id
                ? "border-neutral-200 border-b-white bg-white text-neutral-950"
                : "border-transparent text-neutral-600 hover:text-neutral-950"
            }`}
          >
            {t.label}
          </button>
        ))}
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
