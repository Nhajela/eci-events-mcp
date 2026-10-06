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

  it("rejects more than 10 redirect URIs and trims echoed bad URIs", async () => {
    const many = Array.from({ length: 11 }, (_, i) => `https://claude.ai/cb${i}`);
    expect((await registerClient({ redirect_uris: many })).ok).toBe(false);
    expect((await registerClient({ redirect_uris: many.slice(0, 10) })).ok).toBe(true);
    const r = await registerClient({ redirect_uris: [`http://evil.example/${"a".repeat(1500)}`] });
    const desc = (r as { body: { error_description: string } }).body.error_description;
    expect(desc.length).toBeLessThan(260);
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

  it("refuses private hosts without fetching", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await resolveClient("https://localhost/meta.json")).toBeNull();
    expect(await resolveClient("https://10.0.0.5/meta.json")).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("refuses trailing-dot, .localhost, CGNAT, benchmark, multicast and credentialed URLs without fetching", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    for (const u of [
      "https://localhost./m.json",
      "https://app.localhost/m.json",
      "https://100.64.0.1/m.json",
      "https://100.127.255.254/m.json",
      "https://198.18.0.1/m.json",
      "https://198.19.255.1/m.json",
      "https://224.0.0.1/m.json",
      "https://255.255.255.255/m.json",
      "https://user:pw@client.example/m.json",
      "https://user@client.example/m.json",
    ]) {
      expect(await resolveClient(u), u).toBeNull();
    }
    expect(f).not.toHaveBeenCalled();
  });

  it("refuses an http:// client_id without fetching", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await resolveClient("http://client.example/m.json")).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("refuses a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 404 })),
    );
    expect(await resolveClient(URL_ID)).toBeNull();
  });

  it("fetches with redirect error and a timeout signal", async () => {
    serve({ client_id: URL_ID, redirect_uris: ["https://client.example/cb"] });
    await resolveClient(URL_ID);
    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(init.redirect).toBe("error");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("stops reading and cancels a streamed body over the cap", async () => {
    let cancelled = false;
    const chunk = new Uint8Array(20_000).fill(120);
    const body = new ReadableStream<Uint8Array>({
      pull(c) {
        c.enqueue(chunk);
      },
      cancel() {
        cancelled = true;
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(body, { status: 200 })),
    );
    expect(await resolveClient(URL_ID)).toBeNull();
    expect(cancelled).toBe(true);
  });

  it("refuses a content-length over the cap", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ client_id: URL_ID, redirect_uris: ["https://client.example/cb"] }),
            { status: 200, headers: { "content-length": "70000" } },
          ),
      ),
    );
    expect(await resolveClient(URL_ID)).toBeNull();
  });

  it("refuses more than 10 redirect URIs or an over-long URI", async () => {
    const many = Array.from({ length: 11 }, (_, i) => `https://client.example/cb${i}`);
    serve({ client_id: URL_ID, redirect_uris: many });
    expect(await resolveClient(URL_ID)).toBeNull();
    _clearCimdCache();
    serve({ client_id: URL_ID, redirect_uris: [`https://client.example/${"a".repeat(2100)}`] });
    expect(await resolveClient(URL_ID)).toBeNull();
  });

  it("evicts the oldest cache entry past 500", async () => {
    const f = vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify({ client_id: url, redirect_uris: ["https://client.example/cb"] }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", f);
    for (let i = 0; i < 501; i++) await resolveClient(`https://c${i}.example/m.json`);
    expect(f).toHaveBeenCalledTimes(501);
    await resolveClient("https://c500.example/m.json");
    expect(f).toHaveBeenCalledTimes(501);
    await resolveClient("https://c0.example/m.json");
    expect(f).toHaveBeenCalledTimes(502);
  });
});
