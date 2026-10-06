"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

let started = false;

export function track(event: string, props: Record<string, unknown> = {}) {
  if (started) posthog.capture(event, props);
}

export function Analytics({ page }: { page: string }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    if (!started) {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
        persistence: "memory",
        autocapture: false,
        capture_pageview: false,
        disable_session_recording: true,
        person_profiles: "never",
      });
      started = true;
    }
    track(`${page}_viewed`);
  }, [page]);
  return null;
}
