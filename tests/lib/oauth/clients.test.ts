import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  _clearCimdCache,
  type OAuthClient,
  redirectAllowed,
  registerClient,
  resolveClient,
} from "@/lib/oauth/clients";
import { useTestSecrets } from "../../helpers";

// biome-ignore lint/correctness/useHookAtTopLevel: not a React hook; registers vitest beforeEach
useTestSecrets();
beforeEach(() => {
  _clearCimdCache();
  vi.unstubAllGlobals();
});

describe("DCR", () => {
  it("registers a web client and resolves it back without storage", async () => {
    const r = await registerClient({
      client_name: "claude.ai",
      redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
    });
    expect(r.ok).toBe(true);
    const id = (r as unknown as { body: { client_id: string } }).body.client_id;
    const c = await resolveClient(id);
    expect(c).toMatchObject({
      kind: "dcr",
      name: "claude.ai",
      redirectUris: ["https://claude.ai/api/mcp/auth_callback"],
    });
  });

  it("accepts loopback redirects when application_type is omitted (2025 clients)", async () => {
    const r = await registerClient({
      client_name: "Claude Code",
      redirect_uris: ["http://localhost:33418/callback"],
    });
    expect(r.ok).toBe(true);
  });

  it("rejects loopback redirects for an explicit web client", async () => {
    const r = await registerClient({
      application_type: "web",
      redirect_uris: ["http://127.0.0.1:5000/cb"],
    });
    expect(r).toMatchObject({ ok: false, body: { error: "invalid_redirect_uri" } });
  });

  it("rejects plain http on non-loopback hosts and javascript: schemes", async () => {
    expect((await registerClient({ redirect_uris: ["http://evil.example/cb"] })).ok).toBe(false);
    expect((await registerClient({ redirect_uris: ["javascript:alert(1)"] })).ok).toBe(false);
  });

  it("requires redirect_uris", async () => {
    expect((await registerClient({ client_name: "x" })).ok).toBe(false);
  });

  it("loopback redirects match on any port", async () => {
    const r = await registerClient({ redirect_uris: ["http://127.0.0.1:33418/callback"] });
    const c = await resolveClient((r as unknown as { body: { client_id: string } }).body.client_id);
    expect(redirectAllowed(c as OAuthClient, "http://127.0.0.1:51000/callback")).toBe(true);
    expect(redirectAllowed(c as OAuthClient, "http://127.0.0.1:51000/other")).toBe(false);
  });

  it("returns null for a forged client id", async () => {
    expect(await resolveClient("not-sealed")).toBeNull();
  });
});

describe("CIMD", () => {
  const URL_ID = "https://client.example/oauth/metadata.json";

  function serve(doc: unknown, init: ResponseInit = {}) {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify(doc), {
            status: 200,
            headers: { "content-type": "application/json" },
            ...init,
          }),
      ),
    );
  }

  it("fetches and validates a metadata document", async () => {
    serve({
      client_id: URL_ID,
      client_name: "Example",
      redirect_uris: ["https://client.example/cb"],
    });
    const c = await resolveClient(URL_ID);
    expect(c).toMatchObject({
      kind: "cimd",
      name: "Example",
      redirectUris: ["https://client.example/cb"],
    });
  });

  it("rejects a document whose client_id does not match its URL", async () => {
    serve({ client_id: "https://other.example/x", redirect_uris: ["https://client.example/cb"] });
    expect(await resolveClient(URL_ID)).toBeNull();
  });

  it("rejects oversized documents", async () => {
    serve({
      client_id: URL_ID,
      redirect_uris: ["https://client.example/cb"],
      pad: "x".repeat(70_000),
    });
    expect(await resolveClient(URL_ID)).toBeNull();
  });

  it("refuses private hosts", async () => {
    expect(await resolveClient("https://localhost/meta.json")).toBeNull();
    expect(await resolveClient("https://10.0.0.5/meta.json")).toBeNull();
  });
});
