import { edgeosBase } from "@/lib/env";
import { scrubKeys } from "@/lib/scrub";

export type Method = "GET" | "POST" | "PATCH" | "DELETE";
export type Query = Record<string, string | number | boolean | string[] | undefined | null>;

export class EdgeosError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
    readonly retryAfter: number | null,
  ) {
    super(`EdgeOS ${status}: ${detail}`);
    this.name = "EdgeosError";
  }
}

function detailFrom(status: number, contentType: string | null, text: string): string {
  if (!contentType?.includes("json")) return `EdgeOS returned ${status}`;
  try {
    const j = JSON.parse(text) as { detail?: unknown };
    const d = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail ?? j);
    return scrubKeys(d).slice(0, 500);
  } catch {
    return `EdgeOS returned ${status}`;
  }
}

export async function edgeos<T>(
  key: string,
  method: Method,
  path: string,
  opts: { query?: Query; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  if (!path.startsWith("/") || path.includes("..") || path.includes("?") || path.includes("#")) {
    throw new Error("bad EdgeOS path");
  }
  const url = new URL(edgeosBase() + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) for (const item of v) url.searchParams.append(k, item);
    else url.searchParams.set(k, String(v));
  }
  const hasBody = opts.body !== undefined;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
      body: hasBody ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
      cache: "no-store",
      redirect: "error",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new EdgeosError(0, scrubKeys(`EdgeOS did not respond: ${msg}`), null);
  }
  const text = await res.text();
  if (!res.ok) {
    const ra = Number(res.headers.get("retry-after"));
    throw new EdgeosError(
      res.status,
      detailFrom(res.status, res.headers.get("content-type"), text),
      Number.isFinite(ra) && ra > 0 ? Math.min(ra, 300) : null,
    );
  }
  try {
    return (text ? JSON.parse(text) : null) as T;
  } catch {
    throw new EdgeosError(res.status, "EdgeOS returned an unreadable response", null);
  }
}
