# ECI Events MCP — Design

Date: 2026-10-06
Status: approved in conversation, awaiting written-spec review
Repo: `Nhajela/eci-events-mcp` (public)
Origin: set by the `PUBLIC_ORIGIN` env var (production domain to be supplied by the operator). Clients add `<PUBLIC_ORIGIN>/api/mcp`; no token or key goes in the URL, OAuth handles the key.

## 1. Purpose

An MCP server that lets Edge City India 2026 attendees (Mandrem, Goa, 11 Oct – 1 Nov 2026) use the EdgeOS Events API from claude.ai, ChatGPT, Claude Code and other MCP clients: read the schedule, RSVP, host events and manage venues, as far as their own EdgeOS key allows.

It is a community project, not an official Edge City product.

### Success criteria

1. A non-technical attendee can go from the landing page to asking "what's on tonight?" in claude.ai or ChatGPT in under five minutes.
2. An attendee's `eos_live_` key is never visible to any AI model, MCP client, log, database, or to the operator, short of the operator deliberately deploying code that captures it.
3. The `/trust` page explains why (2) holds at four levels (plain, analogy, technical, verify-it-yourself) and states exactly what is proven and what is still trusted.
4. Writes go through propose → confirm, and the adherence rate (proposals warned, blocked, confirmed, abandoned) is measurable in PostHog.

### What the user said vs. what we assumed

Said: Next.js app; any attendee connects with their own key; OAuth with a paste-key page; stateless (no DB); key must not be exposed to admin or AI; all capabilities gated by the attendee's key; kx-tools / kx-tess / ps-tools patterns (initialize tool, guides, propose → confirm with injected steering and optional AI reviewer); instructions generated from the API spec plus our guidelines and cached; PostHog MCP analytics, roughly anonymous; landing page is an easy guide for claude.ai and ChatGPT plus "why you can trust this" and "where this runs"; provability level 1 now, levels 2/3 later; MCP 2026-07-28 with backwards compatibility, including DCR.

Assumed: hosting is undecided, so nothing may depend on a host-specific feature beyond env vars and a Next.js runtime; reviewer model defaults to Gemini Flash via Vertex (operator's credits); repo is public under Nhajela.

## 2. Upstream: EdgeOS

- Base: `https://api.edgeos.world/api/v1`. OpenAPI: `https://api.edgeos.world/openapi.json`.
- Attendees mint personal keys at the EdgeOS portal `/portal/agentic-access`. Format `eos_live_` + 32 chars. EdgeOS stores only a peppered hash; keys can be revoked and can expire; write scopes require an expiry. Each key is bound to one popup.
- Scopes: `events:read`, `venues:read`, `rsvp:write`, `events:write`, `venues:write`.
- API keys may only call routes in EdgeOS's `_PAT_ROUTE_POLICIES` (`backend/app/core/security.py` in `p2p-lanes/edgeos-monorepo`), matched by method and path prefix:

| Method | Path prefix | Scope (any of) |
|---|---|---|
| GET | `/events/portal/events` | events:read |
| GET | `/event-participants/portal/participants` | events:read |
| GET | `/event-participants/portal/eligibility/` | events:read |
| GET | `/event-venues/portal/venues` | events:read, venues:read |
| GET | `/event-settings/portal/settings` | events:read |
| GET | `/tracks/portal/tracks` | events:read |
| GET | `/popups/portal/list` (exact), `/popups/portal/` | events:read |
| POST | `/events/portal/events` (exact), `/events/portal/events/` | events:write |
| POST | `/event-venues/portal/venues` (exact) | venues:write |
| POST | `/event-participants/portal/register/`, `/cancel-registration/` | rsvp:write |
| PATCH | `/event-venues/portal/venues/` | venues:write |
| PATCH | `/events/portal/events/` | events:write |
| DELETE | `/event-venues/portal/venues/`, `/events/portal/events/` | venues:write / events:write |

Not reachable with a key (and therefore out of scope): event messages, check-in and attendance, admin notes, attendance mode, popup tags, attendee directory, `/humans/me`, `/third-party-apps/whoami`.

Conventions we rely on: list endpoints return `{results, paging}`; the events list is not paginated and needs `start_after`/`start_before` to expand recurring events into occurrences; times are UTC ISO-8601; the village timezone is `Asia/Kolkata`; masked directory-style fields come back as `"*"`.

## 3. Architecture

One Next.js app (App Router, pnpm, Biome, Vitest), no database.

```
src/app/
  page.tsx                 Connect guide (landing)
  trust/page.tsx           How is this safe
  connect/page.tsx         OAuth authorize UI: paste key
  api/mcp/route.ts         MCP endpoint (POST = handler.fetch)
  api/build-info/route.ts  { commit, builtAt, repo, deployMethod }
  oauth/authorize|token|register/route.ts
  api/oauth-metadata, api/oauth-resource-metadata  (.well-known rewrites in next.config.ts, as kx-tools)
src/lib/seal.ts            The only module that encrypts/decrypts. JWE dir + A256GCM via `jose`.
src/lib/edgeos/            Typed client (types generated from the spec snapshot); error scrubbing
src/lib/oauth/             PKCE, CIMD fetch + validation, DCR client_id sealing, metadata docs
src/mcp/server.ts          Per-request factory: instructions, initialize, guide, propose/confirm, tools
src/mcp/lib/               tool-wrapper (withToolHandler), context-registry, steering text
src/mcp/tools/<group>.ts   read, rsvp, host, venues — each exports register + context section
src/mcp/propose/           checks per action, reviewer, proposal sealing
guides/*.md                Handwritten guidelines
spec/edgeos-openapi.json   Snapshot, filtered to key-reachable routes
spec/route-policy.json     Copy of EdgeOS's PAT route policy
scripts/gen-reference.ts   spec + policy + guides → src/generated/reference.ts
scripts/set-token-secret.ts  Generates TOKEN_SECRET and pipes it into the host as a write-only env var
```

The MCP endpoint uses `@modelcontextprotocol/server` v2 `createMcpHandler(factory)`. It serves 2026-07-28 clients statelessly and 2025-11-25 clients through the SDK's default legacy handling from the same factory. Response mode JSON.

## 4. Key custody: stateless sealed tokens

`TOKEN_SECRETS` env var: comma-separated 32-byte base64 secrets. The first one seals; all of them open (rotation). Each sealed payload carries `typ`, `iat`, `exp`, `aud` and a `kid`. Opening checks `typ` matches the expected kind, so no artifact can stand in for another.

| Artifact | Payload | Lifetime |
|---|---|---|
| DCR `client_id` | redirect_uris, client_name, application_type | until secret rotation |
| authorize request (`/connect?req=`) | client_id, redirect_uri, code_challenge, state, resource, client name | 10 min |
| auth code | key, scopes, popup, client_id, redirect_uri, code_challenge, resource | 60 s |
| access token | key, scopes, popup, aud = `<origin>/api/mcp` | 1 h |
| refresh token | key, scopes, popup, client_id | until 2026-11-15T00:00:00+05:30 |
| proposal code | action, params, key prefix, summary hash | 10 min |

Rules:

- The raw key exists only (a) in the attendee's browser on `/connect`, (b) in server memory during a request. It is never logged, never returned in tool output, and stripped from every EdgeOS error string by a regex scrub (`eos_live_[A-Za-z0-9_-]+` → `eos_live_[redacted]`).
- Nothing logs `Authorization` headers or request bodies. The tool wrapper logs tool name, status, duration, error code and the HMAC'd key prefix only.
- `scripts/set-token-secret.ts` generates the secret and pipes it to the host's env (write-only/"sensitive" where the host supports it) without printing it, so the operator never holds it.
- Revocation: per attendee by revoking the key in EdgeOS; globally by rotating `TOKEN_SECRETS`.
- Accepted deviations: an auth code is replayable within 60 s (harmless without the PKCE verifier); no server-side revocation of a single token; no list of connected users.

## 5. OAuth (MCP 2026-07-28 with backwards compatibility)

- `/api/mcp` without a valid token → `401` with `WWW-Authenticate: Bearer resource_metadata="<origin>/.well-known/oauth-protected-resource"`.
- Protected resource metadata (RFC 9728) at both `/.well-known/oauth-protected-resource` and the `/api/mcp`-suffixed form.
- Authorization server metadata (RFC 8414): `authorization_endpoint`, `token_endpoint`, `registration_endpoint`, `code_challenge_methods_supported: ["S256"]`, `client_id_metadata_document_supported: true`, `authorization_response_iss_parameter_supported: true`, grant types `authorization_code` and `refresh_token`, `token_endpoint_auth_methods_supported: ["none"]`.
- Client identification:
  - CIMD: an https `client_id` URL. Fetch the document (5 s timeout, 64 KB cap, in-memory cache for the instance's life), require its `client_id` to equal the URL, and check `redirect_uri` against its `redirect_uris`.
  - DCR (deprecated, kept): `POST /oauth/register` returns a sealed `client_id`. Loopback redirect URIs (`http://localhost`, `127.0.0.1`, `[::1]`) are accepted unless `application_type` is explicitly `web`, because 2025-era clients (e.g. Claude Code) omit `application_type`. Loopback redirects match regardless of port (RFC 8252).
- `/oauth/authorize` validates client and redirect, then renders `/connect` with the request bound in a sealed hidden field. On submit: validate the key (§6 probe), mint the code, redirect with `code`, `state` and `iss`.
- `/oauth/token`: `authorization_code` (verify PKCE S256, redirect_uri, client_id, `resource` if sent) and `refresh_token` (re-issue both). Public clients only.
- Errors follow RFC 6749 JSON shapes.

## 6. Scope detection

At `/connect` submit:

1. `GET /popups/portal/list` with the key. 401 → "key not recognised or revoked". 403 → the key lacks `events:read`; connecting is refused with "make a key with Read events ticked" (EdgeOS's key form always includes `events:read`, and we need it to find the popup). On success, record the popup the key is bound to (id, name, slug).
2. For each write scope, send a side-effect-free probe: a write to a random UUID (`POST /event-participants/portal/register/<uuid>`, `POST /events/portal/events/<uuid>/cancel`, `PATCH /event-venues/portal/venues/<uuid>`). 403 → scope missing; 404/422 → scope present. This relies on EdgeOS enforcing the route policy before the handler runs, which `_enforce_api_key_policy` does in the auth dependency.
3. Seal the detected scopes into the code and tokens.

Verification: the first implementation task with a live key confirms (2). If any probe can't tell the two apart, that scope falls back to "assumed present", and the tools return a clear message on 403: "Your key doesn't have `rsvp:write`. Make a new key at <portal>/portal/agentic-access with that box ticked, then reconnect."

The connect page shows the detected scopes before redirecting, with "Looks wrong? Make a new key" guidance.

## 7. MCP surface

### Server instructions (connect-time, short)

Who the server is for; never fabricate; show times in IST; every write goes through `edgeos_propose` then `edgeos_confirm` after an explicit yes; never ask the user to paste their key into chat; call `edgeos_initialize` first.

### `edgeos_initialize` (gateway)

Returns markdown composed of: the popup name and dates; today's date and time in IST; detected scopes; cardinal rules (mirroring instructions); one context section per tool group the attendee's scopes allow (via a `ContextSection` registry, as ps-tools); the list of things EdgeOS doesn't offer to keys (§2), so the agent says "not available" instead of guessing.

### `edgeos_guide({ topic })`

Topics: `schedule`, `recurring`, `rsvp`, `hosting`, `venues`, `limits`. Each is built from the generated reference (parameters, enums, field meanings from the spec) plus the matching `guides/*.md`.

### Tools (registered only if the attendee's scopes allow)

| Scope | Tool | EdgeOS route |
|---|---|---|
| events:read | `edgeos_list_events` | GET events (window required; default next 7 days in IST; filters search, tags, kind, venue, track, rsvped_only, managed_only; `highlighted` filtered client-side) |
| | `edgeos_get_event` | GET events/{id}?occurrence_start |
| | `edgeos_calendar_summary` | GET events/calendar-summary |
| | `edgeos_list_participants` | GET event-participants/participants |
| | `edgeos_rsvp_eligibility` | GET event-participants/eligibility/{popup} |
| | `edgeos_list_invitations` | GET events/{id}/invitations |
| | `edgeos_list_tracks`, `edgeos_track_events` | GET tracks |
| events:read or venues:read | `edgeos_list_venues`, `edgeos_venue_availability` | GET event-venues |
| any write scope | `edgeos_propose`, `edgeos_confirm` | see §8 |

Write actions available through propose (per scope): `rsvp`, `cancel_rsvp` (rsvp:write); `check_availability` is a check inside propose, not an action; `create_event`, `update_event`, `cancel_event`, `hide_event`, `unhide_event`, `invite`, `remove_invitation` (events:write); `create_venue`, `update_venue`, `delete_venue` (venues:write).

Conventions: every time is returned as IST with the UTC value alongside; recurring rows include `occurrence_start`; results are short markdown plus `structuredContent`; reads carry `readOnlyHint`; `edgeos_confirm` carries `destructiveHint`; `tools/list` caching is left to SDK defaults (the list depends on the caller's scopes).

### Prompts

`whats_on_today`, `plan_my_week`, `host_an_event`.

### Errors (`withToolHandler`)

401 → "Your EdgeOS key was revoked or has expired. Reconnect at <origin>." 403 → names the missing scope and how to get it. 404 → "Not found, or hidden from you." 409/422 → EdgeOS detail, scrubbed. 429 → "EdgeOS is rate-limiting; wait N seconds" from `Retry-After`. Anything else → stable `INTERNAL_ERROR` text; details only in server logs (scrubbed).

## 8. Propose → confirm

`edgeos_propose({ action, params })`:

1. Validate `params` against the action's Zod schema (generated enums).
2. Run checks. Blockers stop the proposal (no code). Warnings are returned and the agent must raise them.
   - Live: event exists and is in the future; for recurring events `occurrence_start` matches a real occurrence; RSVP eligibility; already RSVPed or not RSVPed (for cancel); overlap with the attendee's other RSVPs (`rsvped_only=true` for that day); venue availability (`check-availability`) for create/update.
   - Guidelines: a start time between 00:00 and 06:00 IST (likely UTC misread); create/update without description or venue; duration over 6 h or under 15 min; cancelling an event that has RSVPs (warns with the count); deleting a venue with upcoming events (warns with the count); event outside the popup's dates.
3. Reviewer (create/update event, venue writes only; on when `REVIEWER_MODEL` is set): send the proposal and `guides/hosting.md` to the reviewer model with a fixed rubric; append its notes as warnings, labelled as a second model's view. 8 s timeout; on timeout or failure, proceed without it and say so.
4. Respond with: the plain-language summary to show the user verbatim (title, local date and time, venue, action); warnings; the guideline excerpt for this action; steering text ("Show the summary, raise each warning, and call `edgeos_confirm` only after the user explicitly says yes"); the sealed proposal code.

`edgeos_confirm({ code })`: open the code, check it isn't expired and that the caller's key prefix matches, run the exact sealed action, return the EdgeOS result as a summary.

The reviewer receives event content (titles, descriptions, times), never keys or participant lists. The trust page discloses this.

## 9. Instructions generation

- `pnpm spec:sync` fetches `openapi.json`, filters it to the routes in `spec/route-policy.json`, writes `spec/edgeos-openapi.json`, then runs `gen-reference` to produce `src/generated/reference.ts` (per-route parameters, enums, field descriptions, response shapes). EdgeOS response types used by the code are hand-written in `src/lib/edgeos/types.ts`, limited to the fields we read.
- Generated files are committed. Tool descriptions, Zod schemas and guide topics import from them.
- A daily GitHub Action runs `spec:sync` and opens a PR when anything changed, including the route policy (compared against the upstream `security.py`).

## 10. Analytics: PostHog MCP Analytics

`@posthog/mcp` `instrument(server, posthog, opts)` inside the per-request factory; `posthog.flush()` in `after()`.

- `identify`: `{ distinctId: HMAC_SHA256(POSTHOG_ID_SALT, keyPrefix) }`, personless.
- `beforeSend`: delete `$mcp_parameters` and `$mcp_response`; keep `$mcp_input_keys`.
- `context: true`, `enableConversationId: true`, `reportMissing: true`, `serverBuild: <commit sha>`.
- Custom events: `proposal_created` {action, warnings, blocked, reviewer_used}, `proposal_confirmed`, `proposal_expired_unconfirmed` (inferred: created with no confirm, computed in PostHog).
- Web: `landing_viewed`, `client_tab_selected`, `connect_started`, `key_accepted` {scopes}, `key_rejected` {reason}. No IPs (`ip: false`), no cookies beyond PostHog's memory persistence.
- The trust page lists every property collected.

## 11. Web pages

Design follows the ECI priorities: usability over aesthetics, solid high-contrast surfaces for anything to read, art only as seasoning, real places only.

### `/` Connect guide

- One line on what this is, then tabs: **claude.ai**, **ChatGPT**, **Other / Claude Code**.
- Steps per tab: (1) make a key in EdgeOS, with which boxes to tick and an expiry; (2) add the connector, with exact clicks, screenshots and a copy button for the URL; (3) paste the key on our connect page, never into a chat; (4) try it, with three example prompts.
- The ChatGPT steps (developer mode, plan requirements) and claude.ai connector steps are verified against the live products at implementation time, with screenshots taken then.
- Short "Why you can trust this" and "Where this runs" blocks linking to `/trust`.

### `/trust`

- Tabs: **In plain words**, **Analogy** (sealed envelope: we hold the letter opener but never keep envelopes), **Technical** (JWE, PKCE, CIMD/DCR, the who-can-see table, trade-offs), **Verify it yourself**. One diagram per tab (Mermaid, rendered client-side).
- "Where this runs" box, live from `/api/build-info`: host, commit (linked), build time, deploy method.
- The files that touch the key, linked at the live commit: `src/lib/seal.ts`, `src/lib/oauth/authorize.ts`, `src/lib/edgeos/client.ts`, `src/lib/scrub.ts`, `src/mcp/lib/tool-wrapper.ts`.
- A copyable prompt for the reader's own AI to audit those files.
- What is proven at level 1 and what is still trusted, in plain words; levels 2 and 3 described as planned.
- What analytics collects (§10) and what the reviewer sees (§8).

### `/how-it-works` ("I don't know how this works")

Three layers, as tabs: **New to this** (what a connector is, what the AI is told, that every change needs the attendee's yes; two diagrams), **Curious** (instructions in four layers, every tool in plain words, prompts, every proposal check, where the instructions come from), **Technical** (rendered from the running code, never copied by hand: server instructions, a sample `edgeos_initialize` output, every tool's description, input schema and annotations from a real in-process `tools/list`, proposal steering text, reviewer rubric, prompts, all guides, write actions, the EdgeOS key route policy, analytics fields, links to the repo and this spec).

Rule: every piece of text injected into a model is an exported constant or generated value, so this page can display it. No hidden prompt text.

### `/connect`

Paste-key form, link to `/portal/agentic-access`, detected scopes shown after validation, error messages that say what to fix.

## 12. Process

- Atomic commits with Conventional Commit prefixes.
- `CHANGELOG.md` in Keep a Changelog format with Semantic Versioning, starting at 0.1.0; every feat/fix adds an Unreleased line. First public deploy is 1.0.0. Patch for fixes, minor for new tools or pages, major for changes that force attendees to reconnect.

## 13. Testing

- Unit (Vitest): seal round-trip, tamper rejection, wrong-`typ` rejection, expiry, secret rotation; PKCE; CIMD validation (mismatched `client_id`, oversized doc, timeout); DCR sealing and native-localhost rule; key scrubbing; every proposal check; IST formatting and day-window conversion; error mapping.
- OAuth flow integration: full code → token → refresh for a CIMD client and a DCR client, against the Next route handlers.
- MCP: `createMcpHandler` driven with a 2026-07-28 request and a 2025-11-25 `initialize` handshake; tool registration per scope set.
- EdgeOS: recorded fixtures for every route used.
- Live smoke (`scripts/smoke.ts`, manual, needs a test key from the operator): scope probes (§6), list events, propose/confirm an RSVP and cancel it.

## 14. Out of scope (for now)

Provability levels 2 (CI-only deploys with GitHub build attestations) and 3 (TEE hosting with runtime attestation); attendee directory and profile (need a human session token); a database of any kind; non-ECI popups beyond whatever the key is bound to.
