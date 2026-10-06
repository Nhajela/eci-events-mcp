import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { POSTHOG_OPTIONS, stripUrls } from "@/components/analytics";

describe("web analytics privacy", () => {
  it("strips query strings and fragments from URL properties", () => {
    const out = stripUrls({
      event: "connect_viewed",
      properties: {
        $current_url: "https://mcp.test/connect?req=sealed-token#x",
        $referrer: "https://claude.ai/settings?code=abc",
        $initial_current_url: "https://mcp.test/connect?req=t",
        $pathname: "/connect",
        $referring_domain: "claude.ai",
        other: "keep?me",
      },
      $set_once: { $initial_referrer: "https://claude.ai/x?y=1" },
    } as never);
    expect(out?.properties).toEqual({
      $current_url: "https://mcp.test/connect",
      $referrer: "https://claude.ai/settings",
      $initial_current_url: "https://mcp.test/connect",
      $pathname: "/connect",
      $referring_domain: "claude.ai",
      other: "keep?me",
    });
    expect(JSON.stringify(out)).not.toContain("y=1");
  });

  it("passes null and non-URL values through", () => {
    expect(stripUrls(null)).toBeNull();
    const out = stripUrls({ event: "e", properties: { $referrer: "$direct" } } as never);
    expect(out?.properties.$referrer).toBe("$direct");
  });

  it("turns off heatmaps, exceptions, performance and dead clicks and uses memory persistence", () => {
    expect(POSTHOG_OPTIONS).toMatchObject({
      persistence: "memory",
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      capture_heatmaps: false,
      capture_exceptions: false,
      capture_performance: false,
      capture_dead_clicks: false,
      person_profiles: "never",
    });
    expect(POSTHOG_OPTIONS.before_send).toBe(stripUrls);
  });
});

describe("landing tabs", () => {
  it("sends client_tab_selected with the tab id", async () => {
    vi.resetModules();
    const track = vi.fn();
    let onChange: ((id: string) => void) | undefined;
    vi.doMock("@/components/analytics", () => ({ track }));
    vi.doMock("@/components/tabs", () => ({
      Tabs: (p: { onChange?: (id: string) => void }) => {
        onChange = p.onChange;
        return null;
      },
    }));
    const { LandingTabs } = await import("@/app/landing-tabs");
    renderToStaticMarkup(
      <LandingTabs tabs={[{ id: "chatgpt", label: "ChatGPT", content: null }]} />,
    );
    onChange?.("chatgpt");
    expect(track).toHaveBeenCalledWith("client_tab_selected", { tab: "chatgpt" });
    vi.doUnmock("@/components/analytics");
    vi.doUnmock("@/components/tabs");
  });
});
