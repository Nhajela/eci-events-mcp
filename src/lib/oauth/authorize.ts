import { type DetectResult, detectAccess } from "@/lib/edgeos/detect";
import { agenticAccessUrl, mcpUrl, origin } from "@/lib/env";
import { looksLikeKey, normalizeKey } from "@/lib/scrub";
import { seal, unseal } from "@/lib/seal";
import type { Scope } from "@/lib/types";
import { redirectAllowed, resolveClient } from "./clients";

export const REFRESH_UNTIL = new Date("2026-11-15T00:00:00+05:30");

export type AuthRequest = {
  clientId: string;
  clientName: string;
  redirectUri: string;
  codeChallenge: string;
  state: string | null;
  resource: string | null;
};

export type ConnectState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ok"; redirectTo: string; scopes: Scope[]; popupName: string };

type StartResult =
  | { kind: "redirect"; location: string }
  | { kind: "error"; status: number; message: string };

function backToClient(redirectUri: string, params: Record<string, string | null>): string {
  const u = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) if (v !== null) u.searchParams.set(k, v);
  u.searchParams.set("iss", origin());
  return u.toString();
}

const sameResource = (r: string) => r.replace(/\/+$/, "") === mcpUrl();

export async function startAuthorize(p: URLSearchParams): Promise<StartResult> {
  const clientId = p.get("client_id");
  const redirectUri = p.get("redirect_uri");
  if (!clientId || !redirectUri)
    return { kind: "error", status: 400, message: "Missing client_id or redirect_uri." };
  const client = await resolveClient(clientId);
  if (!client)
    return {
      kind: "error",
      status: 400,
      message: "Unknown client. Remove the connector and add it again.",
    };
  if (!redirectAllowed(client, redirectUri))
    return {
      kind: "error",
      status: 400,
      message: "This redirect address isn't registered for the client.",
    };

  const state = p.get("state");
  const fail = (error: string, description: string): StartResult => ({
    kind: "redirect",
    location: backToClient(redirectUri, { error, error_description: description, state }),
  });
  if (p.get("response_type") !== "code")
    return fail("unsupported_response_type", "Only response_type=code is supported.");
  if (state !== null && state.length > 500)
    return {
      kind: "redirect",
      location: backToClient(redirectUri, {
        error: "invalid_request",
        error_description: "state is too long.",
      }),
    };
  const challenge = p.get("code_challenge");
  if (!challenge || p.get("code_challenge_method") !== "S256")
    return fail("invalid_request", "PKCE with S256 is required.");
  if (!/^[A-Za-z0-9_-]{43}$/.test(challenge))
    return fail("invalid_request", "code_challenge must be a 43 character S256 value.");
  const resource = p.get("resource");
  if (resource && !sameResource(resource)) return fail("invalid_target", "Unknown resource.");

  const req = await seal(
    "authreq",
    {
      clientId,
      clientName: client.name,
      redirectUri,
      codeChallenge: challenge,
      state,
      resource,
    } satisfies AuthRequest,
    { ttlSeconds: 600 },
  );
  return { kind: "redirect", location: `/connect?req=${encodeURIComponent(req)}` };
}

export async function readAuthRequest(req: string): Promise<AuthRequest | null> {
  return unseal<AuthRequest>("authreq", req);
}

const REASONS: Record<Extract<DetectResult, { ok: false }>["reason"], string> = {
  invalid_key:
    "EdgeOS didn't accept this key. It may be revoked or expired. Make a new one and paste it here.",
  no_events_read: "This key can't read events. Make a new key with “Read events” ticked.",
  no_popup:
    "This key isn't linked to a popup we can see. Make the key from the Edge City India portal.",
  edgeos_down: "EdgeOS isn't responding right now. Try again in a minute.",
};

export async function completeAuthorize(reqToken: string, rawKey: string): Promise<ConnectState> {
  const req = await readAuthRequest(reqToken);
  if (!req)
    return {
      status: "error",
      message: "This sign-in link expired. Go back to your app and connect again.",
    };
  const key = rawKey.length > 200 ? "" : normalizeKey(rawKey);
  if (!looksLikeKey(key)) {
    return {
      status: "error",
      message:
        "That doesn't look like an EdgeOS key. Keys start with eos_live_. Copy the whole key from the portal.",
    };
  }
  const access = await detectAccess(key);
  if (!access.ok)
    return { status: "error", message: `${REASONS[access.reason]} (${agenticAccessUrl()})` };

  const code = await seal(
    "code",
    {
      key,
      scopes: access.scopes,
      popup: access.popup,
      clientId: req.clientId,
      redirectUri: req.redirectUri,
      codeChallenge: req.codeChallenge,
      resource: req.resource,
    },
    { ttlSeconds: 60 },
  );
  return {
    status: "ok",
    redirectTo: backToClient(req.redirectUri, { code, state: req.state }),
    scopes: access.scopes,
    popupName: access.popup.name,
  };
}
