"use client";

import posthog, { type CaptureResult, type PostHogConfig } from "posthog-js";
import { useEffect } from "react";

let started = false;

function stripUrl(v: unknown): unknown {
  if (typeof v !== "string" || !/^https?:\/\//i.test(v)) return v;
  try {
    const u = new URL(v);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return v;
  }
}

function stripAll(props: Record<string, unknown> | undefined) {
  if (!props) return props;
  return Object.fromEntries(Object.entries(props).map(([k, v]) => [k, stripUrl(v)]));
}

/** Drops query strings and fragments from every URL value (e.g. the sealed `req` on /connect). */
export function stripUrls(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  return {
    ...event,
    properties: stripAll(event.properties) ?? {},
    ...(event.$set ? { $set: stripAll(event.$set) } : {}),
    ...(event.$set_once ? { $set_once: stripAll(event.$set_once) } : {}),
  };
}

export const POSTHOG_OPTIONS = {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
  persistence: "memory",
  autocapture: false,
  capture_pageview: false,
  disable_session_recording: true,
  capture_heatmaps: false,
  capture_exceptions: false,
  capture_performance: false,
  capture_dead_clicks: false,
  person_profiles: "never",
  before_send: stripUrls,
} satisfies Partial<PostHogConfig>;

export function track(event: string, props: Record<string, unknown> = {}) {
  if (started) posthog.capture(event, props);
}

export function Analytics({ page }: { page: string }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    if (!started) {
      posthog.init(key, POSTHOG_OPTIONS);
      started = true;
    }
    track(`${page}_viewed`);
  }, [page]);
  return null;
}
