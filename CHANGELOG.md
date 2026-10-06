# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/):
patch for fixes, minor for new tools or pages, major for changes that make attendees reconnect.

## [Unreleased]

### Added
- Shared web components (tabs, copy button, Mermaid, build box, cookie-free web analytics) and site fonts (`src/components`, `src/app/layout.tsx`).
- Prompts (`whats_on_today`, `plan_my_week`, `host_an_event`) and opt-in pseudonymous PostHog MCP Analytics: no key, arguments or responses are sent (`src/mcp/prompts.ts`, `src/mcp/analytics.ts`).
- Optional Gemini second-opinion reviewer for hosting and venue proposals, off unless `REVIEWER_MODEL` is set (`src/mcp/propose/reviewer.ts`).
- Next.js app scaffold, environment helpers, design spec and implementation plan.
- Sealed JWE artifacts (`src/lib/seal.ts`) with secret rotation, mandatory expiry, pinned algorithms and required access-token audience.
- Key scrubbing, pseudonymization, and IST time formatting helpers (`src/lib/scrub.ts`, `src/lib/time.ts`).
- Typed EdgeOS client with scrubbed errors, Retry-After parsing, and shared test mock (`src/lib/edgeos`, `tests/edgeos-mock.ts`).
- Popup and write-scope detection from a key using side-effect-free 403 vs 404 probes (`src/lib/edgeos/detect.ts`).
- OAuth building blocks: PKCE S256 verification, authorization-server and protected-resource metadata, and stateless CIMD and DCR client resolution (`src/lib/oauth`).
- Stateless OAuth authorize, connect, token, register and metadata routes: sealed auth request, 60 s code, 1 h access and refresh-until-Nov-15 tokens, with the raw key never placed in a URL (`src/lib/oauth`, `src/app/oauth`, `src/app/connect/actions.ts`).
- Stateless `/api/mcp` endpoint (SDK v2 `createMcpHandler`, sealed-token auth with 401 resource-metadata challenge, JSON legacy leg for 2025-11-25 clients), tool wrapper with scrubbed errors and key-free logs, server instructions, and `/api/build-info`.
- Spec tooling: API-key route policy, `spec:sync`, `spec:gen` and `policy:check` scripts that filter the EdgeOS OpenAPI to key-reachable routes (`scripts/`, `spec/route-policy.json`).
- Model-facing guides for schedule, recurring events, RSVPs, hosting, venues and limits (`guides/*.md`).
- Filtered EdgeOS OpenAPI snapshot with generated route reference and guides modules (`spec/edgeos-openapi.json`, `src/generated`).
- `edgeos_initialize` gateway, `edgeos_guide` and scope-gated read tools (events, participants, tracks, venues, eligibility) with IST output (`src/mcp`).
- Propose/confirm pipeline: `edgeos_propose` runs live checks and issues a 10-minute sealed proposal code; `edgeos_confirm` carries out exactly that action.

### Fixed
- Analytics: the normal `proposal_created` and `proposal_confirmed` events are now captured, tool error text is dropped before send, and analytics stays off unless both `POSTHOG_PROJECT_TOKEN` and `POSTHOG_ID_SALT` are set.
- Propose/confirm: summaries show every sealed param, title-only updates to recurring or running events are no longer blocked, proposals bind to a hash of the whole key, impossible dates are rejected, and the overlap window covers the previous day.
- MCP endpoint: analytics stub so `next build` passes, real wrong-audience test, string-only scope check, and the legacy leg closes its per-request server.
- MCP endpoint: analytics stub so `next build` passes, real wrong-audience test, string-only scope check, and the legacy leg closes its per-request server.
- OAuth token endpoint requires `client_id` and `grant_type`, tolerates null or non-object JSON bodies, returns JSON on server errors, and omits refresh tokens past the cutoff; authorize caps key, state and challenge input and redirects against the configured origin; metadata routes answer CORS preflight.
- OAuth CIMD fetch is stream-capped at 64 KB, the client cache and redirect URI lists are bounded, and the public-host check also refuses trailing-dot, `.localhost`, CGNAT, benchmark, multicast and credentialed URLs.
- EdgeOS client throws a typed error for unreadable 2xx bodies, refuses redirects, rejects unsafe paths, and caps Retry-After at 300 seconds.
- IST time formatting now normalizes narrow non-breaking spaces (U+202F) to regular spaces in all output.
- Read tools: scope-gating and path-encoding tests, "(showing N of M)" notes on partial track and participant lists, participant output limited to safe fields, impossible dates rejected, guide topics built from the guides module.
