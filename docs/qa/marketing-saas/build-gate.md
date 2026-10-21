# Existing repository gate repair — 2026-10-21

The Marketing SaaS audit exposed two pre-existing root quality-gate defects. Both are fixed on a separate branch, `codex/next-page-export-build-fix`, based on develop `d080f51`; no production operation or merge is included.

1. Webpack production route validation rejected named runtime exports `GenericCityContent` and `GenericPlaceContent` in App Router `page.tsx`. Move those functions and their unchanged loaders/imports into adjacent `content.tsx` modules; pages keep the exact same default wrappers and Suspense fallback. Existing tests import the helper modules directly. No content, route, locale, authentication or rendering decision is changed. Installed Next page/server-boundary docs were read first.
2. Root `db:generate` attempted a duplicate shared_walk_links migration because handwritten committed 0026 had no snapshot. Reuse **only** the existing reviewed 0026 metadata snapshot from unmerged #364 at `5cad236`, after checking the 0026 SQL is byte-identical. No staff UI/auth/persistence code is copied. Root SQL/journal/schema remain unchanged. `db:generate` now reports **No schema changes, nothing to migrate**. This does not imply #364 has merged.

Executed in an isolated checkout:
- Targeted city/place tests: **25 passed**.
- Full repository unit tests: **1,441 passed / 133 skipped** (this base branch does not contain the SaaS tests).
- Lint: **0 errors / 8 existing warnings**.
- `tsc --noEmit --incremental false`: passed after build.
- `next build --webpack`: passed, including production compilation, TypeScript and all 784 generated pages. Used a synthetic ephemeral build auth secret and an unreachable dummy loopback database port 55999, following CI's no-real-database build pattern. No .env files or production secrets were used. Default Turbopack had stalled earlier; no Next checks were disabled.
- `db:generate`: passed, no new SQL or journal change.
- `git diff --check`: passed.

No source DB schema or SQL migration changed; db:migrate/db:verify are not applicable to this module/metadata repair and were not aimed at an ambient CITYWALK database. The independent SaaS migrations and verifier are separately exercised on its task-owned local QA database.

Mobile Core, native iOS/Android implementation/device acceptance: not applicable. Public Web: route build integrity required, runtime behavior preserved. Admin Web: not applicable. Remote CI/Preview acceptance remain distinct from these local results. No develop/main merge or deployment.
