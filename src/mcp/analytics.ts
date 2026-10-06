// PostHog MCP Analytics, pseudonymous: the only identity is an HMAC of the
// key's public prefix; tool arguments and responses are dropped before send;
// no person profiles. Off unless POSTHOG_PROJECT_TOKEN is set.

import type { McpServer } from "@modelcontextprotocol/server";
import { instrument } from "@posthog/mcp";
import { PostHog } from "posthog-node";
import { pseudonymId, scrubKeys } from "@/lib/scrub";
import type { Access } from "@/lib/types";

let client: PostHog | null | undefined;

function posthog(): PostHog | null {
  if (client === undefined) {
    const token = process.env.POSTHOG_PROJECT_TOKEN;
    // Off unless both the token and the id salt are set.
    client =
      token && process.env.POSTHOG_ID_SALT
        ? new PostHog(token, {
            host: process.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
            flushAt: 1,
            flushInterval: 0,
          })
        : null;
  }
  return client;
}

function who(access: Access): string {
  return pseudonymId(access.key, process.env.POSTHOG_ID_SALT ?? "");
}

type Ev = { properties?: Record<string, unknown> } | null;

export function analyticsBeforeSend<T extends Ev>(event: T): T {
  if (!event?.properties) return event;
  // Tool error text can echo argument values, so it goes too.
  const {
    $mcp_parameters: _p,
    $mcp_response: _r,
    $mcp_error_message: _e,
    ...rest
  } = event.properties;
  const scrubbed = JSON.parse(scrubKeys(JSON.stringify(rest))) as Record<string, unknown>;
  return { ...event, properties: { ...scrubbed, $process_person_profile: false } };
}

export function instrumentServer(server: McpServer, access: Access): void {
  const ph = posthog();
  if (!ph) return;
  instrument(server, ph, {
    context: true,
    enableConversationId: true,
    reportMissing: true,
    serverBuild: (process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "unknown").slice(0, 40),
    identify: async () => ({ distinctId: who(access) }),
    eventProperties: async () => ({
      $process_person_profile: false,
      popup: access.popup.slug,
      scopes: access.scopes.join(" "),
    }),
    beforeSend: analyticsBeforeSend,
  });
}

export function captureEvent(access: Access, event: string, props: Record<string, unknown>): void {
  posthog()?.capture({
    distinctId: who(access),
    event,
    properties: { ...props, $process_person_profile: false },
  });
}

export async function flushAnalytics(): Promise<void> {
  await posthog()?.flush();
}
