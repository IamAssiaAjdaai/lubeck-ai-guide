# Admin publishing review queue — local implementation evidence

- Branch: `codex/admin-publishing-queue`.
- Base: `origin/develop` at `4a74395838d0064e1fabf21f0f4ac3b9f951ecad`.
- Worktree: `/Users/assia/.codex/worktrees/citywalk-admin-publishing/lubeck-ai-guide`.
- Surface scope: Admin Web required; Mobile Core and Public Web not applicable. iOS/Android implementation and device acceptance not applicable to this read-only staff screen.

## Behavior and boundaries

`/admin/publishing` replaces the protected placeholder with the oldest 100 unpublished cities, places and tours, including draft, in-review and approved records. Each links to the existing authorized detail/editor workflow. The screen does not publish content or claim that editorial checks passed; it explains that a draft place can still have a published revision available publicly.

The server service requires `publishing:review`, derives city access and entity-view capabilities from server staff context, restricts SQL to those cities and unpublished states, and filters returned rows again. Empty city scope performs no database query. SQL returns only minimal queue fields. No schema, auth, permissions, publication mutations, routing, five-stop Historic Tour, 25-place catalog, media/provider, lockfile or infrastructure changes are included.

## Final local verification

- Focused service/page tests: 13 passed.
- Dedicated real PostgreSQL queue integration: 1 passed. Verifies city/entity isolation, draft/review/approved inclusion, published/archive exclusion and publication/reopening transitions. The test refuses non-loopback targets and is included in the dedicated CMS integration runner, including CI.
- Full `npm run test:run`: 270 files passed, 28 skipped; 1,915 tests passed, 240 skipped. Skipped integrations are not claimed as passes.
- `npm run cms:test:integration`: 4 files / 24 tests passed (including the new queue regression) against the disposable local database after canonical seed/import.
- `npm run lint`: 0 errors, 15 existing warnings.
- `npx tsc --noEmit`: passed after build generated Next.js route types.
- `npm run build`: passed with synthetic local auth configuration and disposable local database; publishing route included.
- `npm run db:generate`: no schema changes, no generated migration.
- `npm run db:migrate`: all committed migrations applied to dedicated disposable PostgreSQL database `citywalk_admin_queue_local` in the verified local container on loopback port 56435.
- Local `db:seed` and explicit `cms:import-lubeck` completed only in that disposable database. `npm run db:verify`: 1 city / 25 places verified.
- Whitespace/diff and changed-file inspection: passed; only publishing queue source/tests, its CMS integration-runner entry, and this report changed. No secrets, credentials, deployment configuration, package files or production resources changed.

Earlier checks were corrected before this final result: external dependency symlinks were replaced with lockfile-installed worktree dependencies, build received synthetic local auth settings, existing CMS tests received their canonical import prerequisite, and a real SQL test caught and fixed raw timestamp decoding. No dependency/lockfile changes resulted.

## Remaining acceptance

No browser/manual Preview acceptance, deployed-runtime test, native-device test, remote database mutation, provider execution or production deployment was performed. Reviewer/publisher login, city-scoped visibility and existing detail workflow should be accepted on an isolated Preview at the eventual PR head SHA before merge. This is local implementation evidence, not operational readiness.

At local validation, changes remained uncommitted and unpushed after automatic approval review required explicit commit/push permission. The owner subsequently explicitly authorized committing/pushing this branch and creating a Draft PR. No merge or production action is authorized.
