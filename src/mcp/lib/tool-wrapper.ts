// Every tool handler runs through withToolHandler (kx-tools pattern):
// EdgeOS errors become messages a model can act on, unknown errors become a
// stable INTERNAL_ERROR, and each call emits one JSON log line with no
// arguments, no bodies and no key (only a salted pseudonym when configured).

import { EdgeosError } from "@/lib/edgeos/client";
import { agenticAccessUrl, origin } from "@/lib/env";
import { pseudonymId, scrubKeys } from "@/lib/scrub";
import type { Access } from "@/lib/types";
import { fail, type ToolResult } from "./result";

export class ToolError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ToolError";
  }
}

export function edgeosMessage(err: EdgeosError): string {
  switch (err.status) {
    case 0:
      return "EDGEOS_UNREACHABLE: EdgeOS didn't respond. Try again shortly.";
    case 401:
      return `AUTH_EXPIRED: The attendee's EdgeOS key was revoked or has expired. Ask them to reconnect at ${origin()} with a new key.`;
    case 403:
      return `FORBIDDEN: EdgeOS refused this (${scrubKeys(err.detail)}). If a scope is missing, the attendee can make a new key at ${agenticAccessUrl()} with that box ticked and reconnect.`;
    case 404:
      return "NOT_FOUND: Not found, or hidden from this attendee.";
    case 400:
    case 409:
    case 422:
      return `REJECTED: EdgeOS rejected the request: ${scrubKeys(err.detail)}`;
    case 429:
      return `RATE_LIMITED: EdgeOS is rate-limiting. Wait ${err.retryAfter ?? 30} seconds before retrying.`;
    default:
      return `EDGEOS_ERROR: EdgeOS returned ${err.status}. Try again shortly.`;
  }
}

function logCall(entry: Record<string, unknown>): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), scope: "mcp", ...entry }));
}

export function withToolHandler<P>(
  name: string,
  access: Access,
  fn: (p: P) => Promise<ToolResult>,
): (p: P) => Promise<ToolResult> {
  const salt = process.env.POSTHOG_ID_SALT;
  const who = salt ? pseudonymId(access.key, salt) : undefined;
  return async (p: P) => {
    const start = Date.now();
    try {
      const r = await fn(p);
      logCall({ tool: name, who, ms: Date.now() - start, status: "ok" });
      return r;
    } catch (err) {
      const ms = Date.now() - start;
      if (err instanceof EdgeosError) {
        logCall({ tool: name, who, ms, status: "edgeos_error", http: err.status });
        return fail(edgeosMessage(err));
      }
      if (err instanceof ToolError) {
        logCall({ tool: name, who, ms, status: "tool_error", code: err.code });
        return fail(`${err.code}: ${scrubKeys(err.message)}`);
      }
      const message = scrubKeys(
        err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err),
      );
      logCall({ tool: name, who, ms, status: "internal_error", message });
      return fail(
        "INTERNAL_ERROR: Something went wrong on our side. It has been logged; please try again.",
      );
    }
  };
}
