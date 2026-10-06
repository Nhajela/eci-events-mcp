# ECI Events MCP

Use the Edge City India 2026 events calendar (EdgeOS) from claude.ai, ChatGPT, Claude Code and other MCP clients: find events, RSVP, host events and manage venues with your own EdgeOS key.

Community project, not run by Edge City.

- **Connect:** add `<PUBLIC_ORIGIN>/api/mcp` as a custom connector (that is the production URL). No token in the URL; you paste your EdgeOS key once on our connect page.
- **Safety:** your key is never stored. See `/trust` on the live site and `docs/superpowers/specs/2026-10-06-eci-events-mcp-design.md`.

## Develop

```bash
pnpm install
cp .env.example .env.local   # set PUBLIC_ORIGIN and TOKEN_SECRETS
pnpm dev
pnpm test && pnpm typecheck && pnpm lint
```

Optional features turn on only when their variables are set:

- Analytics runs only when `POSTHOG_PROJECT_TOKEN` and `POSTHOG_ID_SALT` are both set.
- The proposal reviewer runs only when `REVIEWER_MODEL`, `GOOGLE_CLOUD_PROJECT` and `GEMINI_API_KEY` are all set.

## Operate

- `pnpm secret:new --vercel production` sets TOKEN_SECRETS without printing it. Rotating it signs every attendee out.
- `pnpm spec:sync` refreshes the EdgeOS spec snapshot and generated instructions; a daily Action opens a PR when it changes.
- `pnpm smoke` checks a real key (EDGEOS_TEST_KEY) against EdgeOS.
- In PostHog project settings, turn on "Discard client IP data".
