import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as tokenPost } from "@/app/oauth/token/route";
import { completeAuthorize, readAuthRequest, startAuthorize } from "@/lib/oauth/authorize";
import { registerClient } from "@/lib/oauth/clients";
import { exchangeToken, parseTokenBody } from "@/lib/oauth/token";
import { unseal } from "@/lib/seal";
import { useTestSecrets } from "../../helpers";

// biome-ignore lint/correctness/useHookAtTopLevel: not a React hook; registers vitest beforeEach
useTestSecrets();

afterEach(() => vi.useRealTimers());

const KEY = "eos_live_AbCdEfGhIjKlMnOpQrStUvWxYz012345";
const VERIFIER = `${"a".repeat(43)}VerifierVerifier`;
const CHALLENGE = createHash("sha256").update(VERIFIER).digest("base64url");
const REDIRECT = "https://claude.ai/api/mcp/auth_callback";

vi.mock("@/lib/edgeos/detect", () => ({
  detectAccess: vi.fn(async (key: string) =>
    key === KEY
      ? {
          ok: true,
          popup: {
            id: "ind",
            name: "Edge City India",
            slug: "edge-india-2026",
            startDate: "2026-10-11",
            endDate: "2026-11-01",
          },
          scopes: ["events:read", "rsvp:write"],
          probes: {},
        }
      : { ok: false, reason: "invalid_key" },
  ),
}));

async function dcrClient() {
  const r = await registerClient({ client_name: "claude.ai", redirect_uris: [REDIRECT] });
  return (r as unknown as { body: { client_id: string } }).body.client_id;
}

async function authorizeParams(clientId: string, extra: Record<string, string> = {}) {
  return new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: REDIRECT,
    code_challenge: CHALLENGE,
    code_challenge_method: "S256",
    state: "xyz",
    resource: "https://mcp.test/api/mcp",
    ...extra,
  });
}

async function codeFor(clientId: string, key = KEY) {
  const start = await startAuthorize(await authorizeParams(clientId));
  if (start.kind !== "redirect") throw new Error(start.message);
  const req = new URL(start.location, "https://mcp.test").searchParams.get("req") ?? "";
  const done = await completeAuthorize(req, key);
  if (done.status !== "ok") throw new Error(JSON.stringify(done));
  return new URL(done.redirectTo);
}

describe("authorization code flow", () => {
  it("sends the browser to /connect with a sealed request", async () => {
    const id = await dcrClient();
    const r = await startAuthorize(await authorizeParams(id));
    expect(r.kind).toBe("redirect");
    const loc = new URL((r as { location: string }).location, "https://mcp.test");
    expect(loc.pathname).toBe("/connect");
    const req = await readAuthRequest(loc.searchParams.get("req") ?? "");
    expect(req).toMatchObject({ clientName: "claude.ai", redirectUri: REDIRECT, state: "xyz" });
  });

  it("refuses an unregistered redirect without redirecting", async () => {
    const id = await dcrClient();
    const r = await startAuthorize(
      await authorizeParams(id, { redirect_uri: "https://evil.example/cb" }),
    );
    expect(r).toMatchObject({ kind: "error", status: 400 });
  });

  it("redirects errors back to a valid redirect_uri", async () => {
    const id = await dcrClient();
    const r = await startAuthorize(await authorizeParams(id, { code_challenge_method: "plain" }));
    const loc = new URL((r as { location: string }).location);
    expect(loc.origin + loc.pathname).toBe(REDIRECT);
    expect(loc.searchParams.get("error")).toBe("invalid_request");
    expect(loc.searchParams.get("iss")).toBe("https://mcp.test");
  });

  it("rejects a resource that is not this server", async () => {
    const id = await dcrClient();
    const r = await startAuthorize(
      await authorizeParams(id, { resource: "https://other/api/mcp" }),
    );
    expect(new URL((r as { location: string }).location).searchParams.get("error")).toBe(
      "invalid_target",
    );
  });

  it("returns code, state and iss to the client", async () => {
    const back = await codeFor(await dcrClient());
    expect(back.searchParams.get("state")).toBe("xyz");
    expect(back.searchParams.get("iss")).toBe("https://mcp.test");
    expect(back.searchParams.get("code")).toBeTruthy();
    expect(back.toString()).not.toContain("eos_live_");
  });

  it("accepts a key pasted with Bearer prefix and whitespace", async () => {
    const back = await codeFor(await dcrClient(), `  Bearer ${KEY}\n`);
    expect(back.searchParams.get("code")).toBeTruthy();
  });

  it("explains a rejected key", async () => {
    const id = await dcrClient();
    const start = await startAuthorize(await authorizeParams(id));
    const req =
      new URL((start as { location: string }).location, "https://mcp.test").searchParams.get(
        "req",
      ) ?? "";
    const r = await completeAuthorize(req, "eos_live_NotARealKeyNotARealKey00");
    expect(r).toMatchObject({ status: "error", code: "invalid_key" });
    expect((r as { message: string }).message).toContain("didn't accept");
    expect(await completeAuthorize(req, "hello")).toMatchObject({
      status: "error",
      code: "not_a_key",
    });
    expect(await completeAuthorize("expired", "hello")).toMatchObject({
      status: "error",
      code: "expired_link",
    });
  });

  it("exchanges the code once PKCE checks out, and refreshes", async () => {
    const id = await dcrClient();
    const code = (await codeFor(id)).searchParams.get("code") ?? "";
    const bad = await exchangeToken(
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        code_verifier: "b".repeat(43),
        redirect_uri: REDIRECT,
        client_id: id,
      }),
    );
    expect(bad).toMatchObject({ status: 400, body: { error: "invalid_grant" } });

    const ok = await exchangeToken(
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        code_verifier: VERIFIER,
        redirect_uri: REDIRECT,
        client_id: id,
      }),
    );
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({
      token_type: "Bearer",
      expires_in: 3600,
      scope: "events:read rsvp:write",
    });
    const access = await unseal<{ key: string }>("access", ok.body.access_token as string, {
      audience: "https://mcp.test/api/mcp",
    });
    expect(access?.key).toBe(KEY);

    const refreshed = await exchangeToken(
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: ok.body.refresh_token as string,
        client_id: id,
      }),
    );
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.access_token).toBeTruthy();
  });

  it("refuses a code issued to another client", async () => {
    const id = await dcrClient();
    const other = await dcrClient();
    const code = (await codeFor(id)).searchParams.get("code") ?? "";
    const r = await exchangeToken(
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        code_verifier: VERIFIER,
        redirect_uri: REDIRECT,
        client_id: other,
      }),
    );
    expect(r.body.error).toBe("invalid_grant");
  });

  it("token endpoint accepts a JSON body", async () => {
    const req = new Request("https://mcp.test/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ grant_type: "refresh_token", refresh_token: "x" }),
    });
    const params = await parseTokenBody(req);
    expect(params.get("grant_type")).toBe("refresh_token");
  });

  it("rejects unsupported grant types", async () => {
    const r = await exchangeToken(new URLSearchParams({ grant_type: "client_credentials" }));
    expect(r.body.error).toBe("unsupported_grant_type");
  });

  const tokenParams = (o: Record<string, string>) => new URLSearchParams(o);
  const exchange = async (id: string, over: Record<string, string> = {}) => {
    const code = (await codeFor(id)).searchParams.get("code") ?? "";
    return exchangeToken(
      tokenParams({
        grant_type: "authorization_code",
        code,
        code_verifier: VERIFIER,
        redirect_uri: REDIRECT,
        client_id: id,
        ...over,
      }),
    );
  };

  it("requires client_id on the code grant", async () => {
    const id = await dcrClient();
    const code = (await codeFor(id)).searchParams.get("code") ?? "";
    const r = await exchangeToken(
      tokenParams({
        grant_type: "authorization_code",
        code,
        code_verifier: VERIFIER,
        redirect_uri: REDIRECT,
      }),
    );
    expect(r).toMatchObject({ status: 400, body: { error: "invalid_request" } });
  });

  it("requires client_id on the refresh grant and binds it", async () => {
    const id = await dcrClient();
    const other = await dcrClient();
    const ok = await exchange(id);
    const refresh_token = ok.body.refresh_token as string;
    const none = await exchangeToken(tokenParams({ grant_type: "refresh_token", refresh_token }));
    expect(none.body.error).toBe("invalid_request");
    const wrong = await exchangeToken(
      tokenParams({ grant_type: "refresh_token", refresh_token, client_id: other }),
    );
    expect(wrong.body.error).toBe("invalid_grant");
  });

  it("requires grant_type", async () => {
    expect((await exchangeToken(new URLSearchParams())).body.error).toBe("invalid_request");
  });

  it("treats a null, array or scalar JSON body as empty", async () => {
    for (const body of ["null", "[1]", "5"]) {
      const req = new Request("https://mcp.test/oauth/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      const params = await parseTokenBody(req);
      expect([...params.keys()]).toEqual([]);
      expect((await exchangeToken(params)).body.error).toBe("invalid_request");
    }
  });

  it("rejects a redirect_uri mismatch and a resource mismatch at the token endpoint", async () => {
    const id = await dcrClient();
    const a = await exchange(id, { redirect_uri: "https://claude.ai/other" });
    expect(a.body.error).toBe("invalid_grant");
    const b = await exchange(id, { resource: "https://other/api/mcp" });
    expect(b.body.error).toBe("invalid_target");
  });

  it("rejects unsupported_response_type", async () => {
    const id = await dcrClient();
    const r = await startAuthorize(await authorizeParams(id, { response_type: "token" }));
    const loc = new URL((r as { location: string }).location);
    expect(loc.searchParams.get("error")).toBe("unsupported_response_type");
  });

  it("rejects a garbage code and an expired code", async () => {
    const id = await dcrClient();
    const garbage = await exchange(id, { code: "garbage" });
    expect(garbage.body.error).toBe("invalid_grant");
    vi.useFakeTimers();
    try {
      const code = (await codeFor(id)).searchParams.get("code") ?? "";
      vi.setSystemTime(Date.now() + 120_000);
      const r = await exchangeToken(
        tokenParams({
          grant_type: "authorization_code",
          code,
          code_verifier: VERIFIER,
          redirect_uri: REDIRECT,
          client_id: id,
        }),
      );
      expect(r.body.error).toBe("invalid_grant");
    } finally {
      vi.useRealTimers();
    }
  });

  it("caps key length, challenge shape and state length", async () => {
    const id = await dcrClient();
    const start = await startAuthorize(await authorizeParams(id));
    const req =
      new URL((start as { location: string }).location, "https://mcp.test").searchParams.get(
        "req",
      ) ?? "";
    const long = await completeAuthorize(req, `eos_live_${"a".repeat(300)}`);
    expect((long as { message: string }).message).toContain("doesn't look like an EdgeOS key");
    const badChallenge = await startAuthorize(
      await authorizeParams(id, { code_challenge: "short" }),
    );
    expect(new URL((badChallenge as { location: string }).location).searchParams.get("error")).toBe(
      "invalid_request",
    );
    const badState = await startAuthorize(await authorizeParams(id, { state: "s".repeat(501) }));
    expect(new URL((badState as { location: string }).location).searchParams.get("error")).toBe(
      "invalid_request",
    );
  });

  it("token route sets no-store and CORS headers", async () => {
    const res = await tokenPost(
      new Request("https://mcp.test/oauth/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "grant_type=client_credentials",
      }),
    );
    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});
