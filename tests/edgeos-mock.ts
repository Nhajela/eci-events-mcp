import { afterEach, vi } from "vitest";

export type MockRoute = {
  method: string;
  path: string | RegExp;
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
};

export function mockEdgeos(routes: MockRoute[]) {
  const calls: { method: string; url: URL; body: unknown; auth: string | null }[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = (init?.method ?? "GET").toUpperCase();
    const headers = new Headers(init?.headers);
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({ method, url, body, auth: headers.get("authorization") });
    const path = url.pathname.replace(/^\/api\/v1/, "");
    const route = routes.find(
      (r) =>
        r.method === method && (typeof r.path === "string" ? r.path === path : r.path.test(path)),
    );
    if (!route) return new Response(JSON.stringify({ detail: "Not Found" }), { status: 404 });
    const text = typeof route.body === "string" ? route.body : JSON.stringify(route.body ?? {});
    return new Response(text, {
      status: route.status ?? 200,
      headers: {
        "content-type": typeof route.body === "string" ? "text/html" : "application/json",
        ...route.headers,
      },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  afterEach(() => vi.unstubAllGlobals());
  return { calls, fetchMock };
}
