# ECI Events MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A stateless Next.js MCP server that lets Edge City India attendees use EdgeOS events, RSVPs, hosting and venues from claude.ai, ChatGPT and Claude Code with their own `eos_live_` key, without that key ever being stored or seen by an AI or the operator.

**Architecture:** One Next.js 16 app, no database. A self-hosted OAuth 2.1 authorization server issues JWE "sealed" artifacts (client ids, codes, tokens, proposal codes) that carry the attendee's key encrypted under `TOKEN_SECRETS`. `/api/mcp` uses MCP TS SDK v2 `createMcpHandler` with a per-request `McpServer` whose tools depend on the scopes detected for that key. Writes go through `edgeos_propose` → `edgeos_confirm`. Instructions are generated from a committed, filtered EdgeOS OpenAPI snapshot plus handwritten guides.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, pnpm, Biome, Vitest, Tailwind v4, `@modelcontextprotocol/server` v2, `jose`, `zod` ≥4.2, `@posthog/mcp` + `posthog-node`, `posthog-js`, `mermaid`, `tsx`.

**Spec:** `docs/superpowers/specs/2026-10-06-eci-events-mcp-design.md`

## Global Constraints

- Package manager: pnpm. Never npm/yarn. Never read `.env*` files with tools; scripts may load them at runtime.
- `zod` must be `^4.2.0` (SDK v2 requirement). MCP SDK: `@modelcontextprotocol/server@^2.3.1`; tool `inputSchema` is a `z.object(...)`, not a raw shape.
- The raw `eos_live_` key must never be logged, returned in tool output, or written anywhere. Every EdgeOS error string passes through `scrubKeys`.
- Never log `Authorization` headers or request bodies.
- Origin comes only from `PUBLIC_ORIGIN` (no trailing slash). MCP URL is `${PUBLIC_ORIGIN}/api/mcp`.
- EdgeOS base: `${EDGEOS_API_BASE ?? "https://api.edgeos.world"}/api/v1`. Portal: `${EDGEOS_PORTAL_URL ?? "https://portal.edgecity.live"}`; key page `/portal/agentic-access`.
- Village timezone `Asia/Kolkata`. Every time shown to a model is IST, e.g. `Wed 14 Oct, 8:30 PM IST`, with the UTC ISO alongside in structured output.
- Lifetimes: auth code 60 s; authorize request 10 min; access 1 h; refresh until `2026-11-15T00:00:00+05:30`; proposal 10 min.
- Tool names are prefixed `edgeos_`. Copy is plain and direct: no em-dash asides, errors say what to do next.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Atomic commits: one logical change per commit (Conventional Commits prefixes `feat`, `fix`, `docs`, `chore`, `test`, `refactor`). If a task's commit step would bundle unrelated changes, split it.
- `CHANGELOG.md` follows Keep a Changelog with Semantic Versioning, starting at `0.1.0`. Every `feat`/`fix` commit adds a line under `## [Unreleased]` in the same commit. The first public deploy is released as `1.0.0` (move Unreleased under `## [1.0.0] - <date>`, bump `package.json` `version`, tag `v1.0.0`). After that: patch for fixes, minor for new tools or pages, major for anything that forces attendees to reconnect (e.g. secret rotation, token format change).
- Every piece of text injected into a model (server instructions, gateway text, guides, tool descriptions and schemas, proposal steering, reviewer rubric, prompts) must be an exported constant or generated value so `/how-it-works` can display it verbatim. No hidden prompt text.
- Repo is public: no secrets in code, fixtures, or screenshots.

## Review Focus

1. Attendee pastes the key with surrounding whitespace, a trailing newline, or a `Bearer ` prefix → accepted after trimming (Task 7 test `accepts a key pasted with Bearer prefix and whitespace`).
2. Agent proposes an event time without a UTC offset (`2026-10-14T18:00:00`) → rejected with "include +05:30" instead of being read as UTC (Task 11 test `rejects times without an offset`).
3. A client posts JSON to the token endpoint instead of form encoding → still works (Task 7 test `token endpoint accepts a JSON body`).
4. Claude Code registers `http://127.0.0.1:33418/callback` then authorizes with a different port → allowed (Task 6 test `loopback redirects match on any port`).
5. `TOKEN_SECRETS` rotated so old tokens no longer open → `/api/mcp` answers 401 with `WWW-Authenticate` so the client re-authorizes, not 500 (Task 8 test `stale token gets 401 with resource metadata`). Also: EdgeOS returns an HTML 502 → the model sees `EdgeOS returned 502`, not HTML (Task 4 test `does not pass HTML error pages through`).

---

## File Structure

```
.gitattributes .gitignore .env.example biome.json package.json tsconfig.json
next.config.ts postcss.config.mjs vitest.config.ts CLAUDE.md README.md
.github/workflows/ci.yml  .github/workflows/spec-drift.yml
guides/schedule.md guides/recurring.md guides/rsvp.md guides/hosting.md guides/venues.md guides/limits.md
spec/route-policy.json spec/edgeos-openapi.json
scripts/lib/spec.ts            filterSpec, buildReference, parsePolicy (pure, tested)
scripts/spec-sync.ts           fetch → filter → write → generate
scripts/gen-reference.ts       spec + guides → src/generated/*.ts
scripts/policy-check.ts        compare spec/route-policy.json with upstream security.py
scripts/set-token-secret.ts    generate TOKEN_SECRETS without printing
scripts/smoke.ts               live check with a real test key
src/generated/reference.ts src/generated/guides.ts   (generated, committed)
src/lib/env.ts                 origin, URLs, EdgeOS base, portal
src/lib/types.ts               Scope, PopupRef, Access
src/lib/seal.ts                JWE seal/unseal (only crypto module)
src/lib/scrub.ts               scrubKeys, keyPrefix, pseudonymId, normalizeKey
src/lib/time.ts                IST formatting and windows
src/lib/build.ts               buildInfo()
src/lib/edgeos/client.ts       edgeos(), EdgeosError
src/lib/edgeos/types.ts        EdgeEvent, Venue, Track, Participant, PopupPublic
src/lib/edgeos/detect.ts       detectAccess()
src/lib/oauth/pkce.ts metadata.ts clients.ts authorize.ts token.ts
src/app/layout.tsx globals.css page.tsx trust/page.tsx connect/page.tsx connect/actions.ts connect/connect-form.tsx
src/app/oauth/authorize/route.ts oauth/token/route.ts oauth/register/route.ts
src/app/api/oauth-metadata/route.ts api/oauth-resource-metadata/route.ts api/build-info/route.ts api/mcp/route.ts
src/components/tabs.tsx mermaid.tsx copy-button.tsx build-box.tsx analytics.tsx
src/mcp/server.ts instructions.ts initialize.ts guide.ts prompts.ts analytics.ts
src/mcp/lib/auth.ts tool-wrapper.ts result.ts context.ts
src/mcp/tools/read.ts format.ts
src/mcp/propose/actions.ts checks.ts reviewer.ts register.ts
tests/**                       mirrors src/ and scripts/
```

---

### Task 1: Scaffold the app

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `biome.json`, `vitest.config.ts`, `postcss.config.mjs`, `.gitignore`, `.env.example`, `CLAUDE.md`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/lib/env.ts`
- Test: `tests/lib/env.test.ts`

**Interfaces:**
- Produces: `origin(): string`, `mcpUrl(): string`, `MCP_PATH = "/api/mcp"`, `edgeosBase(): string`, `portalUrl(): string`, `agenticAccessUrl(): string`, `REPO_URL = "https://github.com/Nhajela/eci-events-mcp"`.

- [ ] **Step 1: Install dependencies**

```bash
cd eci-events-mcp
pnpm init
pnpm add next@^16.2 react@^19.2 react-dom@^19.2 @modelcontextprotocol/server@^2.3.1 zod@^4.2.0 jose@^6 posthog-node @posthog/mcp posthog-js mermaid
pnpm add -D typescript @types/node @types/react @types/react-dom vitest @biomejs/biome tailwindcss @tailwindcss/postcss tsx @modelcontextprotocol/client@^2.3.1
```

- [ ] **Step 2: Write config files**

`package.json` scripts (merge into the generated file; set `"private": true`, `"type": "module"`, `"packageManager"` as pnpm wrote it):

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "biome check",
    "format": "biome format --write",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "spec:sync": "tsx scripts/spec-sync.ts",
    "spec:gen": "tsx scripts/gen-reference.ts",
    "policy:check": "tsx scripts/policy-check.ts",
    "secret:new": "tsx scripts/set-token-secret.ts",
    "smoke": "tsx scripts/smoke.ts"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.ts`:

```ts
import { execSync } from "node:child_process";
import type { NextConfig } from "next";

function commit(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  if (process.env.GIT_COMMIT_SHA) return process.env.GIT_COMMIT_SHA;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_COMMIT: commit(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  async rewrites() {
    // Next.js doesn't route dot-directories; rewrite the well-known paths
    // before the filesystem check (same approach as kx-tools).
    return {
      beforeFiles: [
        { source: "/.well-known/oauth-authorization-server", destination: "/api/oauth-metadata" },
        { source: "/.well-known/oauth-authorization-server/:path*", destination: "/api/oauth-metadata" },
        { source: "/.well-known/oauth-protected-resource", destination: "/api/oauth-resource-metadata" },
        { source: "/.well-known/oauth-protected-resource/:path*", destination: "/api/oauth-resource-metadata" },
      ],
    };
  },
};

export default nextConfig;
```

`biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "files": { "includes": ["**", "!**/.next", "!**/node_modules", "!src/generated", "!spec/edgeos-openapi.json"] },
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "linter": { "enabled": true, "rules": { "recommended": true } }
}
```

If `pnpm lint` reports a schema-version mismatch, set `$schema` to the installed version shown by `pnpm biome --version`.

`vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
```

`postcss.config.mjs`:

```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

`.gitignore`:

```
node_modules
.next
.env
.env.*
!.env.example
*.tsbuildinfo
next-env.d.ts
.vercel
```

`.env.example`:

```
# Public origin of this deployment, no trailing slash
PUBLIC_ORIGIN=http://localhost:3000
# Comma-separated 32-byte base64url secrets; first seals, all open. Create with: pnpm secret:new
TOKEN_SECRETS=
# Optional overrides
EDGEOS_API_BASE=https://api.edgeos.world
EDGEOS_PORTAL_URL=https://portal.edgecity.live
# PostHog MCP Analytics (optional; off when unset)
POSTHOG_PROJECT_TOKEN=
POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_ID_SALT=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
# Proposal reviewer (optional; off when REVIEWER_MODEL unset). Vertex AI key + project.
REVIEWER_MODEL=
GOOGLE_CLOUD_PROJECT=
GEMINI_API_KEY=
# Shown on /trust "Where this runs"
HOST_NAME=
DEPLOY_METHOD=git push to main
```

`CLAUDE.md`:

```md
# ECI Events MCP

Stateless MCP server for Edge City India attendees. Spec: docs/superpowers/specs/2026-10-06-eci-events-mcp-design.md

- pnpm only. `pnpm test`, `pnpm typecheck`, `pnpm lint` must pass before commit.
- Never log, return, or store an `eos_live_` key. Route every EdgeOS error through `scrubKeys`.
- `src/lib/seal.ts` is the only module that encrypts or decrypts. Keep it small: /trust links to it.
- `src/generated/*` comes from `pnpm spec:gen`; never edit by hand.
- Times shown to models are IST via `src/lib/time.ts`.
- Atomic commits; every feat/fix adds a line to CHANGELOG.md under Unreleased.
- Any text sent to a model must be an exported constant so /how-it-works can show it.
```

`src/app/globals.css`:

```css
@import "tailwindcss";
```

`src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ECI Events MCP",
  description: "Use the Edge City India events calendar from Claude or ChatGPT.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
```

`src/app/page.tsx` (replaced in Task 14):

```tsx
export default function Home() {
  return <main className="p-8">ECI Events MCP</main>;
}
```

- [ ] **Step 3: Write the failing env test**

`tests/lib/env.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { agenticAccessUrl, edgeosBase, mcpUrl, origin } from "@/lib/env";

afterEach(() => {
  delete process.env.PUBLIC_ORIGIN;
  delete process.env.EDGEOS_API_BASE;
  delete process.env.EDGEOS_PORTAL_URL;
});

describe("env", () => {
  it("strips trailing slashes from the origin", () => {
    process.env.PUBLIC_ORIGIN = "https://events.example.com/";
    expect(origin()).toBe("https://events.example.com");
    expect(mcpUrl()).toBe("https://events.example.com/api/mcp");
  });

  it("throws a clear error when PUBLIC_ORIGIN is missing", () => {
    expect(() => origin()).toThrow("PUBLIC_ORIGIN is not set");
  });

  it("defaults EdgeOS base and portal", () => {
    expect(edgeosBase()).toBe("https://api.edgeos.world/api/v1");
    expect(agenticAccessUrl()).toBe("https://portal.edgecity.live/portal/agentic-access");
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `pnpm test tests/lib/env.test.ts`
Expected: FAIL, cannot resolve `@/lib/env`.

- [ ] **Step 5: Implement `src/lib/env.ts`**

```ts
export const MCP_PATH = "/api/mcp";
export const REPO_URL = "https://github.com/Nhajela/eci-events-mcp";

const trim = (s: string) => s.replace(/\/+$/, "");

export function origin(): string {
  const o = process.env.PUBLIC_ORIGIN;
  if (!o) throw new Error("PUBLIC_ORIGIN is not set");
  return trim(o);
}

export function mcpUrl(): string {
  return `${origin()}${MCP_PATH}`;
}

export function edgeosBase(): string {
  return `${trim(process.env.EDGEOS_API_BASE ?? "https://api.edgeos.world")}/api/v1`;
}

export function portalUrl(): string {
  return trim(process.env.EDGEOS_PORTAL_URL ?? "https://portal.edgecity.live");
}

export function agenticAccessUrl(): string {
  return `${portalUrl()}/portal/agentic-access`;
}
```

- [ ] **Step 6: Start the changelog**

`CHANGELOG.md`:

```md
# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/):
patch for fixes, minor for new tools or pages, major for changes that make attendees reconnect.

## [Unreleased]

### Added
- Next.js app scaffold, environment helpers, design spec and implementation plan.
```

Set `"version": "0.1.0"` in `package.json`.

- [ ] **Step 7: Run tests, typecheck, lint, build**

Run: `pnpm test && pnpm typecheck && pnpm lint && PUBLIC_ORIGIN=http://localhost:3000 pnpm build`
Expected: tests PASS, no type or lint errors, build succeeds.

- [ ] **Step 8: Commit (two atomic commits)**

```bash
git add CHANGELOG.md
git commit -m "docs: start changelog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git add -A
git commit -m "chore: scaffold Next.js app with env helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Sealed artifacts (`seal.ts`)

**Files:**
- Create: `src/lib/types.ts`, `src/lib/seal.ts`
- Test: `tests/lib/seal.test.ts`, `tests/helpers.ts`

**Interfaces:**
- Produces:
  - `type Scope = "events:read" | "rsvp:write" | "events:write" | "venues:write"`, `WRITE_SCOPES`, `SCOPE_ORDER: Scope[]`
  - `type PopupRef = { id: string; name: string; slug: string; startDate: string | null; endDate: string | null }`
  - `type Access = { key: string; scopes: Scope[]; popup: PopupRef }`
  - `type ArtifactType = "client" | "authreq" | "code" | "access" | "refresh" | "proposal"`
  - `seal(typ: ArtifactType, payload: Record<string, unknown>, opts: { ttlSeconds?: number; expiresAt?: Date; audience?: string }): Promise<string>`
  - `unseal<T>(typ: ArtifactType, token: string, opts?: { audience?: string }): Promise<(T & { iat: number; exp?: number }) | null>`
  - `tests/helpers.ts`: `useTestSecrets(): { secretA: string; secretB: string }`

- [ ] **Step 1: Write the failing tests**

`tests/helpers.ts`:

```ts
import { base64url } from "jose";
import { beforeEach } from "vitest";

export function newSecret(): string {
  return base64url.encode(crypto.getRandomValues(new Uint8Array(32)));
}

export function useTestSecrets() {
  const secrets = { secretA: newSecret(), secretB: newSecret() };
  beforeEach(() => {
    process.env.TOKEN_SECRETS = secrets.secretA;
    process.env.PUBLIC_ORIGIN = "https://mcp.test";
  });
  return secrets;
}
```

`tests/lib/seal.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { seal, unseal } from "@/lib/seal";
import { useTestSecrets } from "../helpers";

const secrets = useTestSecrets();

afterEach(() => vi.useRealTimers());

describe("seal/unseal", () => {
  it("round-trips a payload", async () => {
    const t = await seal("access", { key: "eos_live_abc" }, { ttlSeconds: 60 });
    const out = await unseal<{ key: string }>("access", t);
    expect(out?.key).toBe("eos_live_abc");
  });

  it("produces ciphertext that does not contain the key", async () => {
    const t = await seal("access", { key: "eos_live_SECRETSECRET" }, { ttlSeconds: 60 });
    expect(t).not.toContain("eos_live_");
    expect(Buffer.from(t.split(".")[0], "base64url").toString()).toContain('"alg":"dir"');
  });

  it("rejects a tampered token", async () => {
    const t = await seal("access", { key: "k" }, { ttlSeconds: 60 });
    const parts = t.split(".");
    const ct = parts[3];
    parts[3] = (ct[0] === "A" ? "B" : "A") + ct.slice(1);
    expect(await unseal("access", parts.join("."))).toBeNull();
  });

  it("rejects the wrong artifact type", async () => {
    const code = await seal("code", { key: "k" }, { ttlSeconds: 60 });
    expect(await unseal("access", code)).toBeNull();
  });

  it("rejects expired artifacts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T00:00:00Z"));
    const t = await seal("code", { key: "k" }, { ttlSeconds: 60 });
    vi.setSystemTime(new Date("2026-10-14T00:02:00Z"));
    expect(await unseal("code", t)).toBeNull();
  });

  it("honours an absolute expiry", async () => {
    const t = await seal("refresh", { key: "k" }, { expiresAt: new Date(Date.now() + 3600_000) });
    const out = await unseal<{ key: string }>("refresh", t);
    expect(out?.exp).toBeGreaterThan(Date.now() / 1000);
  });

  it("checks the audience when asked", async () => {
    const t = await seal("access", { key: "k" }, { ttlSeconds: 60, audience: "https://mcp.test/api/mcp" });
    expect(await unseal("access", t, { audience: "https://mcp.test/api/mcp" })).not.toBeNull();
    expect(await unseal("access", t, { audience: "https://other/api/mcp" })).toBeNull();
  });

  it("opens with an older secret after rotation and stops after removal", async () => {
    const t = await seal("access", { key: "k" }, { ttlSeconds: 60 });
    process.env.TOKEN_SECRETS = `${secrets.secretB},${secrets.secretA}`;
    expect(await unseal("access", t)).not.toBeNull();
    process.env.TOKEN_SECRETS = secrets.secretB;
    expect(await unseal("access", t)).toBeNull();
  });

  it("returns null for garbage", async () => {
    expect(await unseal("access", "not-a-token")).toBeNull();
  });

  it("refuses secrets that are not 32 bytes", async () => {
    process.env.TOKEN_SECRETS = "c2hvcnQ";
    await expect(seal("access", {}, { ttlSeconds: 1 })).rejects.toThrow("32 bytes");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/lib/seal.test.ts`
Expected: FAIL, cannot resolve `@/lib/seal`.

- [ ] **Step 3: Implement**

`src/lib/types.ts`:

```ts
export const WRITE_SCOPES = ["rsvp:write", "events:write", "venues:write"] as const;
export type WriteScope = (typeof WRITE_SCOPES)[number];
export type Scope = "events:read" | WriteScope;
export const SCOPE_ORDER: Scope[] = ["events:read", ...WRITE_SCOPES];

export type PopupRef = {
  id: string;
  name: string;
  slug: string;
  startDate: string | null;
  endDate: string | null;
};

/** Everything a request needs to act as the attendee. Lives only inside sealed tokens and memory. */
export type Access = { key: string; scopes: Scope[]; popup: PopupRef };

export function hasScope(access: Access, scope: Scope): boolean {
  return access.scopes.includes(scope);
}
```

`src/lib/seal.ts`:

```ts
// The only module that encrypts or decrypts. Every OAuth artifact this server
// issues is a JWE (alg "dir", enc "A256GCM") under TOKEN_SECRETS: the data a
// database row would hold travels inside the token instead, so nothing is
// stored. The first secret seals; every listed secret opens (rotation).

import { createHash } from "node:crypto";
import { base64url, EncryptJWT, jwtDecrypt } from "jose";

export type ArtifactType = "client" | "authreq" | "code" | "access" | "refresh" | "proposal";

type Keyed = { kid: string; key: Uint8Array };

function keys(): Keyed[] {
  const raw = process.env.TOKEN_SECRETS;
  if (!raw) throw new Error("TOKEN_SECRETS is not set");
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const key = base64url.decode(s);
      if (key.length !== 32) throw new Error("Each TOKEN_SECRETS entry must be 32 bytes, base64url");
      return { kid: createHash("sha256").update(key).digest("hex").slice(0, 8), key };
    });
}

export async function seal(
  typ: ArtifactType,
  payload: Record<string, unknown>,
  opts: { ttlSeconds?: number; expiresAt?: Date; audience?: string },
): Promise<string> {
  const [current] = keys();
  let jwt = new EncryptJWT({ ...payload, typ })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", kid: current.kid })
    .setIssuedAt();
  if (opts.expiresAt) jwt = jwt.setExpirationTime(Math.floor(opts.expiresAt.getTime() / 1000));
  else if (opts.ttlSeconds) jwt = jwt.setExpirationTime(`${opts.ttlSeconds}s`);
  if (opts.audience) jwt = jwt.setAudience(opts.audience);
  return jwt.encrypt(current.key);
}

export async function unseal<T>(
  typ: ArtifactType,
  token: string,
  opts: { audience?: string } = {},
): Promise<(T & { iat: number; exp?: number }) | null> {
  const known = keys();
  try {
    const { payload } = await jwtDecrypt(
      token,
      (header) => {
        const match = known.find((k) => k.kid === header.kid);
        if (!match) throw new Error("unknown kid");
        return match.key;
      },
      { audience: opts.audience, clockTolerance: 5 },
    );
    if (payload.typ !== typ) return null;
    return payload as T & { iat: number; exp?: number };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test tests/lib/seal.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/seal.ts tests/helpers.ts tests/lib/seal.test.ts
git commit -m "feat(seal): JWE sealed artifacts with secret rotation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Key scrubbing and IST time helpers

**Files:**
- Create: `src/lib/scrub.ts`, `src/lib/time.ts`
- Test: `tests/lib/scrub.test.ts`, `tests/lib/time.test.ts`

**Interfaces:**
- Produces:
  - `scrubKeys(s: string): string`, `keyPrefix(key: string): string` (first 17 chars), `pseudonymId(key: string, salt: string): string` (32 hex), `normalizeKey(input: string): string`, `looksLikeKey(s: string): boolean`
  - `TZ = "Asia/Kolkata"`, `formatIst(iso: string): string` → `"Wed 14 Oct, 8:30 PM IST"`, `formatIstTime(iso): string` → `"8:30 PM"`, `formatIstRange(startIso, endIso): string` → `"Wed 14 Oct, 8:30 PM – 9:30 PM IST"`, `istDate(d: Date): string` → `"2026-10-14"`, `istDayWindow(date: string, days: number): { startAfter: string; startBefore: string }`, `istHour(iso: string): number`, `istDayLabel(date: string): string` → `"Wed 14 Oct"`, `hasOffset(iso: string): boolean`

- [ ] **Step 1: Write the failing tests**

`tests/lib/scrub.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { keyPrefix, looksLikeKey, normalizeKey, pseudonymId, scrubKeys } from "@/lib/scrub";

const KEY = "eos_live_AbCdEfGhIjKlMnOpQrStUvWxYz012345";

describe("scrub", () => {
  it("redacts keys anywhere in a string", () => {
    expect(scrubKeys(`bad token ${KEY} here`)).toBe("bad token eos_live_[redacted] here");
  });
  it("keeps only the public prefix", () => {
    expect(keyPrefix(KEY)).toBe("eos_live_AbCdEfGh");
  });
  it("makes a stable pseudonym that is not the prefix", () => {
    const a = pseudonymId(KEY, "salt");
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).toBe(pseudonymId(KEY, "salt"));
    expect(a).not.toBe(pseudonymId(KEY, "other"));
  });
  it("normalizes pasted keys", () => {
    expect(normalizeKey(`  Bearer ${KEY}\n`)).toBe(KEY);
    expect(normalizeKey(`"${KEY}"`)).toBe(KEY);
  });
  it("recognizes key shape", () => {
    expect(looksLikeKey(KEY)).toBe(true);
    expect(looksLikeKey("eos_live_short")).toBe(false);
    expect(looksLikeKey("sk-123")).toBe(false);
  });
});
```

`tests/lib/time.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  formatIst, formatIstRange, hasOffset, istDate, istDayLabel, istDayWindow, istHour,
} from "@/lib/time";

describe("IST time", () => {
  it("formats UTC as IST", () => {
    expect(formatIst("2026-10-14T15:00:00Z")).toBe("Wed 14 Oct, 8:30 PM IST");
  });
  it("formats a range", () => {
    expect(formatIstRange("2026-10-14T15:00:00Z", "2026-10-14T16:00:00Z")).toBe(
      "Wed 14 Oct, 8:30 PM – 9:30 PM IST",
    );
  });
  it("gives the IST calendar date, not the UTC one", () => {
    expect(istDate(new Date("2026-10-13T20:00:00Z"))).toBe("2026-10-14");
  });
  it("converts an IST day to a UTC window", () => {
    expect(istDayWindow("2026-10-14", 1)).toEqual({
      startAfter: "2026-10-13T18:30:00.000Z",
      startBefore: "2026-10-14T18:30:00.000Z",
    });
    expect(istDayWindow("2026-10-14", 7).startBefore).toBe("2026-10-20T18:30:00.000Z");
  });
  it("reads the IST hour", () => {
    expect(istHour("2026-10-14T21:00:00Z")).toBe(2);
  });
  it("labels a day", () => {
    expect(istDayLabel("2026-10-14")).toBe("Wed 14 Oct");
  });
  it("detects offsets", () => {
    expect(hasOffset("2026-10-14T18:00:00+05:30")).toBe(true);
    expect(hasOffset("2026-10-14T12:30:00Z")).toBe(true);
    expect(hasOffset("2026-10-14T18:00:00")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/lib/scrub.test.ts tests/lib/time.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`src/lib/scrub.ts`:

```ts
import { createHmac } from "node:crypto";

const KEY_RE = /eos_live_[A-Za-z0-9_-]+/g;
const PREFIX_LEN = "eos_live_".length + 8; // what EdgeOS itself shows in its UI

export function scrubKeys(s: string): string {
  return s.replace(KEY_RE, "eos_live_[redacted]");
}

export function keyPrefix(key: string): string {
  return key.slice(0, PREFIX_LEN);
}

/** Stable, non-reversible id for analytics and logs. */
export function pseudonymId(key: string, salt: string): string {
  return createHmac("sha256", salt).update(keyPrefix(key)).digest("hex").slice(0, 32);
}

export function normalizeKey(input: string): string {
  return input
    .trim()
    .replace(/^bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

export function looksLikeKey(s: string): boolean {
  return /^eos_live_[A-Za-z0-9_-]{20,}$/.test(s);
}
```

`src/lib/time.ts`:

```ts
export const TZ = "Asia/Kolkata";
const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

// Newer ICU puts U+202F before AM/PM; models and tests expect a plain space.
const clean = (s: string) => s.replace(/ /g, " ");

export function istDayLabelFromDate(d: Date): string {
  return clean(d.toLocaleDateString("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" })).replace(",", "");
}

export function formatIstTime(iso: string): string {
  return clean(new Date(iso).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }));
}

export function formatIst(iso: string): string {
  return `${istDayLabelFromDate(new Date(iso))}, ${formatIstTime(iso)} IST`;
}

export function formatIstRange(startIso: string, endIso: string): string {
  const sameDay = istDate(new Date(startIso)) === istDate(new Date(endIso));
  const end = sameDay ? formatIstTime(endIso) : `${istDayLabelFromDate(new Date(endIso))}, ${formatIstTime(endIso)}`;
  return `${istDayLabelFromDate(new Date(startIso))}, ${formatIstTime(startIso)} – ${end} IST`;
}

export function istDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

export function istDayWindow(date: string, days: number): { startAfter: string; startBefore: string } {
  const [y, m, d] = date.split("-").map(Number);
  const start = Date.UTC(y, m - 1, d) - IST_OFFSET_MS;
  return {
    startAfter: new Date(start).toISOString(),
    startBefore: new Date(start + days * DAY_MS).toISOString(),
  };
}

export function istHour(iso: string): number {
  return Number(new Date(iso).toLocaleString("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }));
}

export function istDayLabel(date: string): string {
  return istDayLabelFromDate(new Date(`${date}T12:00:00+05:30`));
}

export function hasOffset(iso: string): boolean {
  return /(Z|[+-]\d{2}:\d{2})$/.test(iso);
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test tests/lib`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scrub.ts src/lib/time.ts tests/lib/scrub.test.ts tests/lib/time.test.ts
git commit -m "feat(lib): key scrubbing, pseudonyms and IST time helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: EdgeOS client and types

**Files:**
- Create: `src/lib/edgeos/client.ts`, `src/lib/edgeos/types.ts`
- Test: `tests/lib/edgeos/client.test.ts`, `tests/edgeos-mock.ts`

**Interfaces:**
- Consumes: `edgeosBase()` (Task 1), `scrubKeys` (Task 3).
- Produces:
  - `class EdgeosError extends Error { status: number; detail: string; retryAfter: number | null }`
  - `type Method = "GET" | "POST" | "PATCH" | "DELETE"`
  - `edgeos<T>(key: string, method: Method, path: string, opts?: { query?: Query; body?: unknown; timeoutMs?: number }): Promise<T>` where `path` excludes `/api/v1`
  - Types: `PopupPublic`, `EdgeEvent`, `ListModel<T>`, `Venue`, `Track`, `Participant`, `RsvpEligibility`, `DayEventCount`, `VenueAvailability`
  - `tests/edgeos-mock.ts`: `mockEdgeos(routes: MockRoute[]): { calls: { method: string; url: URL; body: unknown; auth: string | null }[] }` where `MockRoute = { method: string; path: string | RegExp; status?: number; body?: unknown; headers?: Record<string,string> }` (path matched against `url.pathname` with `/api/v1` stripped)

- [ ] **Step 1: Write the mock helper and failing tests**

`tests/edgeos-mock.ts`:

```ts
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
      (r) => r.method === method && (typeof r.path === "string" ? r.path === path : r.path.test(path)),
    );
    if (!route) return new Response(JSON.stringify({ detail: "Not Found" }), { status: 404 });
    const text = typeof route.body === "string" ? route.body : JSON.stringify(route.body ?? {});
    return new Response(text, {
      status: route.status ?? 200,
      headers: { "content-type": typeof route.body === "string" ? "text/html" : "application/json", ...route.headers },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  afterEach(() => vi.unstubAllGlobals());
  return { calls, fetchMock };
}
```

`tests/lib/edgeos/client.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { EdgeosError, edgeos } from "@/lib/edgeos/client";
import { mockEdgeos } from "../../edgeos-mock";

const KEY = "eos_live_AbCdEfGhIjKlMnOpQrStUvWxYz012345";

describe("edgeos client", () => {
  it("sends the key as a bearer and builds the query", async () => {
    const m = mockEdgeos([{ method: "GET", path: "/events/portal/events", body: { results: [], paging: {} } }]);
    await edgeos(KEY, "GET", "/events/portal/events", {
      query: { popup_id: "p1", tags: ["AI", "Music"], search: undefined, rsvped_only: true },
    });
    const call = m.calls[0];
    expect(call.auth).toBe(`Bearer ${KEY}`);
    expect(call.url.origin + call.url.pathname).toBe("https://api.edgeos.world/api/v1/events/portal/events");
    expect(call.url.searchParams.getAll("tags")).toEqual(["AI", "Music"]);
    expect(call.url.searchParams.has("search")).toBe(false);
    expect(call.url.searchParams.get("rsvped_only")).toBe("true");
  });

  it("sends JSON bodies", async () => {
    const m = mockEdgeos([{ method: "POST", path: /^\/event-participants\/portal\/register\//, body: { ok: true } }]);
    await edgeos(KEY, "POST", "/event-participants/portal/register/e1", { body: { occurrence_start: null } });
    expect(m.calls[0].body).toEqual({ occurrence_start: null });
  });

  it("raises EdgeosError with scrubbed detail", async () => {
    mockEdgeos([{ method: "GET", path: "/x", status: 403, body: { detail: `key ${KEY} lacks scope` } }]);
    const err = await edgeos(KEY, "GET", "/x").catch((e) => e);
    expect(err).toBeInstanceOf(EdgeosError);
    expect(err.status).toBe(403);
    expect(err.detail).toBe("key eos_live_[redacted] lacks scope");
    expect(String(err.message)).not.toContain(KEY);
  });

  it("parses Retry-After", async () => {
    mockEdgeos([{ method: "GET", path: "/x", status: 429, body: { detail: "slow down" }, headers: { "retry-after": "12" } }]);
    const err = await edgeos(KEY, "GET", "/x").catch((e) => e);
    expect(err.retryAfter).toBe(12);
  });

  it("does not pass HTML error pages through", async () => {
    mockEdgeos([{ method: "GET", path: "/x", status: 502, body: "<html><body>Bad gateway</body></html>" }]);
    const err = await edgeos(KEY, "GET", "/x").catch((e) => e);
    expect(err.detail).toBe("EdgeOS returned 502");
  });

  it("maps network failures to status 0", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    const err = await edgeos(KEY, "GET", "/x").catch((e) => e);
    expect(err.status).toBe(0);
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/lib/edgeos/client.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`src/lib/edgeos/types.ts`:

```ts
// Hand-written shapes for the EdgeOS fields this server reads.
// Source of truth: spec/edgeos-openapi.json (see src/generated/reference.ts).

export type ListModel<T> = { results: T[]; paging: { limit: number; offset: number; total: number } };

export type PopupPublic = {
  id: string;
  name: string;
  slug: string;
  start_date: string | null;
  end_date: string | null;
  location?: string | null;
};

export type RsvpStatus = "registered" | "checked_in" | "cancelled";

export type EdgeEvent = {
  id: string;
  popup_id: string;
  title: string;
  content: string | null;
  start_time: string;
  end_time: string;
  timezone: string;
  venue_id: string | null;
  custom_location_name: string | null;
  custom_location_url: string | null;
  meeting_url: string | null;
  max_participant: number | null;
  tags: string[];
  kind: string | null;
  track_id: string | null;
  visibility: "public" | "private" | "unlisted";
  status: "draft" | "published" | "cancelled" | "pending_approval" | "rejected";
  highlighted: boolean;
  host_display_name: string | null;
  require_approval: boolean;
  rrule: string | null;
  recurrence_master_id: string | null;
  my_rsvp_status?: RsvpStatus | null;
  attendee_count?: number;
};

export type Venue = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
  booking_mode: string;
  status: string;
  tags: string[];
};

export type Track = { id: string; name: string; description: string | null };

export type Participant = {
  id: string;
  status: RsvpStatus;
  role: string;
  first_name: string | null;
  last_name: string | null;
  occurrence_start: string | null;
};

export type RsvpEligibility = { allowed: boolean; reason: string | null };
export type DayEventCount = { day: string; count: number };
export type TimeRange = { start?: string; end?: string; start_time?: string; end_time?: string };
export type VenueAvailability = { venue_id: string; timezone: string; open_ranges: TimeRange[]; busy: TimeRange[] };

export function isRecurring(e: EdgeEvent): boolean {
  return Boolean(e.rrule || e.recurrence_master_id);
}
```

`src/lib/edgeos/client.ts`:

```ts
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
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new EdgeosError(0, scrubKeys(`EdgeOS did not respond: ${msg}`), null);
  }
  const text = await res.text();
  if (!res.ok) {
    const ra = Number(res.headers.get("retry-after"));
    throw new EdgeosError(res.status, detailFrom(res.status, res.headers.get("content-type"), text), Number.isFinite(ra) && ra > 0 ? ra : null);
  }
  return (text ? JSON.parse(text) : null) as T;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test tests/lib/edgeos/client.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/edgeos tests/lib/edgeos tests/edgeos-mock.ts
git commit -m "feat(edgeos): typed client with scrubbed errors

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Scope and popup detection

**Files:**
- Create: `src/lib/edgeos/detect.ts`
- Test: `tests/lib/edgeos/detect.test.ts`

**Interfaces:**
- Consumes: `edgeos`, `EdgeosError`, `PopupPublic` (Task 4); `Scope`, `PopupRef`, `SCOPE_ORDER` (Task 2).
- Produces: `detectAccess(key: string, now?: Date): Promise<DetectResult>` with `DetectResult = { ok: true; popup: PopupRef; scopes: Scope[]; probes: Partial<Record<WriteScope, number>> } | { ok: false; reason: "invalid_key" | "no_events_read" | "no_popup" | "edgeos_down" }`.

- [ ] **Step 1: Write the failing tests**

`tests/lib/edgeos/detect.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectAccess } from "@/lib/edgeos/detect";
import { mockEdgeos } from "../../edgeos-mock";

const KEY = "eos_live_AbCdEfGhIjKlMnOpQrStUvWxYz012345";
const NOW = new Date("2026-10-14T06:00:00Z");
const POPUPS = [
  { id: "esm", name: "Edge Esmeralda 2026", slug: "edge-esmeralda-2026", start_date: "2026-05-30", end_date: "2026-06-27" },
  { id: "ind", name: "Edge City India", slug: "edge-india-2026", start_date: "2026-10-11", end_date: "2026-11-01" },
];
describe("detectAccess", () => {
  it("finds the key's popup and detects write scopes by 403 vs 404", async () => {
    const m = mockEdgeos([
      { method: "GET", path: "/popups/portal/list", body: POPUPS },
      { method: "POST", path: /^\/event-participants\/portal\/register\//, status: 404 },
      { method: "POST", path: /^\/events\/portal\/events\/.+\/cancel$/, status: 403, body: { detail: "API key lacks required scope: events:write" } },
      { method: "PATCH", path: /^\/event-venues\/portal\/venues\//, status: 403, body: { detail: "API key lacks required scope: venues:write" } },
    ]);
    // The events probe answers 403 for the other popup, 200 for India.
    m.fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify(POPUPS), { status: 200, headers: { "content-type": "application/json" } }));
    const original = m.fetchMock.getMockImplementation()!;
    m.fetchMock.mockImplementation(async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/events/portal/events")) {
        const ok = url.searchParams.get("popup_id") === "ind";
        return new Response(JSON.stringify(ok ? { results: [], paging: {} } : { detail: "This API key does not have access to this popup" }), {
          status: ok ? 200 : 403,
          headers: { "content-type": "application/json" },
        });
      }
      return original(input, init);
    });

    const r = await detectAccess(KEY, NOW);
    expect(r).toEqual({
      ok: true,
      popup: { id: "ind", name: "Edge City India", slug: "edge-india-2026", startDate: "2026-10-11", endDate: "2026-11-01" },
      scopes: ["events:read", "rsvp:write"],
      probes: { "rsvp:write": 404, "events:write": 403, "venues:write": 403 },
    });
  });

  it("treats an unreachable probe as present (fallback)", async () => {
    const m = mockEdgeos([
      { method: "GET", path: "/popups/portal/list", body: [POPUPS[1]] },
      { method: "GET", path: "/events/portal/events", body: { results: [], paging: {} } },
      { method: "POST", path: /register/, status: 500, body: { detail: "boom" } },
      { method: "POST", path: /cancel$/, status: 422, body: { detail: "invalid" } },
      { method: "PATCH", path: /venues/, status: 403, body: { detail: "no" } },
    ]);
    const r = await detectAccess(KEY, NOW);
    expect(r.ok && r.scopes).toEqual(["events:read", "rsvp:write", "events:write"]);
    expect(m.calls.some((c) => c.method === "POST")).toBe(true);
  });

  it("reports an invalid key", async () => {
    mockEdgeos([{ method: "GET", path: "/popups/portal/list", status: 401, body: { detail: "Invalid" } }]);
    expect(await detectAccess(KEY, NOW)).toEqual({ ok: false, reason: "invalid_key" });
  });

  it("reports a key without events:read", async () => {
    mockEdgeos([{ method: "GET", path: "/popups/portal/list", status: 403, body: { detail: "lacks" } }]);
    expect(await detectAccess(KEY, NOW)).toEqual({ ok: false, reason: "no_events_read" });
  });

  it("reports no popup when every popup refuses", async () => {
    mockEdgeos([
      { method: "GET", path: "/popups/portal/list", body: POPUPS },
      { method: "GET", path: "/events/portal/events", status: 403, body: { detail: "no access" } },
    ]);
    expect(await detectAccess(KEY, NOW)).toEqual({ ok: false, reason: "no_popup" });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/lib/edgeos/detect.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/edgeos/detect.ts`**

```ts
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

const PROBES: { scope: WriteScope; method: Method; path: (id: string) => string; body?: unknown }[] = [
  { scope: "rsvp:write", method: "POST", path: (id) => `/event-participants/portal/register/${id}`, body: {} },
  { scope: "events:write", method: "POST", path: (id) => `/events/portal/events/${id}/cancel` },
  { scope: "venues:write", method: "PATCH", path: (id) => `/event-venues/portal/venues/${id}`, body: {} },
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
    if (err instanceof EdgeosError && err.status === 401) return { ok: false, reason: "invalid_key" };
    if (err instanceof EdgeosError && err.status === 403) return { ok: false, reason: "no_events_read" };
    return { ok: false, reason: "edgeos_down" };
  }

  // Current and upcoming popups first; a key is bound to exactly one.
  const today = now.toISOString().slice(0, 10);
  const ordered = [...popups].sort((a, b) => Number((b.end_date ?? "") >= today) - Number((a.end_date ?? "") >= today));
  const window = { start_after: now.toISOString(), start_before: new Date(now.getTime() + 3_600_000).toISOString() };

  let popup: PopupPublic | undefined;
  for (const p of ordered.slice(0, 20)) {
    try {
      await edgeos(key, "GET", "/events/portal/events", { query: { popup_id: p.id, event_status: "published", ...window } });
      popup = p;
      break;
    } catch (err) {
      if (err instanceof EdgeosError && err.status === 403) continue;
      if (err instanceof EdgeosError && err.status === 401) return { ok: false, reason: "invalid_key" };
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
```

- [ ] **Step 4: Run tests**

Run: `pnpm test tests/lib/edgeos/detect.test.ts`
Expected: PASS (5 tests). If the first test's mock layering is awkward, rewrite it with a single `vi.stubGlobal("fetch", ...)` router that checks `popup_id`; the assertion is what matters.

- [ ] **Step 5: Commit**

```bash
git add src/lib/edgeos/detect.ts tests/lib/edgeos/detect.test.ts
git commit -m "feat(edgeos): detect bound popup and write scopes without side effects

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: OAuth building blocks (PKCE, metadata, clients)

**Files:**
- Create: `src/lib/oauth/pkce.ts`, `src/lib/oauth/metadata.ts`, `src/lib/oauth/clients.ts`
- Test: `tests/lib/oauth/pkce.test.ts`, `tests/lib/oauth/metadata.test.ts`, `tests/lib/oauth/clients.test.ts`

**Interfaces:**
- Consumes: `seal`, `unseal` (Task 2); `origin`, `mcpUrl` (Task 1).
- Produces:
  - `verifyPkce(verifier: string, challenge: string): boolean`
  - `authServerMetadata(): Record<string, unknown>`, `protectedResourceMetadata(): Record<string, unknown>`
  - `type OAuthClient = { clientId: string; kind: "cimd" | "dcr"; name: string; redirectUris: string[]; applicationType: "web" | "native" | null }`
  - `registerClient(body: unknown): Promise<{ ok: true; status: 201; body: Record<string, unknown> } | { ok: false; status: 400; body: { error: string; error_description: string } }>`
  - `resolveClient(clientId: string): Promise<OAuthClient | null>`
  - `redirectAllowed(client: OAuthClient, redirectUri: string): boolean`
  - `_clearCimdCache(): void` (tests)

- [ ] **Step 1: Write the failing tests**

`tests/lib/oauth/pkce.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { verifyPkce } from "@/lib/oauth/pkce";

describe("PKCE S256", () => {
  it("accepts the RFC 7636 test vector", () => {
    expect(verifyPkce("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk", "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")).toBe(true);
  });
  it("rejects a wrong verifier", () => {
    expect(verifyPkce("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXX", "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")).toBe(false);
  });
  it("rejects a verifier that is too short", () => {
    expect(verifyPkce("short", "x")).toBe(false);
  });
});
```

`tests/lib/oauth/metadata.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { authServerMetadata, protectedResourceMetadata } from "@/lib/oauth/metadata";
import { useTestSecrets } from "../../helpers";

useTestSecrets();

describe("metadata", () => {
  it("advertises CIMD, DCR, S256 and iss", () => {
    const m = authServerMetadata();
    expect(m).toMatchObject({
      issuer: "https://mcp.test",
      authorization_endpoint: "https://mcp.test/oauth/authorize",
      token_endpoint: "https://mcp.test/oauth/token",
      registration_endpoint: "https://mcp.test/oauth/register",
      code_challenge_methods_supported: ["S256"],
      client_id_metadata_document_supported: true,
      authorization_response_iss_parameter_supported: true,
      token_endpoint_auth_methods_supported: ["none"],
    });
  });
  it("points the resource at /api/mcp", () => {
    expect(protectedResourceMetadata()).toMatchObject({
      resource: "https://mcp.test/api/mcp",
      authorization_servers: ["https://mcp.test"],
    });
  });
});
```

`tests/lib/oauth/clients.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { _clearCimdCache, redirectAllowed, registerClient, resolveClient } from "@/lib/oauth/clients";
import { useTestSecrets } from "../../helpers";

useTestSecrets();
beforeEach(() => {
  _clearCimdCache();
  vi.unstubAllGlobals();
});

describe("DCR", () => {
  it("registers a web client and resolves it back without storage", async () => {
    const r = await registerClient({ client_name: "claude.ai", redirect_uris: ["https://claude.ai/api/mcp/auth_callback"] });
    expect(r.ok).toBe(true);
    const id = (r as { body: { client_id: string } }).body.client_id;
    const c = await resolveClient(id);
    expect(c).toMatchObject({ kind: "dcr", name: "claude.ai", redirectUris: ["https://claude.ai/api/mcp/auth_callback"] });
  });

  it("accepts loopback redirects when application_type is omitted (2025 clients)", async () => {
    const r = await registerClient({ client_name: "Claude Code", redirect_uris: ["http://localhost:33418/callback"] });
    expect(r.ok).toBe(true);
  });

  it("rejects loopback redirects for an explicit web client", async () => {
    const r = await registerClient({ application_type: "web", redirect_uris: ["http://127.0.0.1:5000/cb"] });
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
    const c = await resolveClient((r as { body: { client_id: string } }).body.client_id);
    expect(redirectAllowed(c!, "http://127.0.0.1:51000/callback")).toBe(true);
    expect(redirectAllowed(c!, "http://127.0.0.1:51000/other")).toBe(false);
  });

  it("returns null for a forged client id", async () => {
    expect(await resolveClient("not-sealed")).toBeNull();
  });
});

describe("CIMD", () => {
  const URL_ID = "https://client.example/oauth/metadata.json";

  function serve(doc: unknown, init: ResponseInit = {}) {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(doc), { status: 200, headers: { "content-type": "application/json" }, ...init })));
  }

  it("fetches and validates a metadata document", async () => {
    serve({ client_id: URL_ID, client_name: "Example", redirect_uris: ["https://client.example/cb"] });
    const c = await resolveClient(URL_ID);
    expect(c).toMatchObject({ kind: "cimd", name: "Example", redirectUris: ["https://client.example/cb"] });
  });

  it("rejects a document whose client_id does not match its URL", async () => {
    serve({ client_id: "https://other.example/x", redirect_uris: ["https://client.example/cb"] });
    expect(await resolveClient(URL_ID)).toBeNull();
  });

  it("rejects oversized documents", async () => {
    serve({ client_id: URL_ID, redirect_uris: ["https://client.example/cb"], pad: "x".repeat(70_000) });
    expect(await resolveClient(URL_ID)).toBeNull();
  });

  it("refuses private hosts", async () => {
    expect(await resolveClient("https://localhost/meta.json")).toBeNull();
    expect(await resolveClient("https://10.0.0.5/meta.json")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/lib/oauth`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`src/lib/oauth/pkce.ts`:

```ts
import { createHash, timingSafeEqual } from "node:crypto";

export function verifyPkce(verifier: string, challenge: string): boolean {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false;
  const digest = Buffer.from(createHash("sha256").update(verifier).digest("base64url"));
  const expected = Buffer.from(challenge);
  return digest.length === expected.length && timingSafeEqual(digest, expected);
}
```

`src/lib/oauth/metadata.ts`:

```ts
import { mcpUrl, origin } from "@/lib/env";

export function authServerMetadata(): Record<string, unknown> {
  const o = origin();
  return {
    issuer: o,
    authorization_endpoint: `${o}/oauth/authorize`,
    token_endpoint: `${o}/oauth/token`,
    registration_endpoint: `${o}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    client_id_metadata_document_supported: true,
    authorization_response_iss_parameter_supported: true,
    service_documentation: `${o}/trust`,
  };
}

export function protectedResourceMetadata(): Record<string, unknown> {
  const o = origin();
  return {
    resource: mcpUrl(),
    authorization_servers: [o],
    bearer_methods_supported: ["header"],
    resource_name: "ECI Events MCP",
    resource_documentation: `${o}/trust`,
  };
}
```

`src/lib/oauth/clients.ts`:

```ts
// Two ways a client identifies itself, both without storage:
// - CIMD (MCP 2026-07-28 default): client_id is an https URL to a metadata doc.
// - DCR (deprecated, kept for 2025-era clients): client_id is a sealed blob.

import { seal, unseal } from "@/lib/seal";

export type OAuthClient = {
  clientId: string;
  kind: "cimd" | "dcr";
  name: string;
  redirectUris: string[];
  applicationType: "web" | "native" | null;
};

type Rejection = { ok: false; status: 400; body: { error: string; error_description: string } };

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);
const MAX_DOC = 65_536;
const CACHE_MS = 10 * 60_000;
const cimdCache = new Map<string, { client: OAuthClient; at: number }>();

export function _clearCimdCache(): void {
  cimdCache.clear();
}

function isLoopback(uri: string): boolean {
  try {
    const u = new URL(uri);
    return u.protocol === "http:" && LOOPBACK.has(u.hostname);
  } catch {
    return false;
  }
}

function validRedirect(uri: string, applicationType: OAuthClient["applicationType"]): boolean {
  let u: URL;
  try {
    u = new URL(uri);
  } catch {
    return false;
  }
  if (u.hash) return false;
  if (u.protocol === "https:") return true;
  if (u.protocol === "http:") return isLoopback(uri) && applicationType !== "web";
  // Private-use schemes for native apps (e.g. cursor://). Never script schemes.
  return !["javascript:", "data:", "vbscript:", "file:"].includes(u.protocol) && applicationType !== "web";
}

export function redirectAllowed(client: OAuthClient, redirectUri: string): boolean {
  return client.redirectUris.some((r) => {
    if (r === redirectUri) return true;
    if (!isLoopback(r) || !isLoopback(redirectUri)) return false;
    const a = new URL(r);
    const b = new URL(redirectUri);
    return a.hostname === b.hostname && a.pathname === b.pathname && a.search === b.search;
  });
}

const reject = (error: string, description: string): Rejection => ({
  ok: false,
  status: 400,
  body: { error, error_description: description },
});

export async function registerClient(
  body: unknown,
): Promise<{ ok: true; status: 201; body: Record<string, unknown> } | Rejection> {
  const b = (body ?? {}) as Record<string, unknown>;
  const uris = b.redirect_uris;
  if (!Array.isArray(uris) || uris.length === 0 || uris.some((u) => typeof u !== "string")) {
    return reject("invalid_redirect_uri", "redirect_uris must be a non-empty array of URLs");
  }
  const appType = b.application_type === "web" || b.application_type === "native" ? b.application_type : null;
  const bad = (uris as string[]).find((u) => !validRedirect(u, appType));
  if (bad) return reject("invalid_redirect_uri", `Redirect URI not allowed: ${bad}`);
  const name = typeof b.client_name === "string" ? b.client_name.slice(0, 100) : "MCP client";
  const clientId = await seal("client", { name, redirectUris: uris, applicationType: appType }, {});
  return {
    ok: true,
    status: 201,
    body: {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: name,
      redirect_uris: uris,
      application_type: appType ?? undefined,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
  };
}

function isPublicHost(hostname: string): boolean {
  if (LOOPBACK.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal")) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    const [a, b] = hostname.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return false;
  }
  return !hostname.startsWith("[");
}

async function fetchCimd(url: string): Promise<OAuthClient | null> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.hash || !isPublicHost(u.hostname)) return null;
  const hit = cimdCache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.client;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: "error", headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    if (Number(res.headers.get("content-length") ?? 0) > MAX_DOC) return null;
    const text = await res.text();
    if (text.length > MAX_DOC) return null;
    const doc = JSON.parse(text) as Record<string, unknown>;
    if (doc.client_id !== url) return null;
    const uris = doc.redirect_uris;
    if (!Array.isArray(uris) || uris.length === 0 || uris.some((x) => typeof x !== "string")) return null;
    const appType = doc.application_type === "web" || doc.application_type === "native" ? doc.application_type : null;
    if ((uris as string[]).some((x) => !validRedirect(x, appType))) return null;
    const client: OAuthClient = {
      clientId: url,
      kind: "cimd",
      name: typeof doc.client_name === "string" ? doc.client_name.slice(0, 100) : u.hostname,
      redirectUris: uris as string[],
      applicationType: appType,
    };
    cimdCache.set(url, { client, at: Date.now() });
    return client;
  } catch {
    return null;
  }
}

export async function resolveClient(clientId: string): Promise<OAuthClient | null> {
  if (clientId.startsWith("https://")) return fetchCimd(clientId);
  const c = await unseal<{ name: string; redirectUris: string[]; applicationType: OAuthClient["applicationType"] }>("client", clientId);
  if (!c) return null;
  return { clientId, kind: "dcr", name: c.name, redirectUris: c.redirectUris, applicationType: c.applicationType };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test tests/lib/oauth`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/oauth tests/lib/oauth
git commit -m "feat(oauth): PKCE, metadata documents, stateless CIMD and DCR clients

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Authorize, connect, token and OAuth routes

**Files:**
- Create: `src/lib/oauth/authorize.ts`, `src/lib/oauth/token.ts`, `src/app/oauth/authorize/route.ts`, `src/app/oauth/token/route.ts`, `src/app/oauth/register/route.ts`, `src/app/api/oauth-metadata/route.ts`, `src/app/api/oauth-resource-metadata/route.ts`, `src/app/connect/actions.ts`
- Test: `tests/lib/oauth/flow.test.ts`

**Interfaces:**
- Consumes: Tasks 2–6.
- Produces:
  - `REFRESH_UNTIL = new Date("2026-11-15T00:00:00+05:30")`
  - `startAuthorize(params: URLSearchParams): Promise<{ kind: "redirect"; location: string } | { kind: "error"; status: number; message: string }>` — success redirects to `/connect?req=<sealed authreq>`
  - `type AuthRequest = { clientId: string; clientName: string; redirectUri: string; codeChallenge: string; state: string | null; resource: string | null }`
  - `readAuthRequest(req: string): Promise<AuthRequest | null>`
  - `type ConnectState = { status: "idle" } | { status: "error"; message: string } | { status: "ok"; redirectTo: string; scopes: Scope[]; popupName: string }`
  - `completeAuthorize(req: string, rawKey: string): Promise<ConnectState>`
  - `exchangeToken(params: URLSearchParams): Promise<{ status: number; body: Record<string, unknown> }>`
  - `parseTokenBody(request: Request): Promise<URLSearchParams>`
  - `connect(prev: ConnectState, form: FormData): Promise<ConnectState>` (server action)

- [ ] **Step 1: Write the failing flow tests**

`tests/lib/oauth/flow.test.ts`:

```ts
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { completeAuthorize, readAuthRequest, startAuthorize } from "@/lib/oauth/authorize";
import { registerClient } from "@/lib/oauth/clients";
import { exchangeToken, parseTokenBody } from "@/lib/oauth/token";
import { unseal } from "@/lib/seal";
import { useTestSecrets } from "../../helpers";

useTestSecrets();

const KEY = "eos_live_AbCdEfGhIjKlMnOpQrStUvWxYz012345";
const VERIFIER = "a".repeat(43) + "VerifierVerifier";
const CHALLENGE = createHash("sha256").update(VERIFIER).digest("base64url");
const REDIRECT = "https://claude.ai/api/mcp/auth_callback";

vi.mock("@/lib/edgeos/detect", () => ({
  detectAccess: vi.fn(async (key: string) =>
    key === KEY
      ? { ok: true, popup: { id: "ind", name: "Edge City India", slug: "edge-india-2026", startDate: "2026-10-11", endDate: "2026-11-01" }, scopes: ["events:read", "rsvp:write"], probes: {} }
      : { ok: false, reason: "invalid_key" },
  ),
}));

async function dcrClient() {
  const r = await registerClient({ client_name: "claude.ai", redirect_uris: [REDIRECT] });
  return (r as { body: { client_id: string } }).body.client_id;
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
  const req = new URL(start.location, "https://mcp.test").searchParams.get("req")!;
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
    const req = await readAuthRequest(loc.searchParams.get("req")!);
    expect(req).toMatchObject({ clientName: "claude.ai", redirectUri: REDIRECT, state: "xyz" });
  });

  it("refuses an unregistered redirect without redirecting", async () => {
    const id = await dcrClient();
    const r = await startAuthorize(await authorizeParams(id, { redirect_uri: "https://evil.example/cb" }));
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
    const r = await startAuthorize(await authorizeParams(id, { resource: "https://other/api/mcp" }));
    expect(new URL((r as { location: string }).location).searchParams.get("error")).toBe("invalid_target");
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
    const req = new URL((start as { location: string }).location, "https://mcp.test").searchParams.get("req")!;
    const r = await completeAuthorize(req, "eos_live_NotARealKeyNotARealKey00");
    expect(r).toMatchObject({ status: "error" });
    expect((r as { message: string }).message).toContain("didn't accept");
    expect(await completeAuthorize(req, "hello")).toMatchObject({ status: "error" });
  });

  it("exchanges the code once PKCE checks out, and refreshes", async () => {
    const id = await dcrClient();
    const code = (await codeFor(id)).searchParams.get("code")!;
    const bad = await exchangeToken(new URLSearchParams({ grant_type: "authorization_code", code, code_verifier: "b".repeat(43), redirect_uri: REDIRECT, client_id: id }));
    expect(bad).toMatchObject({ status: 400, body: { error: "invalid_grant" } });

    const ok = await exchangeToken(new URLSearchParams({ grant_type: "authorization_code", code, code_verifier: VERIFIER, redirect_uri: REDIRECT, client_id: id }));
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ token_type: "Bearer", expires_in: 3600, scope: "events:read rsvp:write" });
    const access = await unseal<{ key: string }>("access", ok.body.access_token as string, { audience: "https://mcp.test/api/mcp" });
    expect(access?.key).toBe(KEY);

    const refreshed = await exchangeToken(new URLSearchParams({ grant_type: "refresh_token", refresh_token: ok.body.refresh_token as string, client_id: id }));
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.access_token).toBeTruthy();
  });

  it("refuses a code issued to another client", async () => {
    const id = await dcrClient();
    const other = await dcrClient();
    const code = (await codeFor(id)).searchParams.get("code")!;
    const r = await exchangeToken(new URLSearchParams({ grant_type: "authorization_code", code, code_verifier: VERIFIER, redirect_uri: REDIRECT, client_id: other }));
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
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/lib/oauth/flow.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `src/lib/oauth/authorize.ts`**

```ts
import { detectAccess } from "@/lib/edgeos/detect";
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

type StartResult = { kind: "redirect"; location: string } | { kind: "error"; status: number; message: string };

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
  if (!clientId || !redirectUri) return { kind: "error", status: 400, message: "Missing client_id or redirect_uri." };
  const client = await resolveClient(clientId);
  if (!client) return { kind: "error", status: 400, message: "Unknown client. Remove the connector and add it again." };
  if (!redirectAllowed(client, redirectUri)) return { kind: "error", status: 400, message: "This redirect address isn't registered for the client." };

  const state = p.get("state");
  const fail = (error: string, description: string): StartResult => ({
    kind: "redirect",
    location: backToClient(redirectUri, { error, error_description: description, state }),
  });
  if (p.get("response_type") !== "code") return fail("unsupported_response_type", "Only response_type=code is supported.");
  const challenge = p.get("code_challenge");
  if (!challenge || p.get("code_challenge_method") !== "S256") return fail("invalid_request", "PKCE with S256 is required.");
  const resource = p.get("resource");
  if (resource && !sameResource(resource)) return fail("invalid_target", "Unknown resource.");

  const req = await seal(
    "authreq",
    { clientId, clientName: client.name, redirectUri, codeChallenge: challenge, state, resource } satisfies AuthRequest,
    { ttlSeconds: 600 },
  );
  return { kind: "redirect", location: `/connect?req=${encodeURIComponent(req)}` };
}

export async function readAuthRequest(req: string): Promise<AuthRequest | null> {
  return unseal<AuthRequest>("authreq", req);
}

const REASONS: Record<string, string> = {
  invalid_key: "EdgeOS didn't accept this key. It may be revoked or expired. Make a new one and paste it here.",
  no_events_read: "This key can't read events. Make a new key with “Read events” ticked.",
  no_popup: "This key isn't linked to a popup we can see. Make the key from the Edge City India portal.",
  edgeos_down: "EdgeOS isn't responding right now. Try again in a minute.",
};

export async function completeAuthorize(reqToken: string, rawKey: string): Promise<ConnectState> {
  const req = await readAuthRequest(reqToken);
  if (!req) return { status: "error", message: "This sign-in link expired. Go back to your app and connect again." };
  const key = normalizeKey(rawKey);
  if (!looksLikeKey(key)) {
    return { status: "error", message: "That doesn't look like an EdgeOS key. Keys start with eos_live_. Copy the whole key from the portal." };
  }
  const access = await detectAccess(key);
  if (!access.ok) return { status: "error", message: `${REASONS[access.reason]} (${agenticAccessUrl()})` };

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
```

- [ ] **Step 4: Implement `src/lib/oauth/token.ts`**

```ts
import { mcpUrl } from "@/lib/env";
import { seal, unseal } from "@/lib/seal";
import type { Access } from "@/lib/types";
import { REFRESH_UNTIL } from "./authorize";
import { verifyPkce } from "./pkce";

type CodePayload = Access & { clientId: string; redirectUri: string; codeChallenge: string; resource: string | null };
type RefreshPayload = Access & { clientId: string };
type TokenResult = { status: number; body: Record<string, unknown> };

const err = (error: string, description: string, status = 400): TokenResult => ({
  status,
  body: { error, error_description: description },
});

export async function parseTokenBody(request: Request): Promise<URLSearchParams> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const j = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return new URLSearchParams(Object.entries(j).filter(([, v]) => typeof v === "string") as [string, string][]);
  }
  return new URLSearchParams(await request.text());
}

async function issue(access: Access, clientId: string): Promise<TokenResult> {
  const base = { key: access.key, scopes: access.scopes, popup: access.popup };
  const accessToken = await seal("access", base, { ttlSeconds: 3600, audience: mcpUrl() });
  const refreshToken = await seal("refresh", { ...base, clientId }, { expiresAt: REFRESH_UNTIL });
  return {
    status: 200,
    body: {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: access.scopes.join(" "),
    },
  };
}

export async function exchangeToken(p: URLSearchParams): Promise<TokenResult> {
  const grant = p.get("grant_type");
  if (grant === "authorization_code") {
    const code = await unseal<CodePayload>("code", p.get("code") ?? "");
    if (!code) return err("invalid_grant", "The code is invalid or expired.");
    if (p.get("client_id") && p.get("client_id") !== code.clientId) return err("invalid_grant", "Code was issued to another client.");
    if (p.get("redirect_uri") !== code.redirectUri) return err("invalid_grant", "redirect_uri does not match.");
    if (!verifyPkce(p.get("code_verifier") ?? "", code.codeChallenge)) return err("invalid_grant", "PKCE verification failed.");
    const resource = p.get("resource");
    if (resource && resource.replace(/\/+$/, "") !== mcpUrl()) return err("invalid_target", "Unknown resource.");
    return issue(code, code.clientId);
  }
  if (grant === "refresh_token") {
    const r = await unseal<RefreshPayload>("refresh", p.get("refresh_token") ?? "");
    if (!r) return err("invalid_grant", "The refresh token is invalid or expired. Connect again.");
    if (p.get("client_id") && p.get("client_id") !== r.clientId) return err("invalid_grant", "Refresh token was issued to another client.");
    return issue(r, r.clientId);
  }
  return err("unsupported_grant_type", "Use authorization_code or refresh_token.");
}
```

- [ ] **Step 5: Implement the routes and server action**

`src/app/oauth/authorize/route.ts`:

```ts
import { startAuthorize } from "@/lib/oauth/authorize";

export async function GET(request: Request) {
  const r = await startAuthorize(new URL(request.url).searchParams);
  if (r.kind === "redirect") return Response.redirect(new URL(r.location, request.url), 302);
  return new Response(r.message, { status: r.status, headers: { "content-type": "text/plain; charset=utf-8" } });
}
```

`src/app/oauth/token/route.ts`:

```ts
import { exchangeToken, parseTokenBody } from "@/lib/oauth/token";

const headers = { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" };

export async function POST(request: Request) {
  const r = await exchangeToken(await parseTokenBody(request));
  return Response.json(r.body, { status: r.status, headers });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { ...headers, "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "content-type" } });
}
```

`src/app/oauth/register/route.ts`:

```ts
import { registerClient } from "@/lib/oauth/clients";

const headers = { "Access-Control-Allow-Origin": "*" };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const r = await registerClient(body);
  return Response.json(r.body, { status: r.status, headers });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { ...headers, "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "content-type" } });
}
```

`src/app/api/oauth-metadata/route.ts`:

```ts
import { authServerMetadata } from "@/lib/oauth/metadata";

export function GET() {
  return Response.json(authServerMetadata(), { headers: { "Access-Control-Allow-Origin": "*" } });
}
```

`src/app/api/oauth-resource-metadata/route.ts`:

```ts
import { protectedResourceMetadata } from "@/lib/oauth/metadata";

export function GET() {
  return Response.json(protectedResourceMetadata(), { headers: { "Access-Control-Allow-Origin": "*" } });
}
```

`src/app/connect/actions.ts`:

```ts
"use server";

import { type ConnectState, completeAuthorize } from "@/lib/oauth/authorize";

export async function connect(_prev: ConnectState, form: FormData): Promise<ConnectState> {
  return completeAuthorize(String(form.get("req") ?? ""), String(form.get("key") ?? ""));
}
```

- [ ] **Step 6: Run tests and typecheck**

Run: `pnpm test tests/lib/oauth && pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/oauth src/app/oauth src/app/api/oauth-metadata src/app/api/oauth-resource-metadata src/app/connect/actions.ts tests/lib/oauth/flow.test.ts
git commit -m "feat(oauth): stateless authorize, connect and token endpoints

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: MCP endpoint, tool wrapper and server skeleton

**Files:**
- Create: `src/mcp/lib/auth.ts`, `src/mcp/lib/result.ts`, `src/mcp/lib/tool-wrapper.ts`, `src/mcp/lib/context.ts`, `src/mcp/instructions.ts`, `src/mcp/server.ts`, `src/app/api/mcp/route.ts`, `src/lib/build.ts`, `src/app/api/build-info/route.ts`
- Test: `tests/mcp/route.test.ts`, `tests/mcp/tool-wrapper.test.ts`, `tests/mcp-client.ts`

**Interfaces:**
- Consumes: `unseal`, `Access`, `mcpUrl`, `EdgeosError`, `scrubKeys`, `pseudonymId`.
- Produces:
  - `resolveAccess(authHeader: string | null): Promise<Access | null>`
  - `type ToolResult = { content: { type: "text"; text: string }[]; structuredContent?: Record<string, unknown>; isError?: boolean }`; `ok(text: string, structured?: Record<string, unknown>): ToolResult`; `fail(text: string): ToolResult`
  - `class ToolError extends Error { code: string }`
  - `withToolHandler<P>(name: string, access: Access, fn: (p: P) => Promise<ToolResult>): (p: P) => Promise<ToolResult>`
  - `edgeosMessage(err: EdgeosError): string`
  - `type ContextSection = (access: Access) => string | null`; `composeSections(access: Access, sections: ContextSection[]): string`
  - `SERVER_INSTRUCTIONS: string`
  - `buildServer(access: Access, now?: Date): McpServer` — later tasks add registrations inside it
  - `buildInfo(): { repo: string; commit: string; commitUrl: string; builtAt: string; host: string; deployMethod: string }`
  - `tests/mcp-client.ts`: `connectClient(token: string): Promise<Client>` (SDK v2 client wired to the route handler)
  - `tests/helpers.ts` addition: `accessToken(access?: Partial<Access>): Promise<string>`, `TEST_ACCESS: Access`

- [ ] **Step 1: Add test helpers**

Append to `tests/helpers.ts`:

```ts
import { seal } from "@/lib/seal";
import type { Access } from "@/lib/types";

export const TEST_ACCESS: Access = {
  key: "eos_live_AbCdEfGhIjKlMnOpQrStUvWxYz012345",
  scopes: ["events:read", "rsvp:write"],
  popup: { id: "ind", name: "Edge City India", slug: "edge-india-2026", startDate: "2026-10-11", endDate: "2026-11-01" },
};

export async function accessToken(over: Partial<Access> = {}): Promise<string> {
  const a = { ...TEST_ACCESS, ...over };
  return seal("access", a, { ttlSeconds: 3600, audience: "https://mcp.test/api/mcp" });
}
```

`tests/mcp-client.ts` (SDK v2 client; if an import name differs in the installed version, check `node_modules/@modelcontextprotocol/client/dist/*.d.ts` and adjust — the intent is "a real MCP client talking to our POST handler in-process"):

```ts
import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { vi } from "vitest";

vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (fn: () => unknown) => void fn() }));

export async function connectClient(token: string) {
  const { POST } = await import("@/app/api/mcp/route");
  const transport = new StreamableHTTPClientTransport(new URL("https://mcp.test/api/mcp"), {
    fetch: (url: string | URL | Request, init?: RequestInit) => POST(new Request(url, init)),
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  const client = new Client({ name: "vitest", version: "1.0.0" });
  await client.connect(transport);
  return client;
}
```

- [ ] **Step 2: Write the failing tests**

`tests/mcp/route.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { accessToken, newSecret, useTestSecrets } from "../helpers";
import { connectClient } from "../mcp-client";

useTestSecrets();
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (fn: () => unknown) => void fn() }));

const post = async (headers: Record<string, string>, body: unknown) => {
  const { POST } = await import("@/app/api/mcp/route");
  return POST(new Request("https://mcp.test/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
    body: JSON.stringify(body),
  }));
};

describe("/api/mcp", () => {
  it("answers 401 with resource metadata when there is no token", async () => {
    const res = await post({}, { jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBe('Bearer resource_metadata="https://mcp.test/.well-known/oauth-protected-resource"');
  });

  it("stale token gets 401 with resource metadata", async () => {
    const token = await accessToken();
    process.env.TOKEN_SECRETS = newSecret();
    const res = await post({ authorization: `Bearer ${token}` }, { jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("resource_metadata");
  });

  it("rejects a token minted for another audience", async () => {
    const { seal } = await import("@/lib/seal");
    const token = await seal("access", { key: "k", scopes: [], popup: {} }, { ttlSeconds: 60, audience: "https://other/api/mcp" });
    const res = await post({ authorization: `Bearer ${token}` }, { jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(res.status).toBe(401);
  });

  it("serves a 2025-11-25 client that sends initialize", async () => {
    const res = await post(
      { authorization: `Bearer ${await accessToken()}`, "mcp-protocol-version": "2025-11-25" },
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "legacy", version: "1" } } },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result.protocolVersion).toBe("2025-11-25");
    expect(json.result.instructions).toContain("edgeos_initialize");
  });

  it("serves a current SDK client end to end", async () => {
    const client = await connectClient(await accessToken());
    const tools = await client.listTools();
    expect(tools.tools.map((t) => t.name)).toContain("edgeos_initialize");
  });

  it("refuses GET", async () => {
    const { GET } = await import("@/app/api/mcp/route");
    expect((await GET()).status).toBe(405);
  });
});
```

`tests/mcp/tool-wrapper.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { EdgeosError } from "@/lib/edgeos/client";
import { ToolError, withToolHandler } from "@/mcp/lib/tool-wrapper";
import { TEST_ACCESS, useTestSecrets } from "../helpers";

useTestSecrets();

describe("withToolHandler", () => {
  it("maps EdgeOS 401 to a reconnect message", async () => {
    const h = withToolHandler("t", TEST_ACCESS, async () => { throw new EdgeosError(401, "Invalid token", null); });
    const r = await h({});
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("AUTH_EXPIRED");
    expect(r.content[0].text).toContain("https://mcp.test");
  });

  it("maps 429 with Retry-After", async () => {
    const h = withToolHandler("t", TEST_ACCESS, async () => { throw new EdgeosError(429, "slow", 7); });
    expect((await h({})).content[0].text).toContain("Wait 7 seconds");
  });

  it("names the missing scope on 403", async () => {
    const h = withToolHandler("t", TEST_ACCESS, async () => { throw new EdgeosError(403, "API key lacks required scope: events:write", null); });
    const text = (await h({})).content[0].text;
    expect(text).toContain("events:write");
    expect(text).toContain("/portal/agentic-access");
  });

  it("passes ToolError codes through", async () => {
    const h = withToolHandler("t", TEST_ACCESS, async () => { throw new ToolError("BAD_INPUT", "Pick a date."); });
    expect((await h({})).content[0].text).toBe("BAD_INPUT: Pick a date.");
  });

  it("hides internal errors and never logs the key", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const h = withToolHandler("t", TEST_ACCESS, async () => { throw new Error(`boom ${TEST_ACCESS.key}`); });
    const r = await h({});
    expect(r.content[0].text).toMatch(/^INTERNAL_ERROR/);
    const logged = log.mock.calls.flat().join(" ");
    expect(logged).not.toContain(TEST_ACCESS.key);
    expect(logged).toContain("eos_live_[redacted]");
    log.mockRestore();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm test tests/mcp`
Expected: FAIL, modules not found.

- [ ] **Step 4: Implement the MCP plumbing**

`src/mcp/lib/auth.ts`:

```ts
import { mcpUrl } from "@/lib/env";
import { unseal } from "@/lib/seal";
import type { Access } from "@/lib/types";

export async function resolveAccess(authHeader: string | null): Promise<Access | null> {
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return null;
  const a = await unseal<Access>("access", authHeader.slice(7).trim(), { audience: mcpUrl() });
  if (!a?.key || !Array.isArray(a.scopes) || !a.popup?.id) return null;
  return { key: a.key, scopes: a.scopes, popup: a.popup };
}
```

`src/mcp/lib/result.ts`:

```ts
export type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

export function ok(text: string, structured?: Record<string, unknown>): ToolResult {
  return { content: [{ type: "text", text }], ...(structured ? { structuredContent: structured } : {}) };
}

export function fail(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}
```

`src/mcp/lib/tool-wrapper.ts`:

```ts
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
      return `FORBIDDEN: EdgeOS refused this (${err.detail}). If a scope is missing, the attendee can make a new key at ${agenticAccessUrl()} with that box ticked and reconnect.`;
    case 404:
      return "NOT_FOUND: Not found, or hidden from this attendee.";
    case 400:
    case 409:
    case 422:
      return `REJECTED: EdgeOS rejected the request: ${err.detail}`;
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
        return fail(`${err.code}: ${err.message}`);
      }
      const message = scrubKeys(err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err));
      logCall({ tool: name, who, ms, status: "internal_error", message });
      return fail("INTERNAL_ERROR: Something went wrong on our side. It has been logged; please try again.");
    }
  };
}
```

`src/mcp/lib/context.ts`:

```ts
import type { Access } from "@/lib/types";

/** A tool group's section of the edgeos_initialize response, or null when the attendee can't use it. */
export type ContextSection = (access: Access) => string | null;

export function composeSections(access: Access, sections: ContextSection[]): string {
  return sections
    .map((s) => s(access))
    .filter((s): s is string => Boolean(s))
    .join("\n\n");
}
```

`src/mcp/instructions.ts`:

```ts
export const SERVER_INSTRUCTIONS = [
  "You help an Edge City India 2026 attendee (Mandrem, Goa, 11 Oct – 1 Nov 2026) use the EdgeOS events calendar: find events, RSVP, host events and manage venues, as far as their own EdgeOS key allows.",
  "",
  "RULES:",
  "1. Never fabricate. If a tool didn't return it, say you don't know.",
  "2. Show every time in India time (IST, Asia/Kolkata). Never read a UTC time out as local.",
  "3. Every change goes through edgeos_propose, then edgeos_confirm only after the attendee explicitly says yes to the summary.",
  "4. Never ask the attendee to paste their EdgeOS key into the chat. Keys are entered only on this server's connect page.",
  "",
  "Call edgeos_initialize first. It tells you what this attendee can do today.",
].join("\n");
```

`src/mcp/server.ts` (placeholder gateway; Task 10 replaces it):

```ts
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { Access } from "@/lib/types";
import { SERVER_INSTRUCTIONS } from "./instructions";

export function buildServer(access: Access, now: Date = new Date()): McpServer {
  const server = new McpServer({ name: "eci-events", version: "1.0.0" }, { instructions: SERVER_INSTRUCTIONS });
  // Placeholder gateway; Task 9 replaces this registration with registerInitialize().
  server.registerTool(
    "edgeos_initialize",
    { description: "Call first. Loads what this attendee can do.", inputSchema: z.object({}) },
    async () => ({ content: [{ type: "text" as const, text: `Connected to ${access.popup.name} at ${now.toISOString()}` }] }),
  );
  return server;
}
```

`src/app/api/mcp/route.ts`:

```ts
import { createMcpHandler } from "@modelcontextprotocol/server";
import { after } from "next/server";
import { origin } from "@/lib/env";
import type { Access } from "@/lib/types";
import { resolveAccess } from "@/mcp/lib/auth";
import { buildServer } from "@/mcp/server";

// Stateless: a fresh McpServer per request, built for this attendee's scopes.
// 2026-07-28 clients are served statelessly; 2025-11-25 clients get the SDK's
// default legacy handling from the same factory.
const handler = createMcpHandler(({ authInfo }) => buildServer(authInfo?.extra?.access as Access), {
  responseMode: "json",
});

function unauthorized(): Response {
  return Response.json(
    { error: "unauthorized", error_description: "Connect this server from your MCP client to sign in." },
    {
      status: 401,
      headers: { "WWW-Authenticate": `Bearer resource_metadata="${origin()}/.well-known/oauth-protected-resource"` },
    },
  );
}

export async function POST(request: Request): Promise<Response> {
  const access = await resolveAccess(request.headers.get("authorization"));
  if (!access) return unauthorized();
  const res = await handler.fetch(request, {
    authInfo: { token: "[sealed]", clientId: "eci-events", scopes: access.scopes, extra: { access } },
  });
  after(async () => {
    const { flushAnalytics } = await import("@/mcp/analytics").catch(() => ({ flushAnalytics: async () => {} }));
    await flushAnalytics();
  });
  return res;
}

export function GET(): Response {
  return Response.json({ error: "Use POST." }, { status: 405, headers: { Allow: "POST" } });
}

export const DELETE = GET;
```

`src/mcp/analytics.ts` doesn't exist until Task 13; the dynamic import's `.catch` keeps the route working until then. Task 13 replaces this `after` block with a static import.

`src/lib/build.ts`:

```ts
import { REPO_URL } from "@/lib/env";

export function buildInfo() {
  const commit = process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "unknown";
  return {
    repo: REPO_URL,
    commit,
    commitUrl: commit === "unknown" ? REPO_URL : `${REPO_URL}/tree/${commit}`,
    builtAt: process.env.NEXT_PUBLIC_BUILD_TIME ?? "unknown",
    host: process.env.HOST_NAME || (process.env.VERCEL ? "Vercel" : "not set"),
    deployMethod: process.env.DEPLOY_METHOD ?? "git push to main",
  };
}
```

`src/app/api/build-info/route.ts`:

```ts
import { buildInfo } from "@/lib/build";

export function GET() {
  return Response.json(buildInfo(), { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } });
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm test tests/mcp && pnpm typecheck`
Expected: PASS. If `createMcpHandler`'s factory argument or `handler.fetch` options differ from the shapes above, read `node_modules/@modelcontextprotocol/server/dist/index.d.ts` and the serving guide at https://ts.sdk.modelcontextprotocol.io/v2/serving/http, then adjust the route only; the tests describe the required behaviour. If the 2025-11-25 test fails because legacy handling is opt-in in the installed version, enable it with the documented `legacy` option.

- [ ] **Step 6: Commit**

```bash
git add src/mcp src/app/api/mcp src/app/api/build-info src/lib/build.ts tests/mcp tests/mcp-client.ts tests/helpers.ts
git commit -m "feat(mcp): stateless MCP endpoint with sealed-token auth and tool wrapper

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Spec snapshot, generated reference and guides

**Files:**
- Create: `spec/route-policy.json`, `scripts/lib/spec.ts`, `scripts/spec-sync.ts`, `scripts/gen-reference.ts`, `scripts/policy-check.ts`, `guides/schedule.md`, `guides/recurring.md`, `guides/rsvp.md`, `guides/hosting.md`, `guides/venues.md`, `guides/limits.md`, `src/generated/reference.ts`, `src/generated/guides.ts`, `spec/edgeos-openapi.json`
- Test: `tests/scripts/spec.test.ts`

**Interfaces:**
- Produces:
  - `type PolicyRule = { method: string; path: string; exact: boolean; scopes: string[] }`
  - `filterSpec(spec: OpenApi, policy: PolicyRule[]): OpenApi`, `buildReference(spec: OpenApi, policy: PolicyRule[]): Reference`, `parsePolicy(securityPy: string): PolicyRule[]`, `renderReferenceModule(ref: Reference): string`, `renderGuidesModule(guides: Record<string, string>): string`
  - `src/generated/reference.ts` exports `ROUTES: Record<string, RouteDoc>` keyed `"GET /events/portal/events"` (no `/api/v1`), `ENUMS: Record<string, string[]>`, `SPEC_VERSION: string`, types `RouteDoc = { method: string; path: string; summary: string; scopes: string[]; query: ParamDoc[]; body: ParamDoc[] }`, `ParamDoc = { name: string; required: boolean; type: string; description: string; enum?: string[] }`
  - `src/generated/guides.ts` exports `GUIDES: Record<"schedule" | "recurring" | "rsvp" | "hosting" | "venues" | "limits", string>`

- [ ] **Step 1: Write the route policy (copied from EdgeOS `backend/app/core/security.py` `_PAT_ROUTE_POLICIES`)**

`spec/route-policy.json`:

```json
[
  { "method": "GET", "path": "/api/v1/events/portal/events", "exact": false, "scopes": ["events:read"] },
  { "method": "GET", "path": "/api/v1/event-participants/portal/participants", "exact": false, "scopes": ["events:read"] },
  { "method": "GET", "path": "/api/v1/event-participants/portal/eligibility/", "exact": false, "scopes": ["events:read"] },
  { "method": "GET", "path": "/api/v1/event-venues/portal/venues", "exact": false, "scopes": ["events:read", "venues:read"] },
  { "method": "GET", "path": "/api/v1/event-settings/portal/settings", "exact": false, "scopes": ["events:read"] },
  { "method": "GET", "path": "/api/v1/tracks/portal/tracks", "exact": false, "scopes": ["events:read"] },
  { "method": "GET", "path": "/api/v1/popups/portal/list", "exact": true, "scopes": ["events:read"] },
  { "method": "GET", "path": "/api/v1/popups/portal/", "exact": false, "scopes": ["events:read"] },
  { "method": "POST", "path": "/api/v1/events/portal/events", "exact": true, "scopes": ["events:write"] },
  { "method": "POST", "path": "/api/v1/events/portal/events/", "exact": false, "scopes": ["events:write"] },
  { "method": "POST", "path": "/api/v1/event-venues/portal/venues", "exact": true, "scopes": ["venues:write"] },
  { "method": "POST", "path": "/api/v1/event-participants/portal/register/", "exact": false, "scopes": ["rsvp:write"] },
  { "method": "POST", "path": "/api/v1/event-participants/portal/cancel-registration/", "exact": false, "scopes": ["rsvp:write"] },
  { "method": "PATCH", "path": "/api/v1/event-venues/portal/venues/", "exact": false, "scopes": ["venues:write"] },
  { "method": "PATCH", "path": "/api/v1/events/portal/events/", "exact": false, "scopes": ["events:write"] },
  { "method": "DELETE", "path": "/api/v1/event-venues/portal/venues/", "exact": false, "scopes": ["venues:write"] },
  { "method": "DELETE", "path": "/api/v1/events/portal/events/", "exact": false, "scopes": ["events:write"] }
]
```

- [ ] **Step 2: Write the failing tests**

`tests/scripts/spec.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import policy from "../../spec/route-policy.json";
import { buildReference, filterSpec, parsePolicy, type OpenApi } from "../../scripts/lib/spec";

const SPEC: OpenApi = {
  openapi: "3.1.0",
  info: { title: "edgeos", version: "0.1.0" },
  paths: {
    "/api/v1/events/portal/events": {
      get: {
        summary: "List Portal Events",
        parameters: [
          { name: "popup_id", in: "query", required: false, schema: { type: "string" }, description: "Popup" },
          { name: "event_status", in: "query", schema: { $ref: "#/components/schemas/EventStatus" } },
        ],
        responses: { "200": { content: { "application/json": { schema: { $ref: "#/components/schemas/ListModel" } } } } },
      },
      post: {
        summary: "Create Portal Event",
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/EventCreate" } } } },
      },
    },
    "/api/v1/event-messages/portal/events/{event_id}": { get: { summary: "List Event Messages" } },
    "/api/v1/humans/me": { get: { summary: "Me" } },
  },
  components: {
    schemas: {
      EventStatus: { type: "string", enum: ["draft", "published"] },
      ListModel: { type: "object", properties: { results: { type: "array" } } },
      EventCreate: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string", description: "Event title" },
          visibility: { $ref: "#/components/schemas/EventVisibility" },
          venue_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
      },
      EventVisibility: { type: "string", enum: ["public", "private", "unlisted"] },
      Unused: { type: "object" },
    },
  },
};

describe("filterSpec", () => {
  it("keeps only key-reachable routes and the schemas they reference", () => {
    const f = filterSpec(SPEC, policy);
    expect(Object.keys(f.paths)).toEqual(["/api/v1/events/portal/events"]);
    expect(Object.keys(f.paths["/api/v1/events/portal/events"])).toEqual(["get", "post"]);
    expect(Object.keys(f.components.schemas).sort()).toEqual(["EventCreate", "EventStatus", "EventVisibility", "ListModel"]);
  });
});

describe("buildReference", () => {
  it("documents params, body fields, scopes and enums", () => {
    const ref = buildReference(filterSpec(SPEC, policy), policy);
    const list = ref.routes["GET /events/portal/events"];
    expect(list.scopes).toEqual(["events:read"]);
    expect(list.query.find((q) => q.name === "event_status")).toMatchObject({ type: "EventStatus", enum: ["draft", "published"] });
    const create = ref.routes["POST /events/portal/events"];
    expect(create.scopes).toEqual(["events:write"]);
    expect(create.body.find((b) => b.name === "title")).toMatchObject({ required: true, type: "string", description: "Event title" });
    expect(create.body.find((b) => b.name === "venue_id")?.type).toBe("string | null");
    expect(ref.enums.EventVisibility).toEqual(["public", "private", "unlisted"]);
  });
});

describe("parsePolicy", () => {
  it("reads EdgeOS's _PAT_ROUTE_POLICIES tuples", () => {
    const py = `
_PAT_ROUTE_POLICIES: dict[str, tuple] = {
    "GET": (
        ("/api/v1/events/portal/events", False, ("events:read",)),
        ("/api/v1/popups/portal/list", True, ("events:read",)),
    ),
    "POST": (
        (
            "/api/v1/event-participants/portal/cancel-registration/",
            False,
            ("rsvp:write",),
        ),
    ),
}

def _required_scopes_for_pat(method, path):
    pass
`;
    expect(parsePolicy(py)).toEqual([
      { method: "GET", path: "/api/v1/events/portal/events", exact: false, scopes: ["events:read"] },
      { method: "GET", path: "/api/v1/popups/portal/list", exact: true, scopes: ["events:read"] },
      { method: "POST", path: "/api/v1/event-participants/portal/cancel-registration/", exact: false, scopes: ["rsvp:write"] },
    ]);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm test tests/scripts/spec.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement `scripts/lib/spec.ts`**

```ts
export type PolicyRule = { method: string; path: string; exact: boolean; scopes: string[] };
type Schema = Record<string, unknown>;
type Operation = {
  summary?: string;
  description?: string;
  parameters?: { name: string; in: string; required?: boolean; description?: string; schema?: Schema }[];
  requestBody?: { content?: Record<string, { schema?: Schema }> };
  responses?: Record<string, unknown>;
};
export type OpenApi = {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: Record<string, Schema> };
};
export type ParamDoc = { name: string; required: boolean; type: string; description: string; enum?: string[] };
export type RouteDoc = { method: string; path: string; summary: string; scopes: string[]; query: ParamDoc[]; body: ParamDoc[] };
export type Reference = { version: string; routes: Record<string, RouteDoc>; enums: Record<string, string[]> };

const METHODS = ["get", "post", "patch", "put", "delete"];
const PREFIX = "/api/v1";

export function policyFor(policy: PolicyRule[], method: string, path: string): PolicyRule | undefined {
  return policy.find((r) => r.method === method.toUpperCase() && (r.exact ? path === r.path : path.startsWith(r.path)));
}

function refName(s: Schema | undefined): string | undefined {
  const ref = s?.$ref;
  return typeof ref === "string" ? ref.split("/").pop() : undefined;
}

function collectRefs(node: unknown, out: Set<string>, schemas: Record<string, Schema>): void {
  if (Array.isArray(node)) {
    for (const n of node) collectRefs(n, out, schemas);
    return;
  }
  if (!node || typeof node !== "object") return;
  for (const [k, v] of Object.entries(node)) {
    if (k === "$ref" && typeof v === "string") {
      const name = v.split("/").pop() as string;
      if (!out.has(name)) {
        out.add(name);
        collectRefs(schemas[name], out, schemas);
      }
    } else collectRefs(v, out, schemas);
  }
}

export function filterSpec(spec: OpenApi, policy: PolicyRule[]): OpenApi {
  const paths: OpenApi["paths"] = {};
  for (const [path, ops] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(ops)) {
      if (!METHODS.includes(method) || !policyFor(policy, method, path)) continue;
      paths[path] ??= {};
      paths[path][method] = op;
    }
  }
  const used = new Set<string>();
  collectRefs(paths, used, spec.components.schemas);
  const schemas = Object.fromEntries(Object.entries(spec.components.schemas).filter(([n]) => used.has(n)));
  return { openapi: spec.openapi, info: spec.info, paths, components: { schemas } };
}

function typeOf(s: Schema | undefined): string {
  if (!s) return "unknown";
  const r = refName(s);
  if (r) return r;
  if (Array.isArray(s.anyOf)) return (s.anyOf as Schema[]).map(typeOf).join(" | ");
  if (s.type === "array") return `${typeOf(s.items as Schema)}[]`;
  return String(s.type ?? "unknown");
}

function enumOf(s: Schema | undefined, schemas: Record<string, Schema>): string[] | undefined {
  if (!s) return undefined;
  if (Array.isArray(s.enum)) return s.enum as string[];
  const r = refName(s);
  if (r && Array.isArray(schemas[r]?.enum)) return schemas[r].enum as string[];
  if (Array.isArray(s.anyOf)) for (const a of s.anyOf as Schema[]) { const e = enumOf(a, schemas); if (e) return e; }
  return undefined;
}

function bodyFields(op: Operation, schemas: Record<string, Schema>): ParamDoc[] {
  const raw = op.requestBody?.content?.["application/json"]?.schema;
  let s = raw;
  const r = refName(raw) ?? (Array.isArray(raw?.anyOf) ? (raw.anyOf as Schema[]).map(refName).find(Boolean) : undefined);
  if (r) s = schemas[r];
  const props = (s?.properties ?? {}) as Record<string, Schema>;
  const required = new Set((s?.required as string[]) ?? []);
  return Object.entries(props).map(([name, p]) => ({
    name,
    required: required.has(name),
    type: typeOf(p),
    description: String(p.description ?? ""),
    ...(enumOf(p, schemas) ? { enum: enumOf(p, schemas) } : {}),
  }));
}

export function buildReference(spec: OpenApi, policy: PolicyRule[]): Reference {
  const routes: Reference["routes"] = {};
  const schemas = spec.components.schemas;
  for (const [path, ops] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(ops)) {
      const rule = policyFor(policy, method, path);
      if (!rule) continue;
      const short = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : path;
      routes[`${method.toUpperCase()} ${short}`] = {
        method: method.toUpperCase(),
        path: short,
        summary: op.summary ?? "",
        scopes: rule.scopes.filter((s) => s !== "venues:read"),
        query: (op.parameters ?? [])
          .filter((p) => p.in === "query")
          .map((p) => ({
            name: p.name,
            required: Boolean(p.required),
            type: typeOf(p.schema),
            description: p.description ?? "",
            ...(enumOf(p.schema, schemas) ? { enum: enumOf(p.schema, schemas) } : {}),
          })),
        body: bodyFields(op, schemas),
      };
    }
  }
  const enums = Object.fromEntries(
    Object.entries(schemas).filter(([, s]) => Array.isArray(s.enum)).map(([n, s]) => [n, s.enum as string[]]),
  );
  return { version: spec.info.version, routes, enums };
}

export function parsePolicy(py: string): PolicyRule[] {
  const block = py.match(/_PAT_ROUTE_POLICIES[^=]*=\s*\{([\s\S]*?)\n\}/);
  if (!block) throw new Error("_PAT_ROUTE_POLICIES not found");
  const rules: PolicyRule[] = [];
  const methodRe = /"(GET|POST|PATCH|PUT|DELETE)"\s*:\s*\(([\s\S]*?)\n\s{4}\),/g;
  for (const m of block[1].matchAll(methodRe)) {
    const tupleRe = /\(\s*"([^"]+)"\s*,\s*(True|False)\s*,\s*\(([^)]*)\)\s*,?\s*\)/g;
    for (const t of m[2].matchAll(tupleRe)) {
      rules.push({
        method: m[1],
        path: t[1],
        exact: t[2] === "True",
        scopes: [...t[3].matchAll(/"([^"]+)"/g)].map((s) => s[1]),
      });
    }
  }
  return rules;
}

export function renderReferenceModule(ref: Reference): string {
  return `// Generated by scripts/gen-reference.ts from spec/edgeos-openapi.json. Do not edit.
export type ParamDoc = { name: string; required: boolean; type: string; description: string; enum?: string[] };
export type RouteDoc = { method: string; path: string; summary: string; scopes: string[]; query: ParamDoc[]; body: ParamDoc[] };
export const SPEC_VERSION = ${JSON.stringify(ref.version)};
export const ROUTES: Record<string, RouteDoc> = ${JSON.stringify(ref.routes, null, 2)};
export const ENUMS: Record<string, string[]> = ${JSON.stringify(ref.enums, null, 2)};
`;
}

export function renderGuidesModule(guides: Record<string, string>): string {
  return `// Generated by scripts/gen-reference.ts from guides/*.md. Do not edit.
export const GUIDES = ${JSON.stringify(guides, null, 2)} as const;
export type GuideTopic = keyof typeof GUIDES;
`;
}
```

- [ ] **Step 5: Implement the scripts**

`scripts/gen-reference.ts`:

```ts
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildReference, type OpenApi, type PolicyRule, renderGuidesModule, renderReferenceModule } from "./lib/spec";

const root = path.resolve(import.meta.dirname, "..");
const spec = JSON.parse(readFileSync(path.join(root, "spec/edgeos-openapi.json"), "utf-8")) as OpenApi;
const policy = JSON.parse(readFileSync(path.join(root, "spec/route-policy.json"), "utf-8")) as PolicyRule[];

writeFileSync(path.join(root, "src/generated/reference.ts"), renderReferenceModule(buildReference(spec, policy)));

const guides = Object.fromEntries(
  readdirSync(path.join(root, "guides"))
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => [f.replace(/\.md$/, ""), readFileSync(path.join(root, "guides", f), "utf-8").trim()]),
);
writeFileSync(path.join(root, "src/generated/guides.ts"), renderGuidesModule(guides));
console.log(`Generated reference (${Object.keys(buildReference(spec, policy).routes).length} routes) and ${Object.keys(guides).length} guides.`);
```

`scripts/spec-sync.ts`:

```ts
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { filterSpec, type OpenApi, type PolicyRule } from "./lib/spec";

const root = path.resolve(import.meta.dirname, "..");
const base = (process.env.EDGEOS_API_BASE ?? "https://api.edgeos.world").replace(/\/+$/, "");
const res = await fetch(`${base}/openapi.json`);
if (!res.ok) throw new Error(`openapi.json returned ${res.status}`);
const spec = (await res.json()) as OpenApi;
const policy = JSON.parse(readFileSync(path.join(root, "spec/route-policy.json"), "utf-8")) as PolicyRule[];
writeFileSync(path.join(root, "spec/edgeos-openapi.json"), `${JSON.stringify(filterSpec(spec, policy), null, 2)}\n`);
execFileSync("pnpm", ["spec:gen"], { stdio: "inherit", cwd: root, shell: process.platform === "win32" });
```

`scripts/policy-check.ts`:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { parsePolicy, type PolicyRule } from "./lib/spec";

const URL_PY = "https://raw.githubusercontent.com/p2p-lanes/edgeos-monorepo/main/backend/app/core/security.py";
const root = path.resolve(import.meta.dirname, "..");
const res = await fetch(URL_PY);
if (!res.ok) throw new Error(`security.py returned ${res.status}`);
const upstream = parsePolicy(await res.text());
const local = JSON.parse(readFileSync(path.join(root, "spec/route-policy.json"), "utf-8")) as PolicyRule[];
const norm = (r: PolicyRule[]) => JSON.stringify([...r].sort((a, b) => `${a.method}${a.path}`.localeCompare(`${b.method}${b.path}`)));
if (norm(upstream) !== norm(local)) {
  console.error("EdgeOS API-key route policy changed upstream. Update spec/route-policy.json:");
  console.error(JSON.stringify(upstream, null, 2));
  process.exit(1);
}
console.log("Route policy matches upstream.");
```

- [ ] **Step 6: Write the guides**

`guides/schedule.md`:

```md
# Reading the schedule

- Always give `edgeos_list_events` a date range. "Today", "tomorrow" and "this weekend" are India dates: pass `from` as the IST date (YYYY-MM-DD) and `days`.
- Times come back already converted to IST. Quote them as given, with "IST". Never convert again and never read the UTC value out loud.
- Group answers by day. For each event give the time, title and venue, and say if the attendee already RSVPed.
- `highlighted_only` shows the events organisers featured.
- An event with `require_approval` needs the host to accept the RSVP; say so.
- Results come from EdgeOS live. Don't fill gaps from memory.
```

`guides/recurring.md`:

```md
# Recurring events

- A recurring series expands into one row per occurrence when you list a date range. Each row carries `occurrence_start`.
- To RSVP or cancel for one occurrence, pass that row's `occurrence_start` exactly as returned.
- Participant lists for recurring events must name the occurrence; without it the list is usually empty or short, which does not mean nobody is going.
```

`guides/rsvp.md`:

```md
# RSVPs

- Every RSVP and cancellation goes through `edgeos_propose` with action `rsvp` or `cancel_rsvp`, one event at a time.
- Show the attendee the summary from the proposal word for word, raise every warning, and wait for an explicit yes ("yes", "go ahead", "confirm"). Earlier intent ("RSVP me to anything about AI") is not a yes.
- Then call `edgeos_confirm` with the proposal code. If the attendee changes anything, propose again.
- To see their RSVPs, list events with `mine: true` for a date range.
```

`guides/hosting.md`:

```md
# Hosting events

A good village event has:
- A clear title that says what happens, not just a theme.
- A description of a few sentences: what people will do, who it's for, what to bring.
- A real place: a venue from `edgeos_list_venues`, or a custom location name and map link.
- A start and end time in IST, written with the +05:30 offset (e.g. 2026-10-14T18:30:00+05:30). Most events run 30 minutes to 3 hours.
- A capacity only when the space or activity needs one.

Before proposing:
- Check the venue is free with `edgeos_venue_availability` for that day.
- Ask the attendee for anything missing rather than inventing it.
- Changes and cancellations notify nobody automatically through this server; tell the attendee to message their attendees if plans change.
```

`guides/venues.md`:

```md
# Venues

- `edgeos_list_venues` lists the popup's active venues with capacity and booking mode.
- `edgeos_venue_availability` shows open hours and busy slots for a day, in IST.
- Creating, editing or deleting a venue needs a key with "Manage venues". Attendees can only change venues they own.
```

`guides/limits.md`:

```md
# What this server can't do

EdgeOS doesn't let API keys reach these, so say "not available here" and point the attendee to the Edge City portal:
- Messages to an event's attendees
- Check-in and attendance
- Admin notes and attendance mode
- The attendee directory and anyone's profile, including the attendee's own
- Session recordings or transcripts (EdgeOS doesn't have them)

Never ask for or accept an EdgeOS key in chat. If the attendee's key stops working, they reconnect from their app.
```

- [ ] **Step 7: Run sync and generation**

Run: `pnpm test tests/scripts/spec.test.ts && pnpm spec:sync && pnpm policy:check`
Expected: tests PASS; `spec/edgeos-openapi.json`, `src/generated/reference.ts`, `src/generated/guides.ts` written; "Route policy matches upstream." `src/generated/reference.ts` contains the key `"GET /events/portal/events"`.

- [ ] **Step 8: Commit**

```bash
git add spec scripts guides src/generated tests/scripts
git commit -m "feat(spec): filtered EdgeOS spec snapshot, generated reference and guides

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Gateway (`edgeos_initialize`), guide tool and read tools

**Files:**
- Create: `src/mcp/initialize.ts`, `src/mcp/guide.ts`, `src/mcp/tools/format.ts`, `src/mcp/tools/read.ts`
- Modify: `src/mcp/server.ts` (replace the placeholder gateway)
- Test: `tests/mcp/initialize.test.ts`, `tests/mcp/read.test.ts`

**Interfaces:**
- Consumes: `edgeos`, types, time helpers, `withToolHandler`, `ok`, `ToolError`, `ContextSection`, `composeSections`, `GUIDES`, `ROUTES`.
- Produces:
  - `buildInitialize(access: Access, now: Date, sections: ContextSection[]): string`; `registerInitialize(server: McpServer, access: Access, now: Date, sections: ContextSection[]): void`
  - `guideFor(topic: GuideTopic): string`; `registerGuide(server, access): void`
  - `readContextSection: ContextSection`; `registerReadTools(server: McpServer, access: Access, now: Date): void`
  - `format.ts`: `eventLine(e: EdgeEvent, venues: Map<string, string>): string`, `eventRow(e: EdgeEvent, venues: Map<string, string>): Record<string, unknown>`, `groupByIstDay(events: EdgeEvent[]): [string, EdgeEvent[]][]`, `rangeText(r: TimeRange): string`
  - Tool names: `edgeos_list_events`, `edgeos_get_event`, `edgeos_calendar_summary`, `edgeos_list_participants`, `edgeos_rsvp_eligibility`, `edgeos_list_invitations`, `edgeos_list_tracks`, `edgeos_track_events`, `edgeos_list_venues`, `edgeos_venue_availability`

- [ ] **Step 1: Write the failing tests**

`tests/mcp/initialize.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildInitialize } from "@/mcp/initialize";
import { readContextSection } from "@/mcp/tools/read";
import { TEST_ACCESS, useTestSecrets } from "../helpers";

useTestSecrets();
const NOW = new Date("2026-10-14T06:00:00Z");

describe("edgeos_initialize", () => {
  it("names the popup, the IST date and the scopes", () => {
    const text = buildInitialize(TEST_ACCESS, NOW, [readContextSection]);
    expect(text).toContain("Edge City India");
    expect(text).toContain("Wed 14 Oct, 11:30 AM IST");
    expect(text).toContain("events:read, rsvp:write");
    expect(text).toContain("edgeos_list_events");
  });

  it("lists what EdgeOS doesn't offer", () => {
    expect(buildInitialize(TEST_ACCESS, NOW, [])).toContain("attendee directory");
  });

  it("explains missing write scopes and where to get them", () => {
    const text = buildInitialize({ ...TEST_ACCESS, scopes: ["events:read"] }, NOW, []);
    expect(text).toContain("can't RSVP");
    expect(text).toContain("/portal/agentic-access");
  });
});
```

`tests/mcp/read.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { accessToken, useTestSecrets } from "../helpers";
import { mockEdgeos } from "../edgeos-mock";
import { connectClient } from "../mcp-client";

useTestSecrets();
vi.useFakeTimers({ toFake: ["Date"] });
vi.setSystemTime(new Date("2026-10-14T06:00:00Z"));

const EVENT = {
  id: "e1", popup_id: "ind", title: "Sunset Breathwork", content: "Breathe.", start_time: "2026-10-14T13:00:00Z", end_time: "2026-10-14T14:00:00Z",
  timezone: "Asia/Kolkata", venue_id: "v1", custom_location_name: null, custom_location_url: null, meeting_url: null, max_participant: 20,
  tags: ["wellness"], kind: null, track_id: null, visibility: "public", status: "published", highlighted: true, host_display_name: "Asha",
  require_approval: false, rrule: null, recurrence_master_id: null, my_rsvp_status: "registered", attendee_count: 12,
};
const VENUES = { results: [{ id: "v1", title: "Beach Deck", description: null, location: "Riva Beach", capacity: 40, booking_mode: "free", status: "active", tags: [] }], paging: { limit: 100, offset: 0, total: 1 } };

const text = (r: { content: unknown }) => (r.content as { text: string }[])[0].text;

describe("read tools", () => {
  it("lists events for an IST window with local times and venue names", async () => {
    const m = mockEdgeos([
      { method: "GET", path: "/events/portal/events", body: { results: [EVENT], paging: { limit: 1, offset: 0, total: 1 } } },
      { method: "GET", path: "/event-venues/portal/venues", body: VENUES },
    ]);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({ name: "edgeos_list_events", arguments: { from: "2026-10-14", days: 1 } });
    expect(text(r)).toContain("Wed 14 Oct");
    expect(text(r)).toContain("6:30 PM – 7:30 PM");
    expect(text(r)).toContain("Beach Deck");
    expect(text(r)).toContain("RSVP: registered");
    const q = m.calls.find((c) => c.url.pathname.endsWith("/events/portal/events"))!.url.searchParams;
    expect(q.get("popup_id")).toBe("ind");
    expect(q.get("event_status")).toBe("published");
    expect(q.get("start_after")).toBe("2026-10-13T18:30:00.000Z");
    expect(q.get("start_before")).toBe("2026-10-14T18:30:00.000Z");
  });

  it("defaults to the next 7 IST days", async () => {
    const m = mockEdgeos([
      { method: "GET", path: "/events/portal/events", body: { results: [], paging: { limit: 0, offset: 0, total: 0 } } },
      { method: "GET", path: "/event-venues/portal/venues", body: VENUES },
    ]);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({ name: "edgeos_list_events", arguments: {} });
    expect(text(r)).toContain("No events");
    const q = m.calls[0].url.searchParams;
    expect(q.get("start_before")).toBe("2026-10-20T18:30:00.000Z");
  });

  it("gets one event with attendee count", async () => {
    mockEdgeos([
      { method: "GET", path: "/events/portal/events/e1", body: EVENT },
      { method: "GET", path: "/event-venues/portal/venues", body: VENUES },
    ]);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({ name: "edgeos_get_event", arguments: { event_id: "e1" } });
    expect(text(r)).toContain("12 going (max 20)");
    expect(text(r)).toContain("Host: Asha");
  });

  it("only registers read tools the key allows", async () => {
    mockEdgeos([]);
    const client = await connectClient(await accessToken({ scopes: ["events:read"] }));
    const names = (await client.listTools()).tools.map((t) => t.name);
    expect(names).toContain("edgeos_list_events");
    expect(names).not.toContain("edgeos_propose");
  });

  it("returns a helpful error when EdgeOS rejects the key", async () => {
    mockEdgeos([{ method: "GET", path: "/events/portal/events", status: 401, body: { detail: "expired" } }, { method: "GET", path: "/event-venues/portal/venues", body: VENUES }]);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({ name: "edgeos_list_events", arguments: {} });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("AUTH_EXPIRED");
  });

  it("rejects a malformed date", async () => {
    mockEdgeos([]);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({ name: "edgeos_list_events", arguments: { from: "14/10/2026" } });
    expect(r.isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/mcp/initialize.test.ts tests/mcp/read.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement formatting helpers `src/mcp/tools/format.ts`**

```ts
import type { EdgeEvent, TimeRange } from "@/lib/edgeos/types";
import { isRecurring } from "@/lib/edgeos/types";
import { formatIst, formatIstRange, formatIstTime, istDate, istDayLabel } from "@/lib/time";

export function groupByIstDay(events: EdgeEvent[]): [string, EdgeEvent[]][] {
  const days = new Map<string, EdgeEvent[]>();
  for (const e of [...events].sort((a, b) => a.start_time.localeCompare(b.start_time))) {
    const d = istDate(new Date(e.start_time));
    days.set(d, [...(days.get(d) ?? []), e]);
  }
  return [...days.entries()];
}

function place(e: EdgeEvent, venues: Map<string, string>): string {
  if (e.venue_id) return venues.get(e.venue_id) ?? "venue";
  return e.custom_location_name ?? (e.meeting_url ? "online" : "no venue set");
}

export function eventLine(e: EdgeEvent, venues: Map<string, string>): string {
  const bits = [
    `${formatIstTime(e.start_time)} – ${formatIstTime(e.end_time)}`,
    `**${e.title}**`,
    place(e, venues),
  ];
  if (e.highlighted) bits.push("featured");
  if (e.my_rsvp_status) bits.push(`RSVP: ${e.my_rsvp_status}`);
  let line = `- ${bits.join(" · ")} · id \`${e.id}\``;
  if (isRecurring(e)) line += ` · occurrence_start \`${e.start_time}\``;
  return line;
}

export function eventRow(e: EdgeEvent, venues: Map<string, string>): Record<string, unknown> {
  return {
    id: e.id,
    title: e.title,
    start_time: e.start_time,
    end_time: e.end_time,
    when_ist: formatIstRange(e.start_time, e.end_time),
    place: place(e, venues),
    venue_id: e.venue_id,
    my_rsvp_status: e.my_rsvp_status ?? null,
    highlighted: e.highlighted,
    tags: e.tags,
    recurring: isRecurring(e),
    occurrence_start: isRecurring(e) ? e.start_time : null,
  };
}

export function eventsMarkdown(events: EdgeEvent[], venues: Map<string, string>): string {
  if (events.length === 0) return "No events in this window.";
  return groupByIstDay(events)
    .map(([day, list]) => `### ${istDayLabel(day)}\n${list.map((e) => eventLine(e, venues)).join("\n")}`)
    .join("\n\n");
}

export function rangeText(r: TimeRange): string {
  const start = r.start ?? r.start_time;
  const end = r.end ?? r.end_time;
  return start && end ? formatIstRange(start, end) : JSON.stringify(r);
}

export { formatIst };
```

- [ ] **Step 4: Implement `src/mcp/tools/read.ts`**

```ts
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { edgeos } from "@/lib/edgeos/client";
import type { DayEventCount, EdgeEvent, ListModel, Participant, RsvpEligibility, Track, Venue, VenueAvailability } from "@/lib/edgeos/types";
import { formatIstRange, istDate, istDayLabel, istDayWindow } from "@/lib/time";
import { type Access, hasScope } from "@/lib/types";
import type { ContextSection } from "@/mcp/lib/context";
import { ok } from "@/mcp/lib/result";
import { withToolHandler } from "@/mcp/lib/tool-wrapper";
import { eventRow, eventsMarkdown, rangeText } from "./format";

const RO = { readOnlyHint: true, openWorldHint: true } as const;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use an India date as YYYY-MM-DD");
const uuid = z.string().min(1);

export const readContextSection: ContextSection = (a) =>
  hasScope(a, "events:read")
    ? `## Schedule (read)
- \`edgeos_list_events\`: events for India dates (\`from\` YYYY-MM-DD, \`days\` 1–31, default next 7 days). Filters: search, tags, kind, venue_id, track_ids, mine (my RSVPs), managed (events I host), highlighted_only.
- \`edgeos_get_event\`: one event with description, host, attendee count and my RSVP status. Pass \`occurrence_start\` for one occurrence of a recurring event.
- \`edgeos_calendar_summary\`: how many events per day.
- \`edgeos_list_participants\`: who is going to one event (host and hidden attendees aren't listed).
- \`edgeos_rsvp_eligibility\`: whether this attendee may RSVP at all.
- \`edgeos_list_tracks\`, \`edgeos_track_events\`: programme tracks.
- \`edgeos_list_venues\`, \`edgeos_venue_availability\`: places and when they're free.
- \`edgeos_list_invitations\`: invitations on an event the attendee hosts.
Times come back in IST already. Quote them as given.`
    : null;

async function venueNames(access: Access): Promise<Map<string, string>> {
  const v = await edgeos<ListModel<Venue>>(access.key, "GET", "/event-venues/portal/venues", {
    query: { popup_id: access.popup.id, limit: 1000 },
  });
  return new Map(v.results.map((x) => [x.id, x.title]));
}

export function registerReadTools(server: McpServer, access: Access, now: Date): void {
  if (!hasScope(access, "events:read")) return;
  const today = istDate(now);

  server.registerTool(
    "edgeos_list_events",
    {
      title: "List events",
      description: "List published events in an India-date window, grouped by day, with IST times, venue, and the attendee's RSVP status.",
      inputSchema: z.object({
        from: isoDate.optional().describe("First India date, YYYY-MM-DD. Defaults to today in IST."),
        days: z.number().int().min(1).max(31).optional().describe("Number of days, default 7."),
        search: z.string().optional().describe("Words in the title."),
        tags: z.array(z.string()).optional().describe("Match any of these tags."),
        kind: z.string().optional(),
        venue_id: z.string().optional(),
        track_ids: z.array(z.string()).optional(),
        mine: z.boolean().optional().describe("Only events this attendee RSVPed to."),
        managed: z.boolean().optional().describe("Only events this attendee hosts or co-hosts."),
        highlighted_only: z.boolean().optional().describe("Only events organisers featured."),
      }),
      annotations: RO,
    },
    withToolHandler("edgeos_list_events", access, async (p) => {
      const w = istDayWindow(p.from ?? today, p.days ?? 7);
      const [list, venues] = await Promise.all([
        edgeos<ListModel<EdgeEvent>>(access.key, "GET", "/events/portal/events", {
          query: {
            popup_id: access.popup.id,
            event_status: "published",
            start_after: w.startAfter,
            start_before: w.startBefore,
            search: p.search,
            tags: p.tags,
            kind: p.kind,
            venue_id: p.venue_id,
            track_ids: p.track_ids,
            rsvped_only: p.mine || undefined,
            managed_only: p.managed || undefined,
          },
        }),
        venueNames(access),
      ]);
      const events = p.highlighted_only ? list.results.filter((e) => e.highlighted) : list.results;
      const header = `Events from ${istDayLabel(p.from ?? today)} for ${p.days ?? 7} day(s), times in IST:\n\n`;
      return ok(header + eventsMarkdown(events, venues), { events: events.map((e) => eventRow(e, venues)) });
    }),
  );

  server.registerTool(
    "edgeos_get_event",
    {
      title: "Get event",
      description: "One event in full: description, IST time, place, host, attendee count and the attendee's RSVP status.",
      inputSchema: z.object({
        event_id: uuid,
        occurrence_start: z.string().optional().describe("For a recurring event, the occurrence's start_time exactly as listed."),
      }),
      annotations: RO,
    },
    withToolHandler("edgeos_get_event", access, async (p) => {
      const [e, venues] = await Promise.all([
        edgeos<EdgeEvent>(access.key, "GET", `/events/portal/events/${p.event_id}`, { query: { occurrence_start: p.occurrence_start } }),
        venueNames(access),
      ]);
      const lines = [
        `## ${e.title}`,
        formatIstRange(e.start_time, e.end_time),
        `Place: ${e.venue_id ? venues.get(e.venue_id) ?? "venue" : e.custom_location_name ?? "not set"}${e.custom_location_url ? ` (${e.custom_location_url})` : ""}`,
        e.host_display_name ? `Host: ${e.host_display_name}` : null,
        `${e.attendee_count ?? 0} going${e.max_participant ? ` (max ${e.max_participant})` : ""}`,
        `Your RSVP: ${e.my_rsvp_status ?? "none"}`,
        e.require_approval ? "The host approves each RSVP." : null,
        e.tags.length ? `Tags: ${e.tags.join(", ")}` : null,
        e.meeting_url ? `Online: ${e.meeting_url}` : null,
        "",
        (e.content ?? "No description.").slice(0, 2000),
      ].filter((l) => l !== null);
      return ok(lines.join("\n"), { event: { ...eventRow(e, venues), attendee_count: e.attendee_count ?? 0, max_participant: e.max_participant, content: e.content } });
    }),
  );

  server.registerTool(
    "edgeos_calendar_summary",
    {
      title: "Events per day",
      description: "How many published events fall on each India day in a window.",
      inputSchema: z.object({ from: isoDate.optional(), days: z.number().int().min(1).max(31).optional() }),
      annotations: RO,
    },
    withToolHandler("edgeos_calendar_summary", access, async (p) => {
      const w = istDayWindow(p.from ?? today, p.days ?? 14);
      const days = await edgeos<DayEventCount[]>(access.key, "GET", "/events/portal/events/calendar-summary", {
        query: { popup_id: access.popup.id, start_after: w.startAfter, start_before: w.startBefore },
      });
      const text = days.length ? days.map((d) => `- ${/^\d{4}-\d{2}-\d{2}/.test(d.day) ? istDayLabel(d.day.slice(0, 10)) : d.day}: ${d.count}`).join("\n") : "No events in this window.";
      return ok(text, { days });
    }),
  );

  server.registerTool(
    "edgeos_list_participants",
    {
      title: "Who's going",
      description: "People who RSVPed to one event. The host and attendees who hide their name aren't listed. For a recurring event pass occurrence_start.",
      inputSchema: z.object({ event_id: uuid, occurrence_start: z.string().optional() }),
      annotations: RO,
    },
    withToolHandler("edgeos_list_participants", access, async (p) => {
      const rows: Participant[] = [];
      for (let skip = 0; skip < 5000; skip += 1000) {
        const page = await edgeos<ListModel<Participant>>(access.key, "GET", "/event-participants/portal/participants", {
          query: { event_id: p.event_id, occurrence_start: p.occurrence_start, skip, limit: 1000 },
        });
        rows.push(...page.results);
        if (skip + page.results.length >= page.paging.total || page.results.length === 0) break;
      }
      const going = rows.filter((r) => r.status !== "cancelled");
      const names = going.map((r) => `- ${[r.first_name, r.last_name].filter(Boolean).join(" ") || "(name hidden)"} · ${r.status}`);
      return ok(going.length ? `${going.length} going:\n${names.join("\n")}` : "Nobody listed yet.", { participants: going });
    }),
  );

  server.registerTool(
    "edgeos_rsvp_eligibility",
    {
      title: "Can I RSVP?",
      description: "Whether this attendee is allowed to RSVP to events in the popup, and why not if they can't.",
      inputSchema: z.object({}),
      annotations: RO,
    },
    withToolHandler("edgeos_rsvp_eligibility", access, async () => {
      const r = await edgeos<RsvpEligibility>(access.key, "GET", `/event-participants/portal/eligibility/${access.popup.id}`);
      return ok(r.allowed ? "Yes, this attendee can RSVP." : `No: ${r.reason ?? "EdgeOS gave no reason."}`, r);
    }),
  );

  server.registerTool(
    "edgeos_list_invitations",
    {
      title: "Event invitations",
      description: "Invitations on an event the attendee hosts.",
      inputSchema: z.object({ event_id: uuid }),
      annotations: RO,
    },
    withToolHandler("edgeos_list_invitations", access, async (p) => {
      const r = await edgeos<unknown>(access.key, "GET", `/events/portal/events/${p.event_id}/invitations`);
      const list = (Array.isArray(r) ? r : ((r as { results?: unknown[] })?.results ?? [])) as Record<string, unknown>[];
      const lines = list.map((i) => `- ${String(i.email ?? i.invitee_email ?? i.id)}${i.status ? ` · ${String(i.status)}` : ""}`);
      return ok(lines.length ? lines.join("\n") : "No invitations.", { invitations: list });
    }),
  );

  server.registerTool(
    "edgeos_list_tracks",
    {
      title: "Programme tracks",
      description: "The popup's programme tracks.",
      inputSchema: z.object({ search: z.string().optional() }),
      annotations: RO,
    },
    withToolHandler("edgeos_list_tracks", access, async (p) => {
      const r = await edgeos<ListModel<Track>>(access.key, "GET", "/tracks/portal/tracks", {
        query: { popup_id: access.popup.id, search: p.search, limit: 1000 },
      });
      return ok(r.results.map((t) => `- **${t.name}** · id \`${t.id}\`${t.description ? `: ${t.description}` : ""}`).join("\n") || "No tracks.", { tracks: r.results });
    }),
  );

  server.registerTool(
    "edgeos_track_events",
    {
      title: "Track events",
      description: "Events in one programme track, with IST times.",
      inputSchema: z.object({ track_id: uuid }),
      annotations: RO,
    },
    withToolHandler("edgeos_track_events", access, async (p) => {
      const [r, venues] = await Promise.all([
        edgeos<ListModel<EdgeEvent>>(access.key, "GET", `/tracks/portal/tracks/${p.track_id}/events`, { query: { limit: 1000 } }),
        venueNames(access),
      ]);
      return ok(eventsMarkdown(r.results, venues), { events: r.results.map((e) => eventRow(e, venues)) });
    }),
  );

  server.registerTool(
    "edgeos_list_venues",
    {
      title: "Venues",
      description: "Active venues in the popup with capacity and location.",
      inputSchema: z.object({ search: z.string().optional() }),
      annotations: RO,
    },
    withToolHandler("edgeos_list_venues", access, async (p) => {
      const r = await edgeos<ListModel<Venue>>(access.key, "GET", "/event-venues/portal/venues", {
        query: { popup_id: access.popup.id, search: p.search, limit: 1000 },
      });
      const lines = r.results.map((v) => `- **${v.title}** · ${v.location ?? "no address"}${v.capacity ? ` · up to ${v.capacity}` : ""} · ${v.booking_mode} · id \`${v.id}\``);
      return ok(lines.join("\n") || "No venues.", { venues: r.results });
    }),
  );

  server.registerTool(
    "edgeos_venue_availability",
    {
      title: "Venue availability",
      description: "Open hours and busy slots for one venue on India dates, in IST.",
      inputSchema: z.object({ venue_id: uuid, date: isoDate.optional(), days: z.number().int().min(1).max(7).optional() }),
      annotations: RO,
    },
    withToolHandler("edgeos_venue_availability", access, async (p) => {
      const w = istDayWindow(p.date ?? today, p.days ?? 1);
      const r = await edgeos<VenueAvailability>(access.key, "GET", `/event-venues/portal/venues/${p.venue_id}/availability`, {
        query: { start: w.startAfter, end: w.startBefore },
      });
      const open = r.open_ranges.map((x) => `- open ${rangeText(x)}`);
      const busy = r.busy.map((x) => `- busy ${rangeText(x)}`);
      return ok([...open, ...busy].join("\n") || "No opening hours set for this window.", r);
    }),
  );
}
```

- [ ] **Step 5: Implement the gateway and guide**

`src/mcp/initialize.ts`:

```ts
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { agenticAccessUrl } from "@/lib/env";
import { formatIst } from "@/lib/time";
import { type Access, hasScope } from "@/lib/types";
import { type ContextSection, composeSections } from "./lib/context";
import { ok } from "./lib/result";
import { withToolHandler } from "./lib/tool-wrapper";

export const RULES = `## Rules
1. Never fabricate. If a tool didn't return it, say you don't know.
2. Times are India time (IST). Tools already convert; quote them as given.
3. Every change goes through \`edgeos_propose\`, then \`edgeos_confirm\` only after an explicit yes to the summary.
4. Never ask for the attendee's EdgeOS key in chat.
5. For depth on any area, call \`edgeos_guide\` with a topic: schedule, recurring, rsvp, hosting, venues, limits.`;

export const NOT_AVAILABLE = `## Not available here
EdgeOS doesn't let API keys reach these, so say so and point to the Edge City portal: messages to attendees, check-in and attendance, the attendee directory, anyone's profile, admin notes. EdgeOS has no recordings or transcripts.`;

function missing(access: Access): string | null {
  const lines: string[] = [];
  if (!hasScope(access, "rsvp:write")) lines.push("- This key can't RSVP (no “RSVP to events”).");
  if (!hasScope(access, "events:write")) lines.push("- This key can't host or edit events (no “Create events”).");
  if (!hasScope(access, "venues:write")) lines.push("- This key can't manage venues (no “Manage venues”).");
  if (!lines.length) return null;
  return `## Not enabled on this key\n${lines.join("\n")}\nIf the attendee wants these, they can make a new key at ${agenticAccessUrl()} with those boxes ticked, then reconnect.`;
}

export function buildInitialize(access: Access, now: Date, sections: ContextSection[]): string {
  const p = access.popup;
  const header = `# ${p.name}${p.startDate && p.endDate ? ` (${p.startDate} to ${p.endDate})` : ""}
Now: ${formatIst(now.toISOString())}
This key can: ${access.scopes.join(", ")}`;
  return [header, RULES, composeSections(access, sections), missing(access), NOT_AVAILABLE].filter(Boolean).join("\n\n");
}

export function registerInitialize(server: McpServer, access: Access, now: Date, sections: ContextSection[]): void {
  server.registerTool(
    "edgeos_initialize",
    {
      title: "Start here",
      description: "Call first in every conversation. Returns today's date in IST, what this attendee's key allows, the rules, and which tools to use.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    withToolHandler("edgeos_initialize", access, async () => ok(buildInitialize(access, now, sections))),
  );
}
```

`src/mcp/guide.ts`:

```ts
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { GUIDES, type GuideTopic } from "@/generated/guides";
import { ROUTES } from "@/generated/reference";
import type { Access } from "@/lib/types";
import { ok } from "./lib/result";
import { withToolHandler } from "./lib/tool-wrapper";

export const TOPIC_ROUTES: Record<GuideTopic, string[]> = {
  schedule: ["GET /events/portal/events", "GET /events/portal/events/{event_id}"],
  recurring: ["GET /events/portal/events", "GET /event-participants/portal/participants"],
  rsvp: ["POST /event-participants/portal/register/{event_id}", "POST /event-participants/portal/cancel-registration/{event_id}"],
  hosting: ["POST /events/portal/events", "PATCH /events/portal/events/{event_id}", "POST /events/portal/events/check-availability"],
  venues: ["GET /event-venues/portal/venues", "POST /event-venues/portal/venues", "PATCH /event-venues/portal/venues/{venue_id}"],
  limits: [],
};

function routeTable(key: string): string {
  const r = ROUTES[key];
  if (!r) return "";
  const fields = [...r.query, ...r.body]
    .map((f) => `| ${f.name}${f.required ? " *" : ""} | ${f.type}${f.enum ? ` (${f.enum.join(", ")})` : ""} | ${f.description.replace(/\|/g, "/").replace(/\n/g, " ")} |`)
    .join("\n");
  return `### ${r.summary} (\`${key}\`, needs ${r.scopes.join(" or ")})\n| field | type | notes |\n|---|---|---|\n${fields}`;
}

export function guideFor(topic: GuideTopic): string {
  const tables = TOPIC_ROUTES[topic].map(routeTable).filter(Boolean);
  return [GUIDES[topic], tables.length ? `## EdgeOS reference\n${tables.join("\n\n")}` : ""].filter(Boolean).join("\n\n");
}

export function registerGuide(server: McpServer, access: Access): void {
  const topics = Object.keys(GUIDES) as [GuideTopic, ...GuideTopic[]];
  server.registerTool(
    "edgeos_guide",
    {
      title: "Guide",
      description: "Detailed guidance plus the EdgeOS field reference for one area: schedule, recurring, rsvp, hosting, venues, limits.",
      inputSchema: z.object({ topic: z.enum(topics).describe("Which area.") }),
      annotations: { readOnlyHint: true },
    },
    withToolHandler("edgeos_guide", access, async (p) => ok(guideFor(p.topic))),
  );
}
```

- [ ] **Step 6: Wire into `src/mcp/server.ts`**

```ts
import { McpServer } from "@modelcontextprotocol/server";
import type { Access } from "@/lib/types";
import { registerGuide } from "./guide";
import { registerInitialize } from "./initialize";
import { SERVER_INSTRUCTIONS } from "./instructions";
import type { ContextSection } from "./lib/context";
import { readContextSection, registerReadTools } from "./tools/read";

const SECTIONS: ContextSection[] = [readContextSection];

export function buildServer(access: Access, now: Date = new Date()): McpServer {
  const server = new McpServer({ name: "eci-events", version: "1.0.0" }, { instructions: SERVER_INSTRUCTIONS });
  registerInitialize(server, access, now, SECTIONS);
  registerGuide(server, access);
  registerReadTools(server, access, now);
  return server;
}
```

- [ ] **Step 7: Run tests**

Run: `pnpm test && pnpm typecheck`
Expected: PASS. If `client.callTool` returns validation errors as a thrown error rather than `isError: true` in the installed SDK, change the malformed-date test to `await expect(client.callTool(...)).rejects.toThrow()`.

- [ ] **Step 8: Commit**

```bash
git add src/mcp tests/mcp
git commit -m "feat(mcp): initialize gateway, guide tool and scope-gated read tools

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Propose → confirm pipeline

**Files:**
- Create: `src/mcp/propose/actions.ts`, `src/mcp/propose/checks.ts`, `src/mcp/propose/register.ts`
- Modify: `src/mcp/server.ts`
- Test: `tests/mcp/propose.test.ts`, `tests/mcp/checks.test.ts`

**Interfaces:**
- Consumes: everything above; `reviewProposal` from Task 12 is injected later (this task passes `null` reviewer notes).
- Produces:
  - `ACTIONS: Record<ActionName, ActionDef>`; `type ActionName = "rsvp" | "cancel_rsvp" | "create_event" | "update_event" | "cancel_event" | "hide_event" | "unhide_event" | "invite" | "remove_invitation" | "create_venue" | "update_venue" | "delete_venue"`
  - `type ActionDef = { scope: WriteScope; title: string; guide: GuideTopic; reviewed: boolean; schema: z.ZodObject; execute(access: Access, params: any): Promise<{ text: string; data: unknown }> }`
  - `type CheckContext = { access: Access; now: Date }`; `type CheckResult = { blockers: string[]; warnings: string[]; summary: string; event?: EdgeEvent }`
  - `runChecks(action: ActionName, params: Record<string, unknown>, ctx: CheckContext): Promise<CheckResult>`
  - `proposeContextSection: ContextSection`; `registerProposeTools(server: McpServer, access: Access, now: Date, review?: Reviewer): void`
  - `type Reviewer = (action: ActionName, params: Record<string, unknown>, summary: string) => Promise<string[] | null>`

- [ ] **Step 1: Write the failing tests**

`tests/mcp/checks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ACTIONS } from "@/mcp/propose/actions";
import { runChecks } from "@/mcp/propose/checks";
import { mockEdgeos } from "../edgeos-mock";
import { TEST_ACCESS, useTestSecrets } from "../helpers";

useTestSecrets();
const NOW = new Date("2026-10-14T06:00:00Z");
const ctx = { access: { ...TEST_ACCESS, scopes: ["events:read", "rsvp:write", "events:write", "venues:write"] as const }, now: NOW } as never;

const base = {
  id: "e1", popup_id: "ind", title: "Sunset Breathwork", content: "Breathe.", start_time: "2026-10-14T13:00:00Z", end_time: "2026-10-14T14:00:00Z",
  timezone: "Asia/Kolkata", venue_id: "v1", custom_location_name: null, custom_location_url: null, meeting_url: null, max_participant: 20,
  tags: [], kind: null, track_id: null, visibility: "public", status: "published", highlighted: false, host_display_name: null,
  require_approval: false, rrule: null, recurrence_master_id: null, my_rsvp_status: null, attendee_count: 3,
};
const empty = { results: [], paging: { limit: 0, offset: 0, total: 0 } };
const venues = { results: [{ id: "v1", title: "Beach Deck" }], paging: {} };

describe("rsvp checks", () => {
  it("passes a normal RSVP with an IST summary", async () => {
    mockEdgeos([
      { method: "GET", path: "/events/portal/events/e1", body: base },
      { method: "GET", path: /eligibility/, body: { allowed: true, reason: null } },
      { method: "GET", path: "/events/portal/events", body: empty },
      { method: "GET", path: "/event-venues/portal/venues", body: venues },
    ]);
    const r = await runChecks("rsvp", { event_id: "e1" }, ctx);
    expect(r.blockers).toEqual([]);
    expect(r.summary).toBe("RSVP to “Sunset Breathwork”, Wed 14 Oct, 6:30 PM – 7:30 PM IST, at Beach Deck.");
  });

  it("blocks when already RSVPed, past, or not eligible", async () => {
    mockEdgeos([
      { method: "GET", path: "/events/portal/events/e1", body: { ...base, my_rsvp_status: "registered", end_time: "2026-10-13T10:00:00Z", start_time: "2026-10-13T09:00:00Z" } },
      { method: "GET", path: /eligibility/, body: { allowed: false, reason: "No ticket this week" } },
      { method: "GET", path: "/events/portal/events", body: empty },
      { method: "GET", path: "/event-venues/portal/venues", body: venues },
    ]);
    const r = await runChecks("rsvp", { event_id: "e1" }, ctx);
    expect(r.blockers.join(" ")).toContain("already RSVPed");
    expect(r.blockers.join(" ")).toContain("already over");
    expect(r.blockers.join(" ")).toContain("No ticket this week");
  });

  it("blocks a recurring event without an occurrence", async () => {
    mockEdgeos([
      { method: "GET", path: "/events/portal/events/e1", body: { ...base, rrule: "FREQ=DAILY" } },
      { method: "GET", path: /eligibility/, body: { allowed: true, reason: null } },
      { method: "GET", path: "/events/portal/events", body: empty },
      { method: "GET", path: "/event-venues/portal/venues", body: venues },
    ]);
    const r = await runChecks("rsvp", { event_id: "e1" }, ctx);
    expect(r.blockers.join(" ")).toContain("recurring");
  });

  it("warns about a full event and a clash", async () => {
    const clash = { ...base, id: "e2", title: "Dinner talk", start_time: "2026-10-14T13:30:00Z", end_time: "2026-10-14T15:00:00Z", my_rsvp_status: "registered" };
    mockEdgeos([
      { method: "GET", path: "/events/portal/events/e1", body: { ...base, attendee_count: 20 } },
      { method: "GET", path: /eligibility/, body: { allowed: true, reason: null } },
      { method: "GET", path: "/events/portal/events", body: { results: [clash], paging: {} } },
      { method: "GET", path: "/event-venues/portal/venues", body: venues },
    ]);
    const r = await runChecks("rsvp", { event_id: "e1" }, ctx);
    expect(r.warnings.join(" ")).toContain("full");
    expect(r.warnings.join(" ")).toContain("Dinner talk");
  });
});

describe("hosting checks", () => {
  const ok = [
    { method: "POST", path: "/events/portal/events/check-availability", body: { available: true } },
    { method: "GET", path: "/event-venues/portal/venues", body: venues },
  ];

  it("rejects times without an offset", () => {
    const parsed = ACTIONS.create_event.schema.safeParse({ title: "Jam", start_time: "2026-10-14T18:00:00", end_time: "2026-10-14T19:00:00+05:30" });
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error?.issues)).toContain("+05:30");
  });

  it("warns on a likely UTC misread, missing description and missing place", async () => {
    mockEdgeos(ok);
    const r = await runChecks("create_event", { title: "Jam", start_time: "2026-10-15T03:00:00+05:30", end_time: "2026-10-15T04:00:00+05:30" }, ctx);
    expect(r.warnings.join(" ")).toContain("3:00 AM");
    expect(r.warnings.join(" ")).toContain("description");
    expect(r.warnings.join(" ")).toContain("venue");
  });

  it("blocks an end before the start and a start in the past", async () => {
    mockEdgeos(ok);
    const r = await runChecks("create_event", { title: "Jam", start_time: "2026-10-13T18:00:00+05:30", end_time: "2026-10-13T17:00:00+05:30", content: "x", venue_id: "v1" }, ctx);
    expect(r.blockers.join(" ")).toContain("ends before it starts");
    expect(r.blockers.join(" ")).toContain("in the past");
  });

  it("blocks a taken venue", async () => {
    mockEdgeos([
      { method: "POST", path: "/events/portal/events/check-availability", body: { available: false, conflicts: [{ title: "Yoga" }] } },
      { method: "GET", path: "/event-venues/portal/venues", body: venues },
    ]);
    const r = await runChecks("create_event", { title: "Jam", start_time: "2026-10-15T18:00:00+05:30", end_time: "2026-10-15T19:00:00+05:30", content: "x", venue_id: "v1" }, ctx);
    expect(r.blockers.join(" ")).toContain("Beach Deck isn't free");
  });

  it("warns outside the popup dates", async () => {
    mockEdgeos(ok);
    const r = await runChecks("create_event", { title: "Jam", start_time: "2026-11-05T18:00:00+05:30", end_time: "2026-11-05T19:00:00+05:30", content: "x", venue_id: "v1" }, ctx);
    expect(r.warnings.join(" ")).toContain("outside");
  });

  it("warns when cancelling an event people RSVPed to", async () => {
    mockEdgeos([{ method: "GET", path: "/events/portal/events/e1", body: base }, { method: "GET", path: "/event-venues/portal/venues", body: venues }]);
    const r = await runChecks("cancel_event", { event_id: "e1" }, ctx);
    expect(r.warnings.join(" ")).toContain("3 people");
  });
});
```

`tests/mcp/propose.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { accessToken, useTestSecrets } from "../helpers";
import { mockEdgeos } from "../edgeos-mock";
import { connectClient } from "../mcp-client";

useTestSecrets();
vi.useFakeTimers({ toFake: ["Date"] });
vi.setSystemTime(new Date("2026-10-14T06:00:00Z"));

const EVENT = {
  id: "e1", popup_id: "ind", title: "Sunset Breathwork", content: "Breathe.", start_time: "2026-10-14T13:00:00Z", end_time: "2026-10-14T14:00:00Z",
  timezone: "Asia/Kolkata", venue_id: null, custom_location_name: "North lawn", custom_location_url: null, meeting_url: null, max_participant: null,
  tags: [], kind: null, track_id: null, visibility: "public", status: "published", highlighted: false, host_display_name: null,
  require_approval: false, rrule: null, recurrence_master_id: null, my_rsvp_status: null, attendee_count: 3,
};
const routes = [
  { method: "GET", path: "/events/portal/events/e1", body: EVENT },
  { method: "GET", path: /eligibility/, body: { allowed: true, reason: null } },
  { method: "GET", path: "/events/portal/events", body: { results: [], paging: {} } },
  { method: "GET", path: "/event-venues/portal/venues", body: { results: [], paging: {} } },
  { method: "POST", path: "/event-participants/portal/register/e1", body: { id: "p1", status: "registered" } },
];
const text = (r: { content: unknown }) => (r.content as { text: string }[])[0].text;
const codeIn = (t: string) => t.match(/Proposal code[^`]*`([^`]+)`/)?.[1];

describe("propose → confirm", () => {
  it("proposes with steering, then confirms exactly that action", async () => {
    const m = mockEdgeos(routes);
    const client = await connectClient(await accessToken());
    const p = await client.callTool({ name: "edgeos_propose", arguments: { action: "rsvp", params: { event_id: "e1" } } });
    const t = text(p);
    expect(t).toContain("> RSVP to “Sunset Breathwork”, Wed 14 Oct, 6:30 PM – 7:30 PM IST, at North lawn.");
    expect(t).toContain("explicit yes");
    expect(t).toContain("## Guideline");
    expect(m.calls.some((c) => c.method === "POST")).toBe(false);

    const c = await client.callTool({ name: "edgeos_confirm", arguments: { code: codeIn(t) } });
    expect(text(c)).toContain("RSVPed");
    const post = m.calls.find((x) => x.method === "POST")!;
    expect(post.url.pathname).toBe("/api/v1/event-participants/portal/register/e1");
  });

  it("issues no code when blocked", async () => {
    mockEdgeos([{ ...routes[0], body: { ...EVENT, my_rsvp_status: "registered" } }, ...routes.slice(1)]);
    const client = await connectClient(await accessToken());
    const t = text(await client.callTool({ name: "edgeos_propose", arguments: { action: "rsvp", params: { event_id: "e1" } } }));
    expect(t).toContain("Not possible as proposed");
    expect(codeIn(t)).toBeUndefined();
  });

  it("refuses a code from another attendee or an expired code", async () => {
    mockEdgeos(routes);
    const a = await connectClient(await accessToken());
    const code = codeIn(text(await a.callTool({ name: "edgeos_propose", arguments: { action: "rsvp", params: { event_id: "e1" } } })))!;
    const b = await connectClient(await accessToken({ key: "eos_live_ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ" }));
    expect(text(await b.callTool({ name: "edgeos_confirm", arguments: { code } }))).toContain("another attendee");
    vi.setSystemTime(new Date("2026-10-14T06:11:00Z"));
    expect(text(await a.callTool({ name: "edgeos_confirm", arguments: { code } }))).toContain("expired");
    vi.setSystemTime(new Date("2026-10-14T06:00:00Z"));
  });

  it("refuses actions the key's scopes don't allow", async () => {
    mockEdgeos(routes);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({ name: "edgeos_propose", arguments: { action: "create_venue", params: { title: "Shack" } } });
    expect(text(r)).toContain("venues:write");
  });

  it("explains invalid params", async () => {
    mockEdgeos(routes);
    const client = await connectClient(await accessToken());
    const r = await client.callTool({ name: "edgeos_propose", arguments: { action: "rsvp", params: {} } });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("event_id");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/mcp/checks.test.ts tests/mcp/propose.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/mcp/propose/actions.ts`**

```ts
import { z } from "zod";
import type { GuideTopic } from "@/generated/guides";
import { ENUMS } from "@/generated/reference";
import { edgeos } from "@/lib/edgeos/client";
import type { EdgeEvent, Venue } from "@/lib/edgeos/types";
import { formatIstRange } from "@/lib/time";
import type { Access, WriteScope } from "@/lib/types";

const withOffset = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/, "Use ISO-8601 with an offset, e.g. 2026-10-14T18:30:00+05:30 for 6:30 PM IST");
const id = z.string().min(1);
const visibility = z.enum((ENUMS.EventVisibility ?? ["public", "private", "unlisted"]) as [string, ...string[]]);

const eventFields = {
  title: z.string().min(3).max(200),
  start_time: withOffset,
  end_time: withOffset,
  content: z.string().max(10_000).optional().describe("Description"),
  venue_id: z.string().optional(),
  custom_location_name: z.string().optional(),
  custom_location_url: z.string().url().optional(),
  meeting_url: z.string().url().optional(),
  max_participant: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  kind: z.string().optional(),
  track_id: z.string().optional(),
  visibility: visibility.optional(),
  require_approval: z.boolean().optional(),
};

const venueFields = {
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  location: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
};

const strip = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

export type ActionName =
  | "rsvp" | "cancel_rsvp" | "create_event" | "update_event" | "cancel_event" | "hide_event" | "unhide_event"
  | "invite" | "remove_invitation" | "create_venue" | "update_venue" | "delete_venue";

export type ActionDef = {
  scope: WriteScope;
  title: string;
  guide: GuideTopic;
  reviewed: boolean;
  schema: z.ZodObject;
  // biome-ignore lint/suspicious/noExplicitAny: params are validated by `schema` before execute runs
  execute(access: Access, params: any): Promise<{ text: string; data: unknown }>;
};

export const ACTIONS: Record<ActionName, ActionDef> = {
  rsvp: {
    scope: "rsvp:write", title: "RSVP", guide: "rsvp", reviewed: false,
    schema: z.object({ event_id: id, occurrence_start: z.string().optional(), message: z.string().max(500).optional() }),
    async execute(a, p) {
      const data = await edgeos(a.key, "POST", `/event-participants/portal/register/${p.event_id}`, { body: strip({ occurrence_start: p.occurrence_start, message: p.message }) });
      return { text: "Done: the attendee is RSVPed.", data };
    },
  },
  cancel_rsvp: {
    scope: "rsvp:write", title: "Cancel RSVP", guide: "rsvp", reviewed: false,
    schema: z.object({ event_id: id, occurrence_start: z.string().optional() }),
    async execute(a, p) {
      const data = await edgeos(a.key, "POST", `/event-participants/portal/cancel-registration/${p.event_id}`, { body: strip({ occurrence_start: p.occurrence_start }) });
      return { text: "Done: the RSVP is cancelled.", data };
    },
  },
  create_event: {
    scope: "events:write", title: "Host a new event", guide: "hosting", reviewed: true,
    schema: z.object(eventFields),
    async execute(a, p) {
      const e = await edgeos<EdgeEvent>(a.key, "POST", "/events/portal/events", { body: { ...strip(p), popup_id: a.popup.id, timezone: "Asia/Kolkata" } });
      return { text: `Done: “${e.title}” is created (id ${e.id}, status ${e.status}).`, data: e };
    },
  },
  update_event: {
    scope: "events:write", title: "Change an event", guide: "hosting", reviewed: true,
    schema: z.object({ event_id: id, ...Object.fromEntries(Object.entries(eventFields).map(([k, v]) => [k, v.optional()])) }),
    async execute(a, p) {
      const { event_id, ...rest } = p;
      const e = await edgeos<EdgeEvent>(a.key, "PATCH", `/events/portal/events/${event_id}`, { body: strip(rest) });
      return { text: `Done: “${e.title}” is updated.`, data: e };
    },
  },
  cancel_event: {
    scope: "events:write", title: "Cancel an event", guide: "hosting", reviewed: false,
    schema: z.object({ event_id: id }),
    async execute(a, p) {
      const data = await edgeos(a.key, "POST", `/events/portal/events/${p.event_id}/cancel`);
      return { text: "Done: the event is cancelled.", data };
    },
  },
  hide_event: {
    scope: "events:write", title: "Hide an event", guide: "hosting", reviewed: false,
    schema: z.object({ event_id: id }),
    async execute(a, p) {
      const data = await edgeos(a.key, "POST", `/events/portal/events/${p.event_id}/hide`);
      return { text: "Done: the event is hidden from the calendar.", data };
    },
  },
  unhide_event: {
    scope: "events:write", title: "Unhide an event", guide: "hosting", reviewed: false,
    schema: z.object({ event_id: id }),
    async execute(a, p) {
      const data = await edgeos(a.key, "DELETE", `/events/portal/events/${p.event_id}/hide`);
      return { text: "Done: the event is visible again.", data };
    },
  },
  invite: {
    scope: "events:write", title: "Invite people", guide: "hosting", reviewed: false,
    schema: z.object({ event_id: id, emails: z.array(z.string().email()).min(1).max(100) }),
    async execute(a, p) {
      const data = await edgeos(a.key, "POST", `/events/portal/events/${p.event_id}/invitations`, { body: { emails: p.emails } });
      return { text: `Done: invited ${p.emails.length} people.`, data };
    },
  },
  remove_invitation: {
    scope: "events:write", title: "Remove an invitation", guide: "hosting", reviewed: false,
    schema: z.object({ event_id: id, invitation_id: id }),
    async execute(a, p) {
      const data = await edgeos(a.key, "DELETE", `/events/portal/events/${p.event_id}/invitations/${p.invitation_id}`);
      return { text: "Done: the invitation is removed.", data };
    },
  },
  create_venue: {
    scope: "venues:write", title: "Add a venue", guide: "venues", reviewed: true,
    schema: z.object(venueFields),
    async execute(a, p) {
      const v = await edgeos<Venue>(a.key, "POST", "/event-venues/portal/venues", { body: { ...strip(p), popup_id: a.popup.id } });
      return { text: `Done: venue “${v.title}” is added (id ${v.id}).`, data: v };
    },
  },
  update_venue: {
    scope: "venues:write", title: "Change a venue", guide: "venues", reviewed: true,
    schema: z.object({ venue_id: id, ...Object.fromEntries(Object.entries(venueFields).map(([k, v]) => [k, v.optional()])) }),
    async execute(a, p) {
      const { venue_id, ...rest } = p;
      const v = await edgeos<Venue>(a.key, "PATCH", `/event-venues/portal/venues/${venue_id}`, { body: strip(rest) });
      return { text: `Done: venue “${v.title}” is updated.`, data: v };
    },
  },
  delete_venue: {
    scope: "venues:write", title: "Delete a venue", guide: "venues", reviewed: false,
    schema: z.object({ venue_id: id }),
    async execute(a, p) {
      const data = await edgeos(a.key, "DELETE", `/event-venues/portal/venues/${p.venue_id}`);
      return { text: "Done: the venue is deleted.", data };
    },
  },
};

export function whenText(start: string, end: string): string {
  return formatIstRange(start, end);
}
```

- [ ] **Step 4: Implement `src/mcp/propose/checks.ts`**

```ts
import { EdgeosError, edgeos } from "@/lib/edgeos/client";
import type { EdgeEvent, ListModel, RsvpEligibility, Venue } from "@/lib/edgeos/types";
import { isRecurring } from "@/lib/edgeos/types";
import { formatIstRange, formatIstTime, istDate, istDayWindow, istHour } from "@/lib/time";
import type { Access } from "@/lib/types";
import type { ActionName } from "./actions";

export type CheckContext = { access: Access; now: Date };
export type CheckResult = { blockers: string[]; warnings: string[]; summary: string; event?: EdgeEvent };

type P = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : undefined);

async function venueMap(a: Access): Promise<Map<string, string>> {
  const v = await edgeos<ListModel<Venue>>(a.key, "GET", "/event-venues/portal/venues", { query: { popup_id: a.popup.id, limit: 1000 } });
  return new Map(v.results.map((x) => [x.id, x.title]));
}

async function getEvent(a: Access, id: string, occ?: string): Promise<EdgeEvent | null> {
  try {
    return await edgeos<EdgeEvent>(a.key, "GET", `/events/portal/events/${id}`, { query: { occurrence_start: occ } });
  } catch (err) {
    if (err instanceof EdgeosError && err.status === 404) return null;
    throw err;
  }
}

const placeOf = (e: { venue_id?: string | null; custom_location_name?: string | null }, venues: Map<string, string>) =>
  e.venue_id ? (venues.get(e.venue_id) ?? "the chosen venue") : (e.custom_location_name ?? null);

async function rsvpChecks(action: "rsvp" | "cancel_rsvp", p: P, { access, now }: CheckContext): Promise<CheckResult> {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const occ = s(p.occurrence_start);
  const [e, venues] = await Promise.all([getEvent(access, String(p.event_id), occ), venueMap(access)]);
  if (!e) return { blockers: ["No such event, or it's hidden from this attendee."], warnings, summary: "" };

  const where = placeOf(e, venues);
  const verb = action === "rsvp" ? "RSVP to" : "Cancel the RSVP for";
  const summary = `${verb} “${e.title}”, ${formatIstRange(e.start_time, e.end_time)}${where ? `, at ${where}` : ""}.`;

  if (isRecurring(e) && !occ) blockers.push("This is a recurring event. Pick one occurrence: list events for that day and pass its occurrence_start.");
  if (occ && new Date(occ).getTime() !== new Date(e.start_time).getTime()) blockers.push("No occurrence of this event starts at that time.");
  if (new Date(e.end_time) < now) blockers.push("This event is already over.");

  if (action === "rsvp") {
    if (e.my_rsvp_status === "registered" || e.my_rsvp_status === "checked_in") blockers.push("The attendee has already RSVPed to this event.");
    const elig = await edgeos<RsvpEligibility>(access.key, "GET", `/event-participants/portal/eligibility/${access.popup.id}`);
    if (!elig.allowed) blockers.push(`EdgeOS says this attendee can't RSVP: ${elig.reason ?? "no reason given"}.`);
    if (e.max_participant && (e.attendee_count ?? 0) >= e.max_participant) warnings.push(`The event looks full (${e.attendee_count}/${e.max_participant}). EdgeOS may refuse or waitlist.`);
    if (e.require_approval) warnings.push("The host approves each RSVP, so this is a request until they accept.");
    const day = istDayWindow(istDate(new Date(e.start_time)), 1);
    const mine = await edgeos<ListModel<EdgeEvent>>(access.key, "GET", "/events/portal/events", {
      query: { popup_id: access.popup.id, event_status: "published", rsvped_only: true, start_after: day.startAfter, start_before: day.startBefore },
    });
    for (const o of mine.results) {
      if (o.id === e.id) continue;
      if (new Date(o.start_time) < new Date(e.end_time) && new Date(o.end_time) > new Date(e.start_time)) {
        warnings.push(`This overlaps with “${o.title}” (${formatIstRange(o.start_time, o.end_time)}), which the attendee already RSVPed to.`);
      }
    }
  } else if (e.my_rsvp_status !== "registered" && e.my_rsvp_status !== "checked_in") {
    blockers.push("The attendee isn't RSVPed to this event, so there's nothing to cancel.");
  }
  return { blockers, warnings, summary, event: e };
}

function timeChecks(start: string, end: string, { access, now }: CheckContext, blockers: string[], warnings: string[]) {
  const s0 = new Date(start);
  const e0 = new Date(end);
  if (e0 <= s0) blockers.push("The event ends before it starts.");
  if (s0 < now) blockers.push("The start time is in the past.");
  const minutes = (e0.getTime() - s0.getTime()) / 60_000;
  if (minutes > 0 && minutes < 15) warnings.push(`It's only ${minutes} minutes long. Is that right?`);
  if (minutes > 360) warnings.push(`It runs ${Math.round(minutes / 60)} hours. Is that right?`);
  if (istHour(start) < 6) warnings.push(`It starts at ${formatIstTime(start)} IST. If the attendee meant a daytime time, the offset may be wrong (UTC read as IST).`);
  const { startDate, endDate } = access.popup;
  if (startDate && endDate) {
    const d = istDate(s0);
    if (d < startDate || d > endDate) warnings.push(`That date is outside ${access.popup.name} (${startDate} to ${endDate}).`);
  }
}

async function hostingChecks(action: "create_event" | "update_event", p: P, ctx: CheckContext): Promise<CheckResult> {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const venues = await venueMap(ctx.access);
  let current: EdgeEvent | null = null;
  if (action === "update_event") {
    current = await getEvent(ctx.access, String(p.event_id));
    if (!current) return { blockers: ["No such event, or it's hidden from this attendee."], warnings, summary: "" };
  }
  const merged = { ...(current ?? {}), ...p } as P & { title: string; start_time: string; end_time: string };
  timeChecks(merged.start_time, merged.end_time, ctx, blockers, warnings);
  if (!s(merged.content)) warnings.push("There's no description. A few sentences on what happens and who it's for helps people decide.");
  const where = placeOf(merged as never, venues);
  if (!where) warnings.push("There's no venue or location. Pick a venue from edgeos_list_venues or set custom_location_name.");
  if (s(merged.venue_id)) {
    const r = await edgeos<{ available?: boolean; conflicts?: { title?: string }[] }>(ctx.access.key, "POST", "/events/portal/events/check-availability", {
      body: { venue_id: merged.venue_id, start_time: merged.start_time, end_time: merged.end_time, exclude_event_id: current?.id ?? null },
    });
    if (r && r.available === false) {
      const names = (r.conflicts ?? []).map((c) => c.title).filter(Boolean).join(", ");
      blockers.push(`${where} isn't free then${names ? ` (booked: ${names})` : ""}. Pick another time or venue.`);
    }
  }
  const verb = action === "create_event" ? "Create" : "Update";
  const summary = `${verb} “${merged.title}”, ${formatIstRange(merged.start_time, merged.end_time)}${where ? `, at ${where}` : ""}.`;
  return { blockers, warnings, summary, event: current ?? undefined };
}

export async function runChecks(action: ActionName, p: P, ctx: CheckContext): Promise<CheckResult> {
  if (action === "rsvp" || action === "cancel_rsvp") return rsvpChecks(action, p, ctx);
  if (action === "create_event" || action === "update_event") return hostingChecks(action, p, ctx);

  const blockers: string[] = [];
  const warnings: string[] = [];
  if (action === "create_venue" || action === "update_venue") {
    return { blockers, warnings, summary: `${action === "create_venue" ? "Add" : "Update"} the venue “${String(p.title ?? p.venue_id)}”.` };
  }
  if (action === "delete_venue") {
    const day = istDayWindow(istDate(ctx.now), 60);
    const upcoming = await edgeos<ListModel<EdgeEvent>>(ctx.access.key, "GET", "/events/portal/events", {
      query: { popup_id: ctx.access.popup.id, event_status: "published", venue_id: String(p.venue_id), start_after: ctx.now.toISOString(), start_before: day.startBefore },
    });
    if (upcoming.results.length) warnings.push(`${upcoming.results.length} upcoming events use this venue.`);
    return { blockers, warnings, summary: `Delete venue ${String(p.venue_id)}.` };
  }

  // Event-scoped actions: cancel/hide/unhide/invite/remove_invitation
  const e = await getEvent(ctx.access, String(p.event_id));
  if (!e) return { blockers: ["No such event, or it's hidden from this attendee."], warnings, summary: "" };
  const when = formatIstRange(e.start_time, e.end_time);
  if (new Date(e.end_time) < ctx.now) warnings.push("This event is already over.");
  if (action === "cancel_event" && (e.attendee_count ?? 0) > 0) warnings.push(`${e.attendee_count} people have RSVPed. Tell them yourself; this server doesn't message attendees.`);
  const emails = Array.isArray(p.emails) ? (p.emails as string[]) : [];
  if (action === "invite" && emails.length > 20) warnings.push(`That's ${emails.length} invitations at once. Double-check the list.`);
  const verbs: Record<string, string> = {
    cancel_event: "Cancel",
    hide_event: "Hide",
    unhide_event: "Unhide",
    invite: `Invite ${emails.length} people to`,
    remove_invitation: "Remove an invitation from",
  };
  return { blockers, warnings, summary: `${verbs[action]} “${e.title}”, ${when}.`, event: e };
}
```

- [ ] **Step 5: Implement `src/mcp/propose/register.ts`**

```ts
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { GUIDES } from "@/generated/guides";
import { keyPrefix } from "@/lib/scrub";
import { seal, unseal } from "@/lib/seal";
import { type Access, hasScope, WRITE_SCOPES } from "@/lib/types";
import type { ContextSection } from "@/mcp/lib/context";
import { ok } from "@/mcp/lib/result";
import { ToolError, withToolHandler } from "@/mcp/lib/tool-wrapper";
import { ACTIONS, type ActionName } from "./actions";
import { runChecks } from "./checks";

export type Reviewer = (action: ActionName, params: Record<string, unknown>, summary: string) => Promise<string[] | null>;

type ProposalPayload = { action: ActionName; params: Record<string, unknown>; kp: string; summary: string };

const allowed = (a: Access) => (Object.keys(ACTIONS) as ActionName[]).filter((n) => hasScope(a, ACTIONS[n].scope));

export const proposeContextSection: ContextSection = (a) => {
  const names = allowed(a);
  if (!names.length) return null;
  return `## Making changes
Every change is two steps:
1. \`edgeos_propose\` with \`action\` and \`params\`. Actions on this key: ${names.map((n) => `\`${n}\``).join(", ")}.
2. Show the attendee the summary word for word and raise each warning. Only after an explicit yes, call \`edgeos_confirm\` with the proposal code.
Times you send must carry an offset, e.g. 2026-10-14T18:30:00+05:30.`;
};

export const STEERING = "Show the attendee the summary above, word for word, and raise each warning. Call `edgeos_confirm` only after they explicitly say yes. If they change anything, call `edgeos_propose` again with the new details.";

export function registerProposeTools(server: McpServer, access: Access, now: Date, review?: Reviewer): void {
  const names = allowed(access);
  if (!WRITE_SCOPES.some((s) => hasScope(access, s)) || !names.length) return;

  server.registerTool(
    "edgeos_propose",
    {
      title: "Propose a change",
      description: `Check a change before making it. Returns a summary to show the attendee, warnings, the guideline for this action, and a proposal code for edgeos_confirm. Actions: ${names.join(", ")}. Use edgeos_guide for the fields each takes.`,
      inputSchema: z.object({
        action: z.enum(names as [ActionName, ...ActionName[]]),
        params: z.record(z.string(), z.unknown()).describe("Fields for the action, e.g. { event_id } for rsvp."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    withToolHandler("edgeos_propose", access, async ({ action, params }: { action: ActionName; params: Record<string, unknown> }) => {
      const def = ACTIONS[action];
      if (!hasScope(access, def.scope)) {
        throw new ToolError("NOT_ENABLED", `This key doesn't have ${def.scope}.`);
      }
      const parsed = def.schema.safeParse(params);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "params"}: ${i.message}`).join("; ");
        throw new ToolError("BAD_PARAMS", `${issues}. See edgeos_guide topic "${def.guide}".`);
      }
      const clean = parsed.data as Record<string, unknown>;
      const checks = await runChecks(action, clean, { access, now });
      if (checks.blockers.length) {
        return ok(`## Not possible as proposed\n${checks.blockers.map((b) => `- ${b}`).join("\n")}\n\nNo proposal code was issued. Tell the attendee why, fix what you can, and propose again.`, { blocked: true, blockers: checks.blockers });
      }
      const notes = def.reviewed && review ? await review(action, clean, checks.summary) : null;
      const code = await seal("proposal", { action, params: clean, kp: keyPrefix(access.key), summary: checks.summary } satisfies ProposalPayload, { ttlSeconds: 600 });
      const parts = [
        `## Proposal: ${def.title}`,
        `> ${checks.summary}`,
        checks.warnings.length ? `## Warnings (raise each one)\n${checks.warnings.map((w) => `- ${w}`).join("\n")}` : "No warnings.",
        notes?.length ? `## Second opinion (another model checked this against the hosting guidelines)\n${notes.map((n) => `- ${n}`).join("\n")}` : null,
        `## Guideline\n${GUIDES[def.guide]}`,
        `## Next\n${STEERING}`,
        `Proposal code (expires in 10 minutes): \`${code}\``,
      ].filter(Boolean);
      return ok(parts.join("\n\n"), { blocked: false, summary: checks.summary, warnings: checks.warnings, review: notes ?? [], code });
    }),
  );

  server.registerTool(
    "edgeos_confirm",
    {
      title: "Confirm a change",
      description: "Carry out a proposal after the attendee explicitly said yes. Takes the proposal code from edgeos_propose.",
      inputSchema: z.object({ code: z.string().min(10) }),
      annotations: { destructiveHint: true, openWorldHint: true },
    },
    withToolHandler("edgeos_confirm", access, async ({ code }: { code: string }) => {
      const p = await unseal<ProposalPayload>("proposal", code);
      if (!p) throw new ToolError("PROPOSAL_EXPIRED", "That proposal code is invalid or expired (10 minutes). Propose again.");
      if (p.kp !== keyPrefix(access.key)) throw new ToolError("WRONG_ATTENDEE", "That proposal was made for another attendee.");
      const def = ACTIONS[p.action];
      if (!hasScope(access, def.scope)) throw new ToolError("NOT_ENABLED", `This key doesn't have ${def.scope}.`);
      const r = await def.execute(access, p.params);
      return ok(`${r.text}\n(${p.summary})`, { action: p.action, result: r.data as Record<string, unknown> });
    }),
  );
}
```

- [ ] **Step 6: Wire into `src/mcp/server.ts`**

Add to imports and body:

```ts
import { proposeContextSection, registerProposeTools } from "./propose/register";

const SECTIONS: ContextSection[] = [readContextSection, proposeContextSection];
// inside buildServer, after registerReadTools:
  registerProposeTools(server, access, now);
```

Confirm: the RSVP confirm test expects `"RSVPed"` in the reply; `ACTIONS.rsvp.execute` returns "Done: the attendee is RSVPed."

- [ ] **Step 7: Run tests**

Run: `pnpm test && pnpm typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/mcp tests/mcp
git commit -m "feat(mcp): propose/confirm pipeline with live checks and sealed proposals

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Second-model reviewer

**Files:**
- Create: `src/mcp/propose/reviewer.ts`
- Modify: `src/mcp/server.ts` (pass `reviewProposal` into `registerProposeTools`)
- Test: `tests/mcp/reviewer.test.ts`

**Interfaces:**
- Consumes: `Reviewer` type (Task 11), `GUIDES`.
- Produces: `reviewProposal: Reviewer` (returns `null` when `REVIEWER_MODEL` unset, on timeout, or on any failure).

- [ ] **Step 1: Write the failing tests**

`tests/mcp/reviewer.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { reviewProposal } from "@/mcp/propose/reviewer";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.REVIEWER_MODEL;
});

const params = { title: "Jam", start_time: "2026-10-15T18:00:00+05:30", end_time: "2026-10-15T19:00:00+05:30" };

describe("reviewProposal", () => {
  it("is off when REVIEWER_MODEL is unset", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await reviewProposal("create_event", params, "Create “Jam”")).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("calls Vertex with the guidelines and returns notes", async () => {
    process.env.REVIEWER_MODEL = "gemini-flash-latest";
    process.env.GOOGLE_CLOUD_PROJECT = "123";
    process.env.GEMINI_API_KEY = "AQ.test";
    const f = vi.fn(async (_url: string, _init: RequestInit) =>
      Response.json({ candidates: [{ content: { parts: [{ text: '{"notes":["Add what to bring."]}' }] } }] }),
    );
    vi.stubGlobal("fetch", f);
    expect(await reviewProposal("create_event", params, "Create “Jam”")).toEqual(["Add what to bring."]);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://aiplatform.googleapis.com/v1/projects/123/locations/global/publishers/google/models/gemini-flash-latest:generateContent?key=AQ.test");
    expect(String(init.body)).toContain("A good village event has");
    expect(String(init.body)).not.toContain("eos_live_");
  });

  it("returns null on failure or nonsense", async () => {
    process.env.REVIEWER_MODEL = "m";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    expect(await reviewProposal("create_event", params, "s")).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ candidates: [{ content: { parts: [{ text: "not json" }] } }] })));
    expect(await reviewProposal("create_event", params, "s")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/mcp/reviewer.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/mcp/propose/reviewer.ts`**

```ts
// Optional second opinion on hosting and venue proposals. Sends the proposal
// (event content only, never keys or participants) and the hosting guideline
// to a Gemini model on Vertex AI. Off unless REVIEWER_MODEL is set.

import { GUIDES } from "@/generated/guides";
import type { ActionName } from "./actions";
import type { Reviewer } from "./register";

export const RUBRIC = `You review a proposed change to a community event calendar for Edge City India (a 3-week residential village in Goa) before an AI assistant asks the attendee to confirm it.
Judge it only against the guidelines below. Return JSON {"notes": string[]} with at most 4 short, specific, actionable notes the assistant should raise with the attendee. Return {"notes": []} if it's fine. Don't restate the proposal. Don't invent facts.`;

export const reviewProposal: Reviewer = async (action: ActionName, params, summary) => {
  const model = process.env.REVIEWER_MODEL;
  if (!model) return null;
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const key = process.env.GEMINI_API_KEY;
  if (!project || !key) return null;
  const guide = action.endsWith("venue") ? GUIDES.venues : GUIDES.hosting;
  const url = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/${model}:generateContent?key=${key}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${RUBRIC}\n\n# Guidelines\n${guide}\n\n# Proposal\nAction: ${action}\nSummary: ${summary}\nFields: ${JSON.stringify(params)}` }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const notes = (JSON.parse(text) as { notes?: unknown }).notes;
    return Array.isArray(notes) ? notes.filter((n): n is string => typeof n === "string").slice(0, 4) : null;
  } catch {
    return null;
  }
};
```

`src/mcp/server.ts`: import `reviewProposal` and call `registerProposeTools(server, access, now, reviewProposal);`.

- [ ] **Step 4: Run tests**

Run: `pnpm test && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mcp tests/mcp/reviewer.test.ts
git commit -m "feat(propose): optional Gemini reviewer for hosting and venue proposals

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Prompts and PostHog MCP Analytics

**Files:**
- Create: `src/mcp/prompts.ts`, `src/mcp/analytics.ts`
- Modify: `src/mcp/server.ts`, `src/app/api/mcp/route.ts`, `src/mcp/propose/register.ts` (capture proposal events)
- Test: `tests/mcp/analytics.test.ts`, `tests/mcp/prompts.test.ts`

**Interfaces:**
- Produces:
  - `registerPrompts(server: McpServer): void` — prompts `whats_on_today`, `plan_my_week`, `host_an_event`
  - `analyticsBeforeSend(event: { properties?: Record<string, unknown> } | null): typeof event`
  - `instrumentServer(server: McpServer, access: Access): void`
  - `captureEvent(access: Access, event: string, props: Record<string, unknown>): void`
  - `flushAnalytics(): Promise<void>`

- [ ] **Step 1: Write the failing tests**

`tests/mcp/analytics.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { analyticsBeforeSend } from "@/mcp/analytics";

describe("analytics privacy", () => {
  it("drops parameters and responses, keeps input keys", () => {
    const out = analyticsBeforeSend({
      properties: { $mcp_tool_name: "edgeos_get_event", $mcp_parameters: { event_id: "e1" }, $mcp_response: "Sunset Breathwork", $mcp_input_keys: ["event_id"] },
    });
    expect(out?.properties).toEqual({ $mcp_tool_name: "edgeos_get_event", $mcp_input_keys: ["event_id"], $process_person_profile: false });
  });

  it("scrubs keys from any remaining string", () => {
    const out = analyticsBeforeSend({ properties: { $exception_message: "bad eos_live_AbCdEfGhIjKlMnOpQrStUvWx" } });
    expect(JSON.stringify(out)).not.toContain("AbCdEfGh");
  });
});
```

`tests/mcp/prompts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { accessToken, useTestSecrets } from "../helpers";
import { connectClient } from "../mcp-client";

useTestSecrets();

describe("prompts", () => {
  it("offers the three workflows", async () => {
    const client = await connectClient(await accessToken());
    const names = (await client.listPrompts()).prompts.map((p) => p.name);
    expect(names).toEqual(expect.arrayContaining(["whats_on_today", "plan_my_week", "host_an_event"]));
    const p = await client.getPrompt({ name: "whats_on_today" });
    expect(JSON.stringify(p.messages)).toContain("edgeos_initialize");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/mcp/analytics.test.ts tests/mcp/prompts.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/mcp/analytics.ts`**

```ts
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
    client = token ? new PostHog(token, { host: process.env.POSTHOG_HOST ?? "https://us.i.posthog.com", flushAt: 1, flushInterval: 0 }) : null;
  }
  return client;
}

function who(access: Access): string {
  return pseudonymId(access.key, process.env.POSTHOG_ID_SALT ?? "eci-events");
}

type Ev = { properties?: Record<string, unknown> } | null;

export function analyticsBeforeSend<T extends Ev>(event: T): T {
  if (!event?.properties) return event;
  const { $mcp_parameters: _p, $mcp_response: _r, ...rest } = event.properties;
  const scrubbed = JSON.parse(scrubKeys(JSON.stringify(rest))) as Record<string, unknown>;
  return { ...event, properties: { ...scrubbed, $process_person_profile: false } };
}

export function instrumentServer(server: McpServer, access: Access): void {
  const ph = posthog();
  if (!ph) return;
  instrument(server as never, ph, {
    context: true,
    enableConversationId: true,
    reportMissing: true,
    serverBuild: (process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "unknown").slice(0, 40),
    identify: () => ({ distinctId: who(access) }),
    eventProperties: () => ({ $process_person_profile: false, popup: access.popup.slug, scopes: access.scopes.join(" ") }),
    beforeSend: analyticsBeforeSend as never,
  });
}

export function captureEvent(access: Access, event: string, props: Record<string, unknown>): void {
  posthog()?.capture({ distinctId: who(access), event, properties: { ...props, $process_person_profile: false } });
}

export async function flushAnalytics(): Promise<void> {
  await posthog()?.flush();
}
```

Check the installed `@posthog/mcp` types (`node_modules/@posthog/mcp/dist/*.d.ts`) for the exact `identify` return shape (`UserIdentity`) and `beforeSend` event type, and match them; drop the `as never` casts once the types line up.

- [ ] **Step 4: Implement `src/mcp/prompts.ts`**

```ts
import type { McpServer } from "@modelcontextprotocol/server";

// Exported so /how-it-works shows the exact text each prompt sends.
export const PROMPTS = [
  {
    name: "whats_on_today",
    title: "What's on today",
    description: "Today's events at Edge City India, in IST.",
    text: "Call edgeos_initialize, then list today's events with edgeos_list_events. Group them by morning, afternoon and evening, mark featured ones and any I've RSVPed to, and ask if I want to RSVP to anything.",
  },
  {
    name: "plan_my_week",
    title: "Plan my week",
    description: "Build a week plan from the calendar and your RSVPs.",
    text: "Call edgeos_initialize. Show my RSVPs for the next 7 days (edgeos_list_events with mine: true), then ask what I'm interested in and suggest events that fit around them without clashes. RSVP only through edgeos_propose and edgeos_confirm, one at a time, after I say yes.",
  },
  {
    name: "host_an_event",
    title: "Host an event",
    description: "Plan and create an event, checked before it goes live.",
    text: "Call edgeos_initialize and edgeos_guide with topic hosting. Ask me, one question at a time, for the title, what happens, when (IST), where (show me free venues with edgeos_venue_availability), and capacity. Then use edgeos_propose with action create_event, show me the summary and warnings, and confirm only after I say yes.",
  },
] as const;

export function registerPrompts(server: McpServer): void {
  for (const p of PROMPTS) {
    server.registerPrompt(p.name, { title: p.title, description: p.description }, async () => ({
      messages: [{ role: "user" as const, content: { type: "text" as const, text: p.text } }],
    }));
  }
}
```

If the installed SDK names the prompt config differently (e.g. requires `argumentsSchema`), follow `node_modules/@modelcontextprotocol/server/dist/index.d.ts`.

- [ ] **Step 5: Wire it up**

`src/mcp/server.ts` final body:

```ts
import { McpServer } from "@modelcontextprotocol/server";
import type { Access } from "@/lib/types";
import { instrumentServer } from "./analytics";
import { registerGuide } from "./guide";
import { registerInitialize } from "./initialize";
import { SERVER_INSTRUCTIONS } from "./instructions";
import type { ContextSection } from "./lib/context";
import { registerPrompts } from "./prompts";
import { proposeContextSection, registerProposeTools } from "./propose/register";
import { reviewProposal } from "./propose/reviewer";
import { readContextSection, registerReadTools } from "./tools/read";

const SECTIONS: ContextSection[] = [readContextSection, proposeContextSection];

export function buildServer(access: Access, now: Date = new Date()): McpServer {
  const server = new McpServer({ name: "eci-events", version: "1.0.0" }, { instructions: SERVER_INSTRUCTIONS });
  instrumentServer(server, access); // before registrations so every tool is wrapped
  registerInitialize(server, access, now, SECTIONS);
  registerGuide(server, access);
  registerReadTools(server, access, now);
  registerProposeTools(server, access, now, reviewProposal);
  registerPrompts(server);
  return server;
}
```

`src/app/api/mcp/route.ts`: replace the `after(...)` block with a static import:

```ts
import { flushAnalytics } from "@/mcp/analytics";
// ...
  after(flushAnalytics);
```

`src/mcp/propose/register.ts`: import `captureEvent` and add, in `edgeos_propose` right before each `return ok(...)`:

```ts
captureEvent(access, "proposal_created", { action, blocked: checks.blockers.length > 0, warnings: checks.warnings.length, reviewer_used: Boolean(notes) });
```

(For the blocked branch use `blocked: true, warnings: 0, reviewer_used: false`.) In `edgeos_confirm`, after `def.execute` succeeds:

```ts
captureEvent(access, "proposal_confirmed", { action: p.action, seconds_to_confirm: Math.round(Date.now() / 1000 - p.iat) });
```

- [ ] **Step 6: Run tests**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/mcp src/app/api/mcp tests/mcp
git commit -m "feat(mcp): prompts and pseudonymous PostHog MCP analytics

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Web pages — connect form, landing guide, trust page

**Files:**
- Create: `src/app/connect/page.tsx`, `src/app/connect/connect-form.tsx`, `src/components/tabs.tsx`, `src/components/mermaid.tsx`, `src/components/copy-button.tsx`, `src/components/build-box.tsx`, `src/components/analytics.tsx`, `src/app/trust/page.tsx`, `src/app/trust/content.tsx`
- Modify: `src/app/page.tsx`, `src/app/layout.tsx`
- Test: `tests/app/pages.test.ts`

**Interfaces:**
- Consumes: `connect` server action, `readAuthRequest`, `buildInfo`, `mcpUrl`, `agenticAccessUrl`, `REPO_URL`.
- Produces: pages `/`, `/connect`, `/trust`.

Design (spec §11, ECI priorities): usability first; white or very light surfaces, near-black text, one accent; large readable type; no grain or imagery behind text; every step numbered because it is a real sequence. Display face "Bricolage Grotesque", body "Inter Tight" is avoided; use "Instrument Sans" for body and "JetBrains Mono" for URLs, loaded with `next/font/google`.

- [ ] **Step 1: Write the failing smoke test**

`tests/app/pages.test.ts`:

```ts
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { useTestSecrets } from "../helpers";

useTestSecrets();
vi.mock("next/font/google", () => ({
  Instrument_Sans: () => ({ className: "font-body", variable: "--font-body" }),
  Bricolage_Grotesque: () => ({ className: "font-display", variable: "--font-display" }),
  JetBrains_Mono: () => ({ className: "font-mono", variable: "--font-mono" }),
}));

describe("pages", () => {
  it("landing shows the MCP URL and both app guides", async () => {
    const { default: Home } = await import("@/app/page");
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain("https://mcp.test/api/mcp");
    expect(html).toContain("claude.ai");
    expect(html).toContain("ChatGPT");
    expect(html).toContain("/portal/agentic-access");
    expect(html).toContain("Never paste your key into a chat");
  });

  it("trust page explains at four levels and links the key files", async () => {
    const { default: Trust } = await import("@/app/trust/page");
    const html = renderToStaticMarkup(await Trust());
    for (const t of ["In plain words", "Analogy", "Technical", "Verify it yourself"]) expect(html).toContain(t);
    expect(html).toContain("src/lib/seal.ts");
    expect(html).toContain("What is proven");
  });

  it("connect page explains an expired link", async () => {
    const { default: Connect } = await import("@/app/connect/page");
    const html = renderToStaticMarkup(await Connect({ searchParams: Promise.resolve({ req: "expired" }) }));
    expect(html).toContain("expired");
  });
});
```

Add `@vitejs/plugin-react` only if JSX transform fails in Vitest: `pnpm add -D @vitejs/plugin-react` and `plugins: [react()]` in `vitest.config.ts`.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/app/pages.test.ts`
Expected: FAIL.

- [ ] **Step 3: Shared components**

`src/components/tabs.tsx`:

```tsx
"use client";

import { useState } from "react";

export function Tabs({ tabs }: { tabs: { id: string; label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0].id);
  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-2 border-b border-neutral-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setActive(t.id)}
            className={`-mb-px rounded-t-lg border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-teal-700 ${
              active === t.id ? "border-neutral-200 border-b-white bg-white text-neutral-950" : "border-transparent text-neutral-600 hover:text-neutral-950"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} id={`panel-${t.id}`} role="tabpanel" aria-labelledby={`tab-${t.id}`} hidden={active !== t.id} className="pt-6">
          {t.content}
        </div>
      ))}
    </div>
  );
}
```

All tab panels render into the HTML (hidden ones use `hidden`), so the smoke test sees every tab's text.

`src/components/copy-button.tsx`:

```tsx
"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          setDone(false);
        }
      }}
      className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-teal-700"
    >
      {done ? "Copied" : label}
    </button>
  );
}
```

`src/components/mermaid.tsx`:

```tsx
"use client";

import { useEffect, useId, useState } from "react";

export function Mermaid({ chart, caption }: { chart: string; caption: string }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    import("mermaid").then(async ({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "strict" });
      const { svg } = await mermaid.render(`m${id}`, chart);
      if (alive) setSvg(svg);
    });
    return () => {
      alive = false;
    };
  }, [chart, id]);
  return (
    <figure className="my-6 overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: SVG produced by mermaid in strict mode from our own static chart text */}
      {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <pre className="text-xs text-neutral-500">{chart}</pre>}
      <figcaption className="mt-2 text-sm text-neutral-600">{caption}</figcaption>
    </figure>
  );
}
```

`src/components/build-box.tsx`:

```tsx
import { buildInfo } from "@/lib/build";

export function BuildBox() {
  const b = buildInfo();
  return (
    <section className="rounded-xl border border-neutral-200 p-5">
      <h3 className="font-display text-lg font-semibold">Where this runs</h3>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-neutral-600">Code</dt>
        <dd><a className="underline" href={b.repo}>{b.repo.replace("https://", "")}</a> (public)</dd>
        <dt className="text-neutral-600">Running commit</dt>
        <dd className="font-mono break-all"><a className="underline" href={b.commitUrl}>{b.commit.slice(0, 12)}</a></dd>
        <dt className="text-neutral-600">Built</dt>
        <dd>{b.builtAt}</dd>
        <dt className="text-neutral-600">Host</dt>
        <dd>{b.host}</dd>
        <dt className="text-neutral-600">Deployed by</dt>
        <dd>{b.deployMethod}</dd>
      </dl>
      <p className="mt-3 text-sm text-neutral-600">Live data: <a className="underline" href="/api/build-info">/api/build-info</a></p>
    </section>
  );
}
```

`src/components/analytics.tsx` (web funnel; no cookies, no autocapture):

```tsx
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
```

`src/app/layout.tsx` (fonts):

```tsx
import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "ECI Events MCP",
  description: "Use the Edge City India events calendar from Claude or ChatGPT. Your EdgeOS key is never stored.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="bg-white font-body text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
```

`src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --font-display: var(--font-display), ui-sans-serif, system-ui, sans-serif;
  --font-body: var(--font-body), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-mono), ui-monospace, monospace;
}

h1, h2, h3 { text-wrap: balance; }
```

- [ ] **Step 4: Landing page `src/app/page.tsx`**

```tsx
import { Analytics } from "@/components/analytics";
import { CopyButton } from "@/components/copy-button";
import { Tabs } from "@/components/tabs";
import { agenticAccessUrl, mcpUrl } from "@/lib/env";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[2.25rem_1fr] gap-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 font-display text-white">{n}</span>
      <div className="min-w-0">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <div className="mt-1 space-y-2 text-neutral-700">{children}</div>
      </div>
    </li>
  );
}

function UrlBox({ url }: { url: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-300 bg-neutral-50 p-3">
      <code className="min-w-0 break-all font-mono text-sm">{url}</code>
      <CopyButton value={url} label="Copy URL" />
    </div>
  );
}

function KeyStep() {
  return (
    <Step n={1} title="Make a key in the Edge City portal">
      <p>
        Open <a className="underline" href={agenticAccessUrl()}>{agenticAccessUrl().replace("https://", "")}</a> and create an API key.
      </p>
      <p>Tick what you want your AI to do: read events (always on), RSVP, host events, manage venues. Set an expiry; the portal asks for one when you tick a write box.</p>
      <p>Copy the key. You'll paste it once, on our page, in step 3.</p>
    </Step>
  );
}

function TryStep() {
  return (
    <Step n={4} title="Try it">
      <ul className="list-disc pl-5">
        <li>“What's on tonight at Edge City?”</li>
        <li>“Find me something about AI this week and RSVP me to the best one.”</li>
        <li>“Help me host a sunrise swim on Saturday.”</li>
      </ul>
    </Step>
  );
}

export default async function Home() {
  const url = mcpUrl();
  const pasteStep = (
    <Step n={3} title="Paste your key on our page">
      <p>Your app opens a page from this site asking for the key. Paste it and press Connect. You'll see what your key allows, then you're sent back.</p>
      <p className="font-medium text-neutral-900">Never paste your key into a chat. Only into that page.</p>
    </Step>
  );
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Analytics page="landing" />
      <p className="text-sm font-medium uppercase tracking-wider text-teal-800">Edge City India · 11 Oct – 1 Nov 2026 · Mandrem, Goa</p>
      <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">Ask your AI what's on at Edge City</h1>
      <p className="mt-4 text-lg text-neutral-700">
        Connect Claude or ChatGPT to the village calendar. Find events, RSVP, and host your own, in plain words. A community project, not run by Edge City.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">Connect in four steps</h2>
        <div className="mt-6">
          <Tabs
            tabs={[
              {
                id: "claude",
                label: "claude.ai / Claude app",
                content: (
                  <ol className="space-y-8">
                    <KeyStep />
                    <Step n={2} title="Add the connector">
                      <p>In Claude: <b>Settings → Connectors → Add custom connector</b>. Name it “Edge City events” and paste this URL:</p>
                      <UrlBox url={url} />
                      <p>Press <b>Add</b>, then <b>Connect</b>.</p>
                    </Step>
                    {pasteStep}
                    <TryStep />
                  </ol>
                ),
              },
              {
                id: "chatgpt",
                label: "ChatGPT",
                content: (
                  <ol className="space-y-8">
                    <KeyStep />
                    <Step n={2} title="Add the connector">
                      <p>In ChatGPT: <b>Settings → Apps &amp; Connectors → Advanced → Developer mode</b> on, then <b>Create</b>. Name it “Edge City events”, choose OAuth, and paste this URL:</p>
                      <UrlBox url={url} />
                      <p>Press <b>Create</b>. In a new chat, turn the connector on from the <b>+</b> menu.</p>
                    </Step>
                    {pasteStep}
                    <TryStep />
                  </ol>
                ),
              },
              {
                id: "other",
                label: "Claude Code & others",
                content: (
                  <ol className="space-y-8">
                    <KeyStep />
                    <Step n={2} title="Add the server">
                      <p>Claude Code:</p>
                      <UrlBox url={`claude mcp add --transport http eci-events ${url}`} />
                      <p>Any MCP client that supports remote servers with OAuth: add <code className="font-mono">{url}</code>. No token goes in the URL.</p>
                    </Step>
                    {pasteStep}
                    <TryStep />
                  </ol>
                ),
              },
            ]}
          />
        </div>
      </section>

      <section className="mt-14 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 p-5">
          <h2 className="font-display text-xl font-semibold">Why you can trust this</h2>
          <p className="mt-2 text-neutral-700">We never store your key. Your AI never sees it. It travels locked inside a token only this server can open, and only for the moment it's needed.</p>
          <a className="mt-3 inline-block font-medium text-teal-800 underline" href="/trust">How this works, in detail</a>
        </div>
        <div className="rounded-xl border border-neutral-200 p-5">
          <h2 className="font-display text-xl font-semibold">Where this runs</h2>
          <p className="mt-2 text-neutral-700">The code is public on GitHub, and the page shows exactly which version is live, so you or your AI can check it.</p>
          <a className="mt-3 inline-block font-medium text-teal-800 underline" href="/trust#where">See the running version</a>
        </div>
      </section>
    </main>
  );
}
```

The claude.ai and ChatGPT click paths above are the expected current flows; Task 15 verifies them against the live products and replaces any wording that differs, adding screenshots.

- [ ] **Step 5: Trust page `src/app/trust/page.tsx` and `content.tsx`**

`src/app/trust/content.tsx`:

```tsx
import { Mermaid } from "@/components/mermaid";
import { buildInfo } from "@/lib/build";

export const KEY_FILES = [
  { path: "src/lib/seal.ts", why: "The only code that locks and unlocks your key." },
  { path: "src/lib/oauth/authorize.ts", why: "Takes your key from the connect page, checks it with EdgeOS, seals it." },
  { path: "src/lib/edgeos/client.ts", why: "The only place your key is sent anywhere: to EdgeOS, as you." },
  { path: "src/lib/scrub.ts", why: "Removes any key from error messages before a model sees them." },
  { path: "src/mcp/lib/tool-wrapper.ts", why: "Logs each call without arguments, bodies or keys." },
];

export function Plain() {
  return (
    <div className="space-y-4 text-lg text-neutral-800">
      <p>You make a key in the Edge City portal and paste it once, on this site. Not into a chat.</p>
      <p>We lock the key inside a token right away and hand the token to your AI app. We don't keep a copy. There's no database.</p>
      <p>When your AI asks “what's on tonight?”, the app sends the token back. We unlock it for that one request, ask EdgeOS as you, send the answer, and forget the key.</p>
      <p>Your AI only ever sees the answers. If you want to stop, delete the key in the Edge City portal. Everything stops working at once.</p>
      <Mermaid
        caption="Your key is entered once, then only ever travels locked."
        chart={`flowchart LR
  You[You] -->|paste key once| Page[Our connect page]
  Page -->|locked token| App[Claude / ChatGPT]
  App -->|locked token with each question| Server[Our server]
  Server -->|your key, for one request| EdgeOS[EdgeOS]
  EdgeOS -->|events| Server -->|answer, no key| App`}
      />
    </div>
  );
}

export function Analogy() {
  return (
    <div className="space-y-4 text-lg text-neutral-800">
      <p>Think of your key as a letter. On the connect page you seal it in an envelope that only our letter opener can open.</p>
      <p>Your AI app keeps the sealed envelope. We keep the letter opener, but no envelopes: we have nowhere to store them.</p>
      <p>Each time your AI needs something, it hands us the envelope. We open it, use the letter for that one errand, and give the envelope back. Nothing is filed away.</p>
      <p>Your AI carries the envelope but can't open it. We could read a letter only if someone handed us the envelope, and the only way to collect envelopes would be to change the code, in public, where anyone can see it.</p>
      <Mermaid
        caption="We hold the opener, never the envelopes."
        chart={`sequenceDiagram
  participant A as Your AI app
  participant S as Our server (has the opener)
  participant E as EdgeOS
  A->>S: here's the sealed envelope + question
  S->>S: open, read the letter
  S->>E: errand, as you
  E-->>S: result
  S-->>A: answer (envelope stays with the app)`}
      />
    </div>
  );
}

export function Technical() {
  return (
    <div className="space-y-4 text-neutral-800">
      <p>
        This server is its own OAuth 2.1 authorization server, with no storage. Every artifact it issues is a compact JWE (<code>alg: dir</code>, <code>enc: A256GCM</code>) under <code>TOKEN_SECRETS</code>, with a <code>typ</code> claim so a code can't pass as a token:
      </p>
      <ul className="list-disc pl-5">
        <li>DCR <code>client_id</code>: redirect URIs and app type (CIMD clients use their metadata URL instead)</li>
        <li>Auth code (60 s): key, scopes, popup, client, redirect URI, PKCE challenge</li>
        <li>Access token (1 h, audience <code>/api/mcp</code>) and refresh token (until 15 Nov 2026)</li>
        <li>Proposal code (10 min): the exact write the attendee will confirm</li>
      </ul>
      <p>PKCE S256 is required; the authorize redirect includes <code>iss</code> (RFC 9207). The secret is generated by a script that writes it to the host's write-only env, so the operator never holds it.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left"><th className="py-2">Who</th><th>Can they see your key?</th></tr>
          </thead>
          <tbody>
            {[
              ["The AI model", "No. Tools return results only; keys are scrubbed from errors."],
              ["Your AI app (claude.ai, ChatGPT)", "No. It stores a sealed token it can't open."],
              ["The operator, from logs or a database", "No. There is no database, and nothing logs headers or keys."],
              ["The operator holding the secret alone", "No. Tokens exist only in your app; the secret opens nothing by itself."],
              ["The operator changing the code", "Only by deploying code that captures keys, visible in this public repo's history."],
            ].map(([w, a]) => (
              <tr key={w} className="border-b align-top"><td className="py-2 pr-4 font-medium">{w}</td><td className="py-2">{a}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>Trade-offs we accept: a 60-second code could be replayed, but redeeming it also needs the PKCE verifier only your app holds; a single token can't be revoked server-side, so revoke the key in EdgeOS instead.</p>
      <Mermaid
        caption="Connect flow (MCP 2026-07-28, with 2025-era clients supported)."
        chart={`sequenceDiagram
  participant C as MCP client
  participant B as Your browser
  participant S as This server
  participant E as EdgeOS
  C->>S: POST /api/mcp (no token)
  S-->>C: 401 + resource metadata
  C->>S: metadata, CIMD or DCR
  C->>B: open /oauth/authorize (PKCE)
  B->>S: paste key on /connect
  S->>E: validate key, detect scopes
  S-->>B: redirect: sealed code + iss
  B->>C: code
  C->>S: /oauth/token + verifier
  S-->>C: sealed access + refresh
  C->>S: tool call with sealed token
  S->>E: Bearer eos_live_… (in memory only)`}
      />
    </div>
  );
}

export function Verify() {
  const b = buildInfo();
  const at = (p: string) => (b.commit === "unknown" ? `${b.repo}/blob/main/${p}` : `${b.repo}/blob/${b.commit}/${p}`);
  const prompt = `Audit these files from ${b.repo} at commit ${b.commit}. Tell me whether an EdgeOS key (eos_live_…) could be stored, logged, returned to an AI, or sent anywhere other than api.edgeos.world: ${KEY_FILES.map((f) => at(f.path)).join(" ")}`;
  return (
    <div className="space-y-4 text-neutral-800">
      <p>Read the code that handles your key yourself, or ask your AI to. These links point at the exact commit running now:</p>
      <ul className="space-y-2">
        {KEY_FILES.map((f) => (
          <li key={f.path}>
            <a className="font-mono underline" href={at(f.path)}>{f.path}</a> <span className="text-neutral-600">— {f.why}</span>
          </li>
        ))}
      </ul>
      <p>Paste this into your AI:</p>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-neutral-100 p-3 text-sm">{prompt}</pre>
      <h3 className="font-display text-lg font-semibold">What is proven, and what you still trust</h3>
      <p><b>Proven by the public code:</b> how the key is handled, if the running commit is the one shown.</p>
      <p><b>Still trusted:</b> that the host really runs that commit. We hold the host login, so we could deploy something else. Next steps we plan: deploys only from GitHub's CI with signed build records, and later a hardware enclave that proves which code is running.</p>
      <h3 className="font-display text-lg font-semibold">What we measure</h3>
      <p>Per tool call: tool name, success or error, duration, which AI app, the AI's one-line reason for the call, and a hashed id that can't be turned back into your key or name. Never: what you asked, event details, names, or your key. Hosting reviews send the proposed event's text (not your key, not attendee lists) to a second AI model to check it against our guidelines.</p>
    </div>
  );
}
```

`src/app/trust/page.tsx`:

```tsx
import { Analytics } from "@/components/analytics";
import { BuildBox } from "@/components/build-box";
import { Tabs } from "@/components/tabs";
import { Analogy, Plain, Technical, Verify } from "./content";

export default async function Trust() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Analytics page="trust" />
      <a className="text-sm text-teal-800 underline" href="/">← Connect guide</a>
      <h1 className="mt-4 font-display text-4xl font-bold">How is this safe?</h1>
      <p className="mt-3 text-lg text-neutral-700">Your EdgeOS key lets an AI act as you on the Edge City calendar. Here's exactly what happens to it, at whatever depth you like.</p>
      <div className="mt-8">
        <Tabs
          tabs={[
            { id: "plain", label: "In plain words", content: <Plain /> },
            { id: "analogy", label: "Analogy", content: <Analogy /> },
            { id: "technical", label: "Technical", content: <Technical /> },
            { id: "verify", label: "Verify it yourself", content: <Verify /> },
          ]}
        />
      </div>
      <div id="where" className="mt-12">
        <BuildBox />
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Connect page**

`src/app/connect/connect-form.tsx`:

```tsx
"use client";

import { useActionState, useEffect } from "react";
import { track } from "@/components/analytics";
import type { ConnectState } from "@/lib/oauth/authorize";
import { connect } from "./actions";

export function ConnectForm({ req, clientName, keyPage }: { req: string; clientName: string; keyPage: string }) {
  const [state, action, pending] = useActionState<ConnectState, FormData>(connect, { status: "idle" });

  useEffect(() => {
    if (state.status === "ok") {
      track("key_accepted", { scopes: state.scopes.join(" ") });
      const t = setTimeout(() => window.location.assign(state.redirectTo), 2500);
      return () => clearTimeout(t);
    }
    if (state.status === "error") track("key_rejected");
  }, [state]);

  if (state.status === "ok") {
    return (
      <div className="rounded-xl border border-teal-700 bg-teal-50 p-5">
        <h2 className="font-display text-xl font-semibold">Connected to {state.popupName}</h2>
        <p className="mt-2">Your key can: {state.scopes.join(", ")}. Taking you back to {clientName}…</p>
        <p className="mt-2 text-sm text-neutral-700">Looks wrong? Make a new key at <a className="underline" href={keyPage}>{keyPage.replace("https://", "")}</a> and connect again.</p>
        <a className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 font-medium text-white" href={state.redirectTo}>Continue</a>
      </div>
    );
  }

  return (
    <form action={action} onSubmit={() => track("connect_started")} className="space-y-4">
      <input type="hidden" name="req" value={req} />
      <label htmlFor="key" className="block font-medium">Your EdgeOS API key</label>
      <input
        id="key"
        name="key"
        type="password"
        autoComplete="off"
        spellCheck={false}
        required
        placeholder="eos_live_…"
        className="w-full rounded-lg border border-neutral-300 px-3 py-3 font-mono focus-visible:outline-2 focus-visible:outline-teal-700"
      />
      <p className="text-sm text-neutral-600">Don't have one? <a className="underline" href={keyPage}>Make a key in the Edge City portal</a>.</p>
      {state.status === "error" && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{state.message}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-teal-700 px-4 py-3 font-medium text-white hover:bg-teal-800 disabled:opacity-60">
        {pending ? "Checking with EdgeOS…" : "Connect"}
      </button>
    </form>
  );
}
```

`src/app/connect/page.tsx`:

```tsx
import { Analytics } from "@/components/analytics";
import { agenticAccessUrl } from "@/lib/env";
import { readAuthRequest } from "@/lib/oauth/authorize";
import { ConnectForm } from "./connect-form";

export const dynamic = "force-dynamic";

export default async function Connect({ searchParams }: { searchParams: Promise<{ req?: string }> }) {
  const { req = "" } = await searchParams;
  const auth = req ? await readAuthRequest(req) : null;
  return (
    <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <Analytics page="connect" />
      <h1 className="font-display text-3xl font-bold">Connect your EdgeOS key</h1>
      {auth ? (
        <>
          <p className="mt-3 text-neutral-700">
            <b>{auth.clientName}</b> wants to use the Edge City calendar as you. Paste your key below. We check it with EdgeOS, lock it inside a token for {auth.clientName}, and keep no copy.
          </p>
          <div className="mt-6">
            <ConnectForm req={req} clientName={auth.clientName} keyPage={agenticAccessUrl()} />
          </div>
          <p className="mt-6 text-sm text-neutral-600"><a className="underline" href="/trust">How is this safe?</a></p>
        </>
      ) : (
        <p className="mt-3 rounded-lg bg-amber-50 p-4 text-amber-900">This sign-in link has expired or is incomplete. Go back to your AI app and connect again.</p>
      )}
    </main>
  );
}
```

- [ ] **Step 7: Run tests, build, and look at it**

Run: `pnpm test && pnpm typecheck && pnpm lint && PUBLIC_ORIGIN=http://localhost:3000 TOKEN_SECRETS=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))") pnpm build`
Expected: PASS and a successful build.

Then run `pnpm dev`, open `/`, `/trust` and `/connect` at desktop width and at 390px; check every tab renders, the Mermaid diagrams draw, nothing scrolls sideways, and text contrast is readable.

- [ ] **Step 8: Commit**

```bash
git add src/app src/components tests/app vitest.config.ts package.json pnpm-lock.yaml
git commit -m "feat(web): connect guide, trust page and key connect form

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Ops scripts, CI, README, and live verification

**Files:**
- Create: `scripts/set-token-secret.ts`, `scripts/smoke.ts`, `.github/workflows/ci.yml`, `.github/workflows/spec-drift.yml`, `README.md`, `public/guide/*.png` (screenshots)
- Modify: `src/app/page.tsx` (verified click paths + screenshots)
- Test: manual live checks recorded in the PR/commit message

**Interfaces:**
- Consumes: `detectAccess`, `edgeos`, everything deployed.

- [ ] **Step 1: `scripts/set-token-secret.ts`**

```ts
// Generates a TOKEN_SECRETS value and hands it straight to the host without
// printing it, so the operator never holds the secret.
//   pnpm secret:new --vercel production   → pipes into `vercel env add TOKEN_SECRETS production --sensitive`
//   pnpm secret:new --pipe | <your host's secret command reading stdin>
// For rotation, pass --keep-old to prepend the new secret to the existing list
// is NOT possible without reading the old one; instead add a second var by hand
// in the host UI, or accept that rotation signs everyone out.

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const secret = randomBytes(32).toString("base64url");
const args = process.argv.slice(2);

if (args[0] === "--pipe") {
  process.stdout.write(secret);
} else if (args[0] === "--vercel") {
  const env = args[1] ?? "production";
  const r = spawnSync("vercel", ["env", "add", "TOKEN_SECRETS", env, "--sensitive"], {
    input: secret,
    stdio: ["pipe", "inherit", "inherit"],
    shell: process.platform === "win32",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
  console.error(`TOKEN_SECRETS set for ${env} as a sensitive (write-only) variable. It was never printed.`);
} else {
  console.error("Usage: pnpm secret:new --vercel <environment> | --pipe");
  process.exit(2);
}
```

Check `vercel env add --help` for the sensitive flag name in the installed CLI before first use; if the host isn't Vercel, use `--pipe` into that host's CLI.

- [ ] **Step 2: `scripts/smoke.ts`**

```ts
// Live check against EdgeOS with a real test key. Reads EDGEOS_TEST_KEY from
// the environment (e.g. `node --env-file=.env.local`); never prints the key.
//   pnpm smoke                       → detect popup + scopes, list next 2 days
//   pnpm smoke --rsvp <event_id>     → RSVP then cancel, to prove writes work

import { detectAccess } from "../src/lib/edgeos/detect";
import { edgeos } from "../src/lib/edgeos/client";
import type { EdgeEvent, ListModel } from "../src/lib/edgeos/types";
import { formatIstRange, istDate, istDayWindow } from "../src/lib/time";

const key = process.env.EDGEOS_TEST_KEY;
if (!key) throw new Error("Set EDGEOS_TEST_KEY");
const r = await detectAccess(key);
console.log(JSON.stringify({ ...r }, null, 2));
if (!r.ok) process.exit(1);
const w = istDayWindow(istDate(new Date()), 2);
const list = await edgeos<ListModel<EdgeEvent>>(key, "GET", "/events/portal/events", {
  query: { popup_id: r.popup.id, event_status: "published", start_after: w.startAfter, start_before: w.startBefore },
});
for (const e of list.results.slice(0, 10)) console.log(`${formatIstRange(e.start_time, e.end_time)}  ${e.title}  (${e.id})`);

const i = process.argv.indexOf("--rsvp");
if (i > 0) {
  const id = process.argv[i + 1];
  console.log("RSVP:", await edgeos(key, "POST", `/event-participants/portal/register/${id}`, { body: {} }));
  console.log("Cancel:", await edgeos(key, "POST", `/event-participants/portal/cancel-registration/${id}`, { body: {} }));
}
```

Change the `smoke` script in `package.json` to `"smoke": "tsx --env-file-if-exists=.env.local scripts/smoke.ts"`.

- [ ] **Step 3: CI workflows**

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
        env:
          PUBLIC_ORIGIN: https://ci.invalid
```

`.github/workflows/spec-drift.yml`:

```yaml
name: EdgeOS spec drift
on:
  schedule: [{ cron: "30 1 * * *" }] # 07:00 IST
  workflow_dispatch:
permissions:
  contents: write
  pull-requests: write
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm spec:sync
      - id: policy
        run: pnpm policy:check
        continue-on-error: true
      - uses: peter-evans/create-pull-request@v7
        with:
          branch: chore/edgeos-spec-sync
          title: "chore: EdgeOS spec changed upstream"
          commit-message: "chore: sync EdgeOS spec snapshot"
          body: |
            The daily sync found changes in the EdgeOS OpenAPI spec${{ steps.policy.outcome == 'failure' && ' and the API-key route policy (update spec/route-policy.json; see the job log)' || '' }}.
            Review the generated reference and guides before merging.
```

- [ ] **Step 4: README**

`README.md`:

```md
# ECI Events MCP

Use the Edge City India 2026 events calendar (EdgeOS) from claude.ai, ChatGPT, Claude Code and other MCP clients: find events, RSVP, host events and manage venues with your own EdgeOS key.

Community project, not run by Edge City.

- **Connect:** add `<this site>/api/mcp` as a custom connector. No token in the URL; you paste your EdgeOS key once on our connect page.
- **Safety:** your key is never stored. See `/trust` on the live site and `docs/superpowers/specs/2026-10-06-eci-events-mcp-design.md`.

## Develop

pnpm install
cp .env.example .env.local   # set PUBLIC_ORIGIN and TOKEN_SECRETS
pnpm dev
pnpm test && pnpm typecheck && pnpm lint

## Operate

- `pnpm secret:new --vercel production` sets TOKEN_SECRETS without printing it. Rotating it signs every attendee out.
- `pnpm spec:sync` refreshes the EdgeOS spec snapshot and generated instructions; a daily Action opens a PR when it changes.
- `pnpm smoke` checks a real key (EDGEOS_TEST_KEY) against EdgeOS.
- In PostHog project settings, turn on “Discard client IP data”.
```

- [ ] **Step 5: Live verification (needs the operator)**

1. Ask the operator for a test EdgeOS key with all scopes, set as `EDGEOS_TEST_KEY` in `.env.local` by them (don't read the file). Run `pnpm smoke`. Expected: `probes` shows 404/422 for scopes the key has and 403 for ones it doesn't. If any present scope shows 403 or an absent one shows 404, the probe for that scope is wrong: record it, and change `detectAccess` so that scope is always treated as present (spec §6 fallback). Then run `pnpm smoke --rsvp <a real upcoming event id>` and confirm both calls succeed.
2. Using the browser tools, open claude.ai → Settings → Connectors and ChatGPT → Settings → Apps & Connectors. Check the click paths in `src/app/page.tsx` match exactly; fix any wording. Take one screenshot per step (cropped to the relevant panel, no personal info) into `public/guide/claude-1.png` … and `public/guide/chatgpt-1.png` …, and add them under each step with `<img src="/guide/claude-1.png" alt="…" className="rounded-lg border" />`.
3. Once the operator has supplied the domain and deployed (they choose the host): set `PUBLIC_ORIGIN`, run `pnpm secret:new` for the host, deploy, then add the connector in claude.ai and in ChatGPT, connect with the test key, and ask "what's on today?". Expected: IST times, the connect page showed the detected scopes, and `/trust` shows the deployed commit.

- [ ] **Step 6: Commit**

```bash
git add scripts .github README.md public src/app/page.tsx package.json
git commit -m "chore: ops scripts, CI, spec drift action, README and verified guide

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Task 16: "How it works" page: everything we tell the AI, in three layers

Publicly shows, verbatim, every piece of text this server injects into a model and every tool definition, explained at three depths. Linked from `/`, `/trust` and the README.

**Files:**
- Create: `src/mcp/catalog.ts`, `src/mcp/propose/check-list.ts`, `src/app/how-it-works/page.tsx`, `src/app/how-it-works/layers.tsx`
- Modify: `package.json` (move `@modelcontextprotocol/client` to dependencies), `vitest.config.ts`, `src/app/page.tsx` and `src/app/trust/page.tsx` (links), `CLAUDE.md` (rule), `CHANGELOG.md`
- Test: `tests/mcp/catalog.test.ts`, `tests/app/how-it-works.test.tsx`

**Interfaces:**
- Consumes: `buildServer`, `SERVER_INSTRUCTIONS`, `buildInitialize`, `GUIDES`, `STEERING`, `RUBRIC`, `PROMPTS`, `ACTIONS`, `SPEC_VERSION`, `readContextSection`, `proposeContextSection`, `spec/route-policy.json`.
- Produces:
  - `SAMPLE_ACCESS: Access` (all scopes, popup "Edge City India", key `eos_live_SAMPLE_NOT_A_REAL_KEY_000000`, never sent anywhere)
  - `type CatalogTool = { name: string; title?: string; description: string; inputSchema: unknown; annotations?: Record<string, unknown> }`
  - `getCatalog(): Promise<{ tools: CatalogTool[]; prompts: { name: string; description?: string }[] }>`: real `tools/list` and `prompts/list` from an in-process server built for `SAMPLE_ACCESS`
  - `CHECK_LIST: { action: string; kind: "blocker" | "warning"; rule: string }[]`

- [ ] **Step 1: Write the failing tests**

Add `"tests/**/*.test.tsx"` to `include` in `vitest.config.ts`.

`tests/mcp/catalog.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getCatalog } from "@/mcp/catalog";
import { useTestSecrets } from "../helpers";

useTestSecrets();

describe("catalog", () => {
  it("lists every tool an all-scopes attendee gets, with schemas", async () => {
    const c = await getCatalog();
    const names = c.tools.map((t) => t.name);
    for (const n of ["edgeos_initialize", "edgeos_guide", "edgeos_list_events", "edgeos_venue_availability", "edgeos_propose", "edgeos_confirm"]) {
      expect(names).toContain(n);
    }
    const list = c.tools.find((t) => t.name === "edgeos_list_events");
    expect(JSON.stringify(list?.inputSchema)).toContain("from");
    expect(c.prompts.map((p) => p.name)).toContain("host_an_event");
  });

  it("makes no network calls", async () => {
    const before = globalThis.fetch;
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      throw new Error("no network");
    }) as typeof fetch;
    try {
      await getCatalog();
    } finally {
      globalThis.fetch = before;
    }
    expect(called).toBe(false);
  });
});
```

`tests/app/how-it-works.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SERVER_INSTRUCTIONS } from "@/mcp/instructions";
import { PROMPTS } from "@/mcp/prompts";
import { STEERING } from "@/mcp/propose/register";
import { RUBRIC } from "@/mcp/propose/reviewer";
import { useTestSecrets } from "../helpers";

useTestSecrets();
vi.mock("next/font/google", () => ({
  Instrument_Sans: () => ({ className: "", variable: "" }),
  Bricolage_Grotesque: () => ({ className: "", variable: "" }),
  JetBrains_Mono: () => ({ className: "", variable: "" }),
}));

const esc = (s: string) => renderToStaticMarkup(<>{s}</>);

describe("/how-it-works", () => {
  it("has three layers and shows every injected text verbatim", async () => {
    const { default: Page } = await import("@/app/how-it-works/page");
    const html = renderToStaticMarkup(await Page());
    for (const t of ["New to this", "Curious", "Technical"]) expect(html).toContain(t);
    expect(html).toContain(esc(SERVER_INSTRUCTIONS.split("\n")[0]));
    expect(html).toContain(esc(STEERING));
    expect(html).toContain(esc(RUBRIC.split("\n")[0]));
    for (const p of PROMPTS) expect(html).toContain(esc(p.text));
    expect(html).toContain("edgeos_venue_availability");
    expect(html).toContain("2026-10-06-eci-events-mcp-design.md");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/mcp/catalog.test.ts tests/app/how-it-works.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `src/mcp/catalog.ts`**

```ts
// Builds the real server for a sample attendee with every scope and asks it
// for tools/list and prompts/list in-process, so /how-it-works shows exactly
// what an AI receives. Listing makes no EdgeOS calls; the sample key goes nowhere.

import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createMcpHandler } from "@modelcontextprotocol/server";
import type { Access } from "@/lib/types";
import { buildServer } from "./server";

export const SAMPLE_ACCESS: Access = {
  key: "eos_live_SAMPLE_NOT_A_REAL_KEY_000000",
  scopes: ["events:read", "rsvp:write", "events:write", "venues:write"],
  popup: {
    id: "00000000-0000-0000-0000-000000000000",
    name: "Edge City India",
    slug: "edge-india-2026",
    startDate: "2026-10-11",
    endDate: "2026-11-01",
  },
};

export type CatalogTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema: unknown;
  annotations?: Record<string, unknown>;
};

export async function getCatalog(): Promise<{ tools: CatalogTool[]; prompts: { name: string; description?: string }[] }> {
  const handler = createMcpHandler(() => buildServer(SAMPLE_ACCESS), { responseMode: "json" });
  const authInfo = { token: "[sample]", clientId: "catalog", scopes: SAMPLE_ACCESS.scopes, extra: { access: SAMPLE_ACCESS } };
  const transport = new StreamableHTTPClientTransport(new URL("http://catalog.local/api/mcp"), {
    fetch: (url: string | URL | Request, init?: RequestInit) => handler.fetch(new Request(url, init), { authInfo }),
  });
  const client = new Client({ name: "how-it-works", version: "1.0.0" });
  await client.connect(transport);
  try {
    const [tools, prompts] = await Promise.all([client.listTools(), client.listPrompts()]);
    return {
      tools: tools.tools.map((t) => ({
        name: t.name,
        title: t.title,
        description: t.description ?? "",
        inputSchema: t.inputSchema,
        annotations: t.annotations as Record<string, unknown> | undefined,
      })),
      prompts: prompts.prompts.map((p) => ({ name: p.name, description: p.description })),
    };
  } finally {
    await client.close();
  }
}
```

Move the client package: `pnpm remove -D @modelcontextprotocol/client && pnpm add @modelcontextprotocol/client@^2.3.1`.

`buildServer` calls `instrumentServer`, a no-op without `POSTHOG_PROJECT_TOKEN`. With it set, the catalog also shows the analytics-injected `context` and `conversation_id` arguments and `get_more_tools`. That is correct: it is what the AI sees.

- [ ] **Step 4: Implement `src/mcp/propose/check-list.ts`**

```ts
// Plain-language list of every proposal check in checks.ts, shown on
// /how-it-works. Update this file whenever checks.ts changes.

export const CHECK_LIST: { action: string; kind: "blocker" | "warning"; rule: string }[] = [
  { action: "any event action", kind: "blocker", rule: "The event must exist and be visible to the attendee." },
  { action: "rsvp, cancel_rsvp", kind: "blocker", rule: "A recurring event needs one occurrence picked, and that occurrence must exist." },
  { action: "rsvp, cancel_rsvp", kind: "blocker", rule: "The event must not be over." },
  { action: "rsvp", kind: "blocker", rule: "The attendee must not already be RSVPed, and EdgeOS must say they're eligible." },
  { action: "rsvp", kind: "warning", rule: "The event looks full, or the host approves each RSVP." },
  { action: "rsvp", kind: "warning", rule: "It overlaps another event the attendee already RSVPed to that day." },
  { action: "cancel_rsvp", kind: "blocker", rule: "The attendee must currently be RSVPed." },
  { action: "create_event, update_event", kind: "blocker", rule: "It must end after it starts, start in the future, and the chosen venue must be free (EdgeOS availability check)." },
  { action: "create_event, update_event", kind: "warning", rule: "Starts between midnight and 6 AM IST (likely a UTC mix-up), is shorter than 15 minutes or longer than 6 hours, has no description or place, or falls outside the popup's dates." },
  { action: "create_event, update_event, venue changes", kind: "warning", rule: "Optional second-model review against the hosting guidelines; its notes are labelled as a second opinion." },
  { action: "cancel_event", kind: "warning", rule: "People have RSVPed; the attendee should tell them." },
  { action: "invite", kind: "warning", rule: "More than 20 invitations at once." },
  { action: "delete_venue", kind: "warning", rule: "Upcoming events use the venue." },
  { action: "every change", kind: "blocker", rule: "The proposal code expires after 10 minutes, works only for the attendee who proposed it, and carries the exact change, so nothing can be swapped before confirming." },
];
```

- [ ] **Step 5: Implement the page**

`src/app/how-it-works/layers.tsx`:

```tsx
import { Mermaid } from "@/components/mermaid";
import { GUIDES } from "@/generated/guides";
import { SPEC_VERSION } from "@/generated/reference";
import { REPO_URL } from "@/lib/env";
import { formatIst } from "@/lib/time";
import { type CatalogTool, SAMPLE_ACCESS } from "@/mcp/catalog";
import { buildInitialize } from "@/mcp/initialize";
import { SERVER_INSTRUCTIONS } from "@/mcp/instructions";
import { PROMPTS } from "@/mcp/prompts";
import { ACTIONS } from "@/mcp/propose/actions";
import { CHECK_LIST } from "@/mcp/propose/check-list";
import { proposeContextSection, STEERING } from "@/mcp/propose/register";
import { RUBRIC } from "@/mcp/propose/reviewer";
import { readContextSection } from "@/mcp/tools/read";
import policy from "../../../spec/route-policy.json";

const SPEC_PATH = "docs/superpowers/specs/2026-10-06-eci-events-mcp-design.md";
const SAMPLE_NOW = "2026-10-14T06:00:00Z";

function Pre({ children }: { children: string }) {
  return (
    <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg border border-neutral-200 bg-neutral-50 p-4 font-mono text-[13px] leading-relaxed">
      {children}
    </pre>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-10 font-display text-xl font-semibold">{children}</h3>;
}

export function NewToThis() {
  return (
    <div className="space-y-4 text-lg text-neutral-800">
      <p>Claude and ChatGPT can use “connectors”: small services that let them do things for you. This is one. It lets your AI read the Edge City calendar and, if you allow it, RSVP or host events for you.</p>
      <p>When you ask “what's on tonight?”, your AI doesn't guess. It asks this connector, which asks the Edge City system (EdgeOS) as you, and passes back the real list.</p>
      <p>We also give the AI a short set of house rules. The main ones: never make things up, always use India time, and never change anything, like an RSVP, until you've seen exactly what will happen and said yes. Every word of those rules is in the “Technical” tab. Nothing is hidden.</p>
      <p>Your EdgeOS key stays locked the whole time. See <a className="underline" href="/trust">How is this safe?</a></p>
      <Mermaid
        caption="Asking a question"
        chart={`flowchart LR
  You -->|"what's on tonight?"| AI[Your AI]
  AI -->|asks, following our house rules| Us[This connector]
  Us -->|as you| EdgeOS
  EdgeOS -->|real events| Us
  Us -->|events in India time| AI
  AI -->|answer| You`}
      />
      <Mermaid
        caption="Changing something: you always see it first"
        chart={`flowchart LR
  A[You: RSVP me to the breathwork] --> B[AI asks us to check it]
  B --> C[We check: full? clashing? already over?]
  C --> D[AI shows you the exact summary and any warnings]
  D -->|you say yes| E[Only then is the RSVP made]
  D -->|you say no| F[Nothing happens]`}
      />
    </div>
  );
}

export function Curious({ tools }: { tools: CatalogTool[] }) {
  const reads = tools.filter(
    (t) => t.annotations?.readOnlyHint && !["edgeos_initialize", "edgeos_guide", "edgeos_propose"].includes(t.name),
  );
  return (
    <div className="space-y-4 text-neutral-800">
      <p>A connector gives an AI three kinds of things. Here is what ours contains.</p>
      <H>1. Instructions</H>
      <p>Text the AI reads so it behaves well, in four layers from always-on to on-demand:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li><b>Server instructions</b>: a few lines every AI app receives when it connects.</li>
        <li><b>Start-here tool</b> (<code>edgeos_initialize</code>): the AI calls it first. It says today's date in India time, what your key allows, the rules, and which tools to use. Because it arrives as the latest tool result, the rules stay fresh in long chats.</li>
        <li><b>Guides</b> (<code>edgeos_guide</code>): deeper notes on one topic (schedule, recurring events, RSVPs, hosting, venues, limits) plus the exact EdgeOS fields, generated from EdgeOS's own published API description.</li>
        <li><b>Nudges at the moment of action</b>: when the AI proposes a change, our reply carries the summary to show you, any warnings, the matching guideline, and the instruction to wait for your yes.</li>
      </ul>
      <H>2. Tools</H>
      <p>Actions the AI can take. You only get the ones your key allows.</p>
      <ul className="list-disc space-y-1 pl-5">
        {reads.map((t) => (
          <li key={t.name}><code>{t.name}</code>: {t.description}</li>
        ))}
        <li><code>edgeos_propose</code> then <code>edgeos_confirm</code>: every change, in two steps. Changes available: {Object.keys(ACTIONS).join(", ")}.</li>
      </ul>
      <H>3. Prompts</H>
      <p>Ready-made starting points you can pick in your AI app: {PROMPTS.map((p) => p.title).join(", ")}.</p>
      <H>The checks before any change</H>
      <ul className="list-disc space-y-1 pl-5">
        {CHECK_LIST.map((c) => (
          <li key={c.rule}><b>{c.kind === "blocker" ? "Stops it" : "Warns"}</b> ({c.action}): {c.rule}</li>
        ))}
      </ul>
      <H>Where the instructions come from</H>
      <p>Field names and allowed values come from EdgeOS's published API description (OpenAPI, version {SPEC_VERSION}), saved in the repo and checked daily; if EdgeOS changes, a pull request shows exactly what changed. The house rules and guides are written by us and live in the <code>guides/</code> folder.</p>
    </div>
  );
}

export function Technical({ tools, prompts }: { tools: CatalogTool[]; prompts: { name: string; description?: string }[] }) {
  const sampleInit = buildInitialize(SAMPLE_ACCESS, new Date(SAMPLE_NOW), [readContextSection, proposeContextSection]);
  return (
    <div className="space-y-4 text-neutral-800">
      <p>
        Everything below is rendered from the running code, not copied by hand. Source: <a className="underline" href={REPO_URL}>{REPO_URL.replace("https://", "")}</a>. Design spec: <a className="underline" href={`${REPO_URL}/blob/main/${SPEC_PATH}`}>{SPEC_PATH}</a>.
      </p>

      <H>Protocol</H>
      <p>Streamable HTTP at <code>/api/mcp</code>, MCP 2026-07-28 (stateless, no session), with 2025-11-25 clients served by the SDK's legacy handling. A fresh <code>McpServer</code> is built per request for the caller's scopes. Auth is OAuth 2.1 with PKCE S256, CIMD and DCR clients, and sealed JWE tokens; see <a className="underline" href="/trust">/trust</a>.</p>

      <H>Server instructions (sent on connect)</H>
      <Pre>{SERVER_INSTRUCTIONS}</Pre>

      <H><code>edgeos_initialize</code> output for a sample attendee with every scope, at {formatIst(SAMPLE_NOW)}</H>
      <Pre>{sampleInit}</Pre>

      <H>Tools exactly as the AI receives them ({tools.length})</H>
      {tools.map((t) => (
        <details key={t.name} className="rounded-lg border border-neutral-200 p-3">
          <summary className="cursor-pointer font-mono">
            {t.name}
            {t.annotations?.readOnlyHint ? " · read-only" : ""}
            {t.annotations?.destructiveHint ? " · makes changes" : ""}
          </summary>
          <p className="mt-2">{t.description}</p>
          <Pre>{JSON.stringify({ inputSchema: t.inputSchema, annotations: t.annotations }, null, 2)}</Pre>
        </details>
      ))}

      <H>Proposal steering (added to every proposal reply)</H>
      <Pre>{STEERING}</Pre>

      <H>Second-model reviewer rubric (hosting and venue proposals, when enabled)</H>
      <Pre>{RUBRIC}</Pre>
      <p>Sent to a Gemini model on Vertex AI together with the hosting or venues guide and the proposal's fields. Never sent: keys or attendee lists.</p>

      <H>Prompts ({prompts.length})</H>
      {PROMPTS.map((p) => (
        <div key={p.name}>
          <p className="font-mono">{p.name}: {p.description}</p>
          <Pre>{p.text}</Pre>
        </div>
      ))}

      <H>Guides (served by <code>edgeos_guide</code>, and quoted in proposals)</H>
      {Object.entries(GUIDES).map(([k, v]) => (
        <details key={k} className="rounded-lg border border-neutral-200 p-3">
          <summary className="cursor-pointer font-mono">{k}</summary>
          <Pre>{v}</Pre>
        </details>
      ))}

      <H>Write actions</H>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left"><th className="py-2">Action</th><th>Needs</th><th>Second-model review</th></tr>
          </thead>
          <tbody>
            {Object.entries(ACTIONS).map(([n, a]) => (
              <tr key={n} className="border-b"><td className="py-2 font-mono">{n}</td><td>{a.scope}</td><td>{a.reviewed ? "yes, if enabled" : "no"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <H>EdgeOS routes an API key can reach (copied from EdgeOS's own policy)</H>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left"><th className="py-2">Method</th><th>Path</th><th>Scope</th></tr>
          </thead>
          <tbody>
            {policy.map((r) => (
              <tr key={`${r.method}${r.path}`} className="border-b">
                <td className="py-2 font-mono">{r.method}</td>
                <td className="font-mono">{r.path}{r.exact ? "" : "…"}</td>
                <td>{r.scopes.join(" or ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H>Analytics</H>
      <p>PostHog MCP Analytics records one event per tool call: tool name, success or error, duration, AI app and model, the AI's one-line reason (a <code>context</code> argument PostHog adds), a conversation id, argument names, and a salted hash of the key's public prefix. Argument values and responses are deleted before sending; no person profiles; IP addresses discarded. Proposal events record the action, the warning count, and whether it was confirmed.</p>
    </div>
  );
}
```

`src/app/how-it-works/page.tsx`:

```tsx
import { Analytics } from "@/components/analytics";
import { Tabs } from "@/components/tabs";
import { getCatalog } from "@/mcp/catalog";
import { Curious, NewToThis, Technical } from "./layers";

export const revalidate = 3600;

export default async function HowItWorks() {
  const { tools, prompts } = await getCatalog();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Analytics page="how_it_works" />
      <a className="text-sm text-teal-800 underline" href="/">← Connect guide</a>
      <h1 className="mt-4 font-display text-4xl font-bold">I don't know how this works</h1>
      <p className="mt-3 text-lg text-neutral-700">Here's everything this connector tells your AI and every action it can take, explained three ways. Pick your depth.</p>
      <div className="mt-8">
        <Tabs
          tabs={[
            { id: "new", label: "New to this", content: <NewToThis /> },
            { id: "curious", label: "Curious", content: <Curious tools={tools} /> },
            { id: "technical", label: "Technical", content: <Technical tools={tools} prompts={prompts} /> },
          ]}
        />
      </div>
    </main>
  );
}
```

Links. In `src/app/page.tsx`, after the trust/where section:

```tsx
      <p className="mt-8 text-neutral-700">
        Want to see exactly what your AI is told? <a className="font-medium text-teal-800 underline" href="/how-it-works">I don't know how this works</a>
      </p>
```

In `src/app/trust/page.tsx`, under the intro paragraph:

```tsx
      <p className="mt-2 text-neutral-700">Every instruction we give the AI is public on <a className="underline" href="/how-it-works">How it works</a>.</p>
```

`CLAUDE.md`, add: `- When you add or change a proposal check in checks.ts, update src/mcp/propose/check-list.ts.`

`CHANGELOG.md`, under `## [Unreleased]` → `### Added`: `- "I don't know how this works" page showing every instruction, tool definition, prompt and guide the AI receives, at three levels of detail.`

- [ ] **Step 6: Run tests and build**

Run: `pnpm test && pnpm typecheck && pnpm lint && PUBLIC_ORIGIN=http://localhost:3000 TOKEN_SECRETS=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))") pnpm build`
Expected: PASS. In `pnpm dev`, open `/how-it-works`, check all three tabs at desktop width and 390px, and that the tool count matches what `edgeos_initialize` lists for an all-scopes key.

- [ ] **Step 7: Commit (two atomic commits)**

```bash
git add src/mcp/catalog.ts src/mcp/propose/check-list.ts tests/mcp/catalog.test.ts package.json pnpm-lock.yaml
git commit -m "feat(mcp): in-process tool catalog and public check list

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git add src/app/how-it-works src/app/page.tsx src/app/trust/page.tsx tests/app/how-it-works.test.tsx vitest.config.ts CLAUDE.md CHANGELOG.md
git commit -m "feat(web): how-it-works page showing every instruction and tool the AI receives

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Release 1.0.0

Runs after Task 15's live verification passes on the operator's domain.

- [ ] **Step 1:** In `CHANGELOG.md`, rename `## [Unreleased]` to `## [1.0.0] - <today's date>` and add a fresh empty `## [Unreleased]` above it. Set `package.json` `version` to `1.0.0`.
- [ ] **Step 2:** Run `pnpm test && pnpm typecheck && pnpm lint`. Expected: PASS.
- [ ] **Step 3:** Commit, tag, push.

```bash
git add CHANGELOG.md package.json
git commit -m "chore: release 1.0.0

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git tag v1.0.0
git push && git push --tags
```
