# Security review evidence and release limits — 2026-10-21

The application is local-only and not approved for an external paid pilot. The negative auth/tenant/SSRF, source-trust and atomic quota tests are recorded in README.md. No production database, actual customer, real email, provider request or billing operation was used.

## Dependency audit

`npm audit --omit=dev --json` after the scoped patches reports **22 affected dependency entries: 12 high, 9 moderate, 1 low; zero critical** in the monorepo production dependency graph. This is not a count of independently exploitable SaaS runtime flaws. It includes inherited CITYWALK/Cloudflare/vinext/media/build dependencies and needs reachability review/extraction before release. Examples still present: sharp, undici, braces, music-metadata, DOMPurify and older esbuild under migration tooling. No `npm audit fix --force` was run: several suggestions would downgrade/major-change unrelated framework packages.

The new SaaS dev server was updated from Vite 8.3.0 to **8.3.5** (minimum compatible range 8.3.3), addressing its reported editor-launch advisories. The [maintainer-reviewed advisory](https://github.com/advisories/GHSA-r825-w8mm-5pxw) identifies the patched release line. The compatible update also refreshed Vite's build dependencies, including source-map-js 1.2.2, PostCSS 8.5.31 and Rolldown 1.2.14. No unrelated application runtime library version changed. Playwright 1.64.1 is an explicit dev-only test dependency.

A clean `npm ci --ignore-scripts` succeeded. npm 10 crashed when changing this workspace's dependency graph; an isolated npm 11.6.4 invocation generated the lockfile, and normal npm 10 then installed it successfully. No global npm/config change. Final unit/integration/typecheck/build/browser results use the patched, clean-installed dependencies.

## Remaining release controls

- Independent review of auth/session recovery, tenant authorization, actual network egress and model-grounding controls.
- Review/deduplicate/remove inherited monorepo dependencies during the required independent repository extraction; resolve applicable advisories without indiscriminate framework downgrades.
- Deliberate remote HTTPS/TLS/secure-cookie configuration; current guards accept only the isolated local marketing DB/origin.
- Approved email delivery, privacy/legal texts, data-retention/erasure jobs, encrypted backup/restore and incident-response acceptance.
- Owner-authorized live model/quality/cost evaluation. The created API key alone never enables provider calls.

Human confirmations are evidence-bound business declarations, not independent certification. Manual edits can introduce claims and are labeled accordingly. No approval in this app grants external publishing permissions.
