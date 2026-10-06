# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/):
patch for fixes, minor for new tools or pages, major for changes that make attendees reconnect.

## [Unreleased]

### Added
- Next.js app scaffold, environment helpers, design spec and implementation plan.
- Sealed JWE artifacts (`src/lib/seal.ts`) with secret rotation, mandatory expiry, pinned algorithms and required access-token audience.
- Key scrubbing, pseudonymization, and IST time formatting helpers (`src/lib/scrub.ts`, `src/lib/time.ts`).
- Typed EdgeOS client with scrubbed errors, Retry-After parsing, and shared test mock (`src/lib/edgeos`, `tests/edgeos-mock.ts`).
- Popup and write-scope detection from a key using side-effect-free 403 vs 404 probes (`src/lib/edgeos/detect.ts`).

### Fixed
- EdgeOS client throws a typed error for unreadable 2xx bodies, refuses redirects, rejects unsafe paths, and caps Retry-After at 300 seconds.
- IST time formatting now normalizes narrow non-breaking spaces (U+202F) to regular spaces in all output.
