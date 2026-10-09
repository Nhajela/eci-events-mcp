# ECI Events MCP

Stateless MCP server for Edge City India attendees. Spec: docs/superpowers/specs/2026-10-06-eci-events-mcp-design.md

- pnpm only. `pnpm test`, `pnpm typecheck`, `pnpm lint` must pass before commit.
- Never log, return, or store an `eos_live_` key. Route every EdgeOS error through `scrubKeys`.
- `src/lib/seal.ts` is the only module that encrypts or decrypts. Keep it small: /trust links to it.
- `src/generated/*` comes from `pnpm spec:gen`; never edit by hand.
- Times shown to models are IST via `src/lib/time.ts`.
- Atomic commits; every feat/fix adds a line to CHANGELOG.md under Unreleased.
- Any text sent to a model must be an exported constant so /how-it-works can show it.
- When you add or change a proposal check in checks.ts, update src/mcp/propose/check-list.ts.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
