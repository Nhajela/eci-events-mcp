# ECI Events MCP

Use the Edge City India 2026 events calendar (EdgeOS) from claude.ai, ChatGPT, Claude Code and other MCP clients: find events, RSVP, host events and manage venues with your own EdgeOS key.

Community project by [@HiiNaman](https://t.me/HiiNaman), not run by Edge City.

**Live:** https://eci-events.positivesumcompany.com · MCP URL: `https://eci-events.positivesumcompany.com/api/mcp`

- **Connect:** add `<PUBLIC_ORIGIN>/api/mcp` as a custom connector (your deployed site URL + `/api/mcp`). No token in the URL; you paste your EdgeOS key once on our connect page.
- **Safety:** your key is never stored. See `/trust` on the live site and `docs/superpowers/specs/2026-10-06-eci-events-mcp-design.md`.
- **For AI agents:** paste `<site>/connect.md` to your agent and it can set itself up.
- **What the AI is told:** every instruction, tool and prompt is shown at `/how-it-works` on the live site.

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

## First deploy

1. Set `PUBLIC_ORIGIN` to the final site URL, no trailing slash. It is baked in at build time, so changing the domain needs a rebuild.
2. Set `TOKEN_SECRETS` with `pnpm -s secret:new` (see Operate below); never paste it into a chat or a file in the repo.
3. Optional analytics: `POSTHOG_PROJECT_TOKEN`, `POSTHOG_ID_SALT` and `POSTHOG_HOST`, then turn on "Discard client IP data" in the PostHog project settings. Web page analytics: `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`.
4. Optional reviewer: `REVIEWER_MODEL`, `GOOGLE_CLOUD_PROJECT`, `GEMINI_API_KEY`.
5. For the trust page's "Where this runs": `HOST_NAME` and `DEPLOY_METHOD`. When not on Vercel, also set `GIT_COMMIT_SHA` at build time so the running commit is shown.
6. `EDGEOS_API_BASE` and `EDGEOS_PORTAL_URL` are ignored in production; leave them unset.
7. Smoke test without any AI client: put a test key in `.env.local` as `EDGEOS_TEST_KEY` (not on the command line, where it lands in shell history), then run `pnpm smoke`.

## Operate

- `pnpm secret:new --vercel production` sets TOKEN_SECRETS without printing it. Rotating it signs every attendee out.
- To pipe the secret into any host, use `pnpm -s secret:new --pipe | vercel env add TOKEN_SECRETS production --sensitive`. The `-s` is required because pnpm otherwise prints a banner to stdout and corrupts the secret. (`--sensitive` is listed in `vercel env add --help` for the installed CLI.)
- `pnpm spec:sync` refreshes the EdgeOS spec snapshot and generated instructions; a daily Action opens a PR when it changes.
- PRs opened by the spec-drift workflow with the default `GITHUB_TOKEN` do not trigger CI. Push an empty commit or re-run checks before merging. The repo setting "Allow GitHub Actions to create and approve pull requests" must be on.
- `pnpm smoke` checks a real key (EDGEOS_TEST_KEY) against EdgeOS.
- In PostHog project settings, turn on "Discard client IP data".
