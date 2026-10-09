"use client";

import { track } from "@/components/analytics";
import { type TabItem, Tabs } from "@/components/tabs";

/** The landing page's app tabs, reporting which app guide was opened. */
export function LandingTabs({ tabs }: { tabs: TabItem[] }) {
  return (
    <Tabs
      tabs={tabs}
      variant="buttons"
      linkable
      onChange={(tab) => track("client_tab_selected", { tab })}
    />
  );
}
