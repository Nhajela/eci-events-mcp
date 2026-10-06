// Works out which popup a key is bound to and which write scopes it carries.
// EdgeOS has no introspection route for API keys, but it enforces the scope
// policy in the auth dependency, before the route runs. So a write aimed at a
// random UUID answers 403 when the scope is missing and 404/422 when present,
// and changes nothing either way. Anything else (5xx, timeout) counts as
// present: tools then explain a 403 if it happens (spec §6 fallback).

import type { PopupRef, Scope, WriteScope } from "@/lib/types";
import { SCOPE_ORDER } from "@/lib/types";
import { EdgeosError, edgeos, type Method } from "./client";
import type { PopupPublic } from "./types";

export type DetectResult =
  | { ok: true; popup: PopupRef; scopes: Scope[]; probes: Partial<Record<WriteScope, number>> }
  | { ok: false; reason: "invalid_key" | "no_events_read" | "no_popup" | "edgeos_down" };

const PROBES: {
  scope: WriteScope;
  method: Method;
  path: (id: string) => string;
  body?: unknown;
}[] = [
  {
    scope: "rsvp:write",
    method: "POST",
    path: (id) => `/event-participants/portal/register/${id}`,
    body: {},
  },
  { scope: "events:write", method: "POST", path: (id) => `/events/portal/events/${id}/cancel` },
  {
    scope: "venues:write",
    method: "PATCH",
    path: (id) => `/event-venues/portal/venues/${id}`,
    body: {},
  },
];

async function probe(key: string, p: (typeof PROBES)[number]): Promise<number> {
  try {
    await edgeos(key, p.method, p.path(crypto.randomUUID()), { body: p.body, timeoutMs: 8000 });
    return 200;
  } catch (err) {
    return err instanceof EdgeosError ? err.status : 0;
  }
}

const toRef = (p: PopupPublic): PopupRef => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  startDate: p.start_date,
  endDate: p.end_date,
});

export async function detectAccess(key: string, now = new Date()): Promise<DetectResult> {
  let popups: PopupPublic[];
  try {
    popups = await edgeos<PopupPublic[]>(key, "GET", "/popups/portal/list");
  } catch (err) {
    if (err instanceof EdgeosError && err.status === 401)
      return { ok: false, reason: "invalid_key" };
    if (err instanceof EdgeosError && err.status === 403)
      return { ok: false, reason: "no_events_read" };
    return { ok: false, reason: "edgeos_down" };
  }

  // Current and upcoming popups first; a key is bound to exactly one.
  const today = now.toISOString().slice(0, 10);
  const ordered = [...popups].sort(
    (a, b) => Number((b.end_date ?? "") >= today) - Number((a.end_date ?? "") >= today),
  );
  const window = {
    start_after: now.toISOString(),
    start_before: new Date(now.getTime() + 3_600_000).toISOString(),
  };

  let popup: PopupPublic | undefined;
  for (const p of ordered.slice(0, 20)) {
    try {
      await edgeos(key, "GET", "/events/portal/events", {
        query: { popup_id: p.id, event_status: "published", ...window },
      });
      popup = p;
      break;
    } catch (err) {
      if (err instanceof EdgeosError && err.status === 403) continue;
      if (err instanceof EdgeosError && err.status === 401)
        return { ok: false, reason: "invalid_key" };
      return { ok: false, reason: "edgeos_down" };
    }
  }
  if (!popup) return { ok: false, reason: "no_popup" };

  const probes: Partial<Record<WriteScope, number>> = {};
  const found = new Set<Scope>(["events:read"]);
  await Promise.all(
    PROBES.map(async (p) => {
      const status = await probe(key, p);
      probes[p.scope] = status;
      if (status !== 403 && status !== 401) found.add(p.scope);
    }),
  );
  return { ok: true, popup: toRef(popup), scopes: SCOPE_ORDER.filter((s) => found.has(s)), probes };
}
