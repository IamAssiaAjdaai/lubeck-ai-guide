# Launch access implementation evidence — 18 October 2026

Branch: `codex/347-launch-free`, independently based on current `origin/develop` `7b78a96fa2ae274f7710a0ba3f873e3fa35bdf7e`. Refs #347/#109/#187/#387; legal changes are in a separate Draft PR. See `LAUNCH-FREE-28-DAYS.md` for selected features, day-29 behavior and operator decisions.

## Architecture and scope

- Server-only launch policy and shared provider budget; public no-store policy DTO; existing city/media endpoints use ephemeral policy without paid ledger writes. No new database table, migration, import or admin capability. Existing authorization, content approval, RAG and exact-locale checks preserved.
- Guest and registered native city reads consult server authority with before/after account guards. Existing paid entitlement resolver remains independent. Global Premium/background is intentionally excluded from the temporary grant. iOS/Android use the same client implementation; neither actual device acceptance nor native release acceptance is asserted.
- Web offers and native purchase UI remain disabled until a separate explicit server approval; SDK adapters recheck before new purchases. Restore/verification/webhook reconciliation is preserved. No store/provider/dashboard changes or live transaction occurred.
- No production database, deployment, DNS or `main` change. Local PostgreSQL was a new disposable container bound only to `127.0.0.1:55437`, with synthetic credentials and mocked payment providers. No owner env files were copied.

## Actual local results

| Check | Result |
| --- | --- |
| Full Web unit suite | 233 files passed, 20 skipped; 1,473 tests passed, 134 skipped. Skipped integration tests are not claimed as passed. |
| Native full suite | 94 files / 781 tests passed, including guest launch access, no enrollment UI, account races and purchase policy failures. |
| Targeted server tests | 63 passed across five suites before full run; includes UTC boundaries, missing/invalid configuration, prior paid access, forged flags, failed budget and no provider call on budget failure. |
| Actual launch-budget PostgreSQL test | 1 passed: five concurrent reservations with cap two admit exactly two, then deny further attempts. |
| Commerce PostgreSQL integration | 3 files / 13 tests passed; payment provider mocked, purchase approval confined to isolated test process. |
| Rate-limit PostgreSQL integration | Sliding windows, keyed identifiers and concurrent atomicity passed. |
| Lifecycle/export integration (shared baseline) | Separate legal checkout: 4 files / 25 tests passed on same isolated PostgreSQL service, independently created test DB. |
| Root lint | Pass, 0 errors; 8 existing warnings outside this change. |
| Mobile lint | Pass with `--max-warnings=0`. |
| Root TypeScript | Pass after `next typegen`; no output. |
| Mobile TypeScript | Pass; no errors. |
| Mobile config validation | Pass, synthetic/local configuration; not a store build. |
| Next production build | Pass with synthetic auth settings and isolated local DB. Initial unconfigured build failed on missing auth secret; sandbox compiler sockets required permission. No production secrets used. |
| Cloudflare/vinext build | Pass; bundle and binding checks passed (16 baseline bindings preserved, 13 additions including 7 new OFF/blank policy values). No deployment. |
| `db:generate` | Baseline drift: generator proposed duplicate `shared_walk_links` already created by `0026`; inspected and removed only generated `0027` artifacts. Not a clean schema-drift gate. |
| `db:migrate` | Existing committed migrations passed on isolated local DB (legal checkout, identical schema/migrations). |
| `db:verify` | Passed: 1 city / 25 places after explicit local canonical seed. Initial empty DB failed catalog check as expected. No automatic seed added. |
| `git diff --check` | Pass. |

Full unit suite and build are local evidence for the implementation. Cloudflare build metadata before commit identifies the base SHA plus the local diff, not a deployed final head. GitHub checks and isolated deployed acceptance must be checked on the actual PR head; no green CI/Preview claim is made here.

## Remaining gates

- Resolve baseline Drizzle snapshot drift in its own change; do not commit the duplicate table migration.
- #348/#354 edge identity/security acceptance, operator financial ceiling/provider spend controls and actual daily monitoring.
- Complete approved HTTPS candidate, TestFlight and Play Beta evidence independently; verify media/account transitions/offline failures, precise locale and day-29 behavior on actual devices.
- Legal identity, retention/provider/DPA/transfer decisions, privacy declarations and media rights review in #265/#109.
- Runtime public availability proof, explicit operator GO/window/reference and rollback rehearsal. Default launch and purchases remain OFF.
- #53/#130/#59 own remaining feedback, neutral review and reporting work; this PR neither invents metrics nor claims that broader #347 release gates are complete.

Draft PR creation is authorized by the task; no merge is authorized or performed.
