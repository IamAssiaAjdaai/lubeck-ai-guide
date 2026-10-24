# Verification — local only, 2026-10-24

All data/documents are synthetic. No live model call, paid generation, external email, production database, storage or deployment was used. PostgreSQL is the dedicated `marketing_bue_*` test database on 127.0.0.1:55508; the canonical runner creates a separate empty `marketing_ci_journey_*` browser database. Existing owner/Creative databases and quota holds were not cleared.

| Gate | Actual result |
|---|---|
| Canonical Marketing offline CI | PASS, 17 stages; [summary](CANONICAL-CI.json) |
| Full root units | 1,917 passed, 0 failed, 244 skipped |
| Canonical Marketing units | 262 passed, 91 skipped (database tests deliberately run separately) |
| Final full Marketing PostgreSQL | 123 passed, 0 failed, 0 skipped; includes 5 new PDF cases |
| Focused final PDF/UI/CI contract tests | 26 passed; additionally 15/15 parser cases passed after tightening filesystem read scope |
| Existing authenticated browser | 2,148 checks PASS |
| New authenticated PDF browser | 26 checks PASS, real local API/PostgreSQL/parser; [results](BROWSER-RESULTS.json) |
| Closed access | 30 checks PASS |
| Public D2 demo | 271 checks PASS |
| API/UI/Core TypeScript | PASS |
| Root TypeScript | PASS after `next typegen` in this worktree |
| Marketing lint | PASS, 0 errors, 5 existing image warnings |
| Root lint | PASS, 0 errors, 13 warnings |
| Marketing Vite build | PASS |
| Host Next build | PASS with temporary synthetic auth configuration and unreachable loopback DB URL; no host/production DB contacted |
| Lock/manifest dry-run | PASS |
| Diff whitespace | PASS for this change |
| Protected / held files | 117 / 321 unchanged |
| Manual screen reader / physical iPhone / physical Android | NOT TESTED |

Full root unit totals and the final PostgreSQL totals are recorded in [VERIFICATION.json](VERIFICATION.json). Canonical CI predates one additional attachment unit case and one concurrency DB case; the final focused, root and database runs cover them. The full canonical browser used the same source behavior; final owner-preview validation also exercised the tightened parser filesystem allowlist.

## Exercised abuse and integrity cases

Actual single/multipage PDF byte extraction; real raster-only PDF and empty PDF; malformed signature/MIME; corrupt and encryption-marked PDF; more than 20 pages; more than 50k extracted characters; excessive upload bytes; document JavaScript; embedded attachments; negative/planned statements retained literally; obvious credential/instruction lines excluded; actor/project-bound tokens, forged IDs, expiry and failed-parser retry; concurrent admission; subprocess network/read/write/child denials; viewer/anonymous/cross-tenant denials before parsing; stale revisions; simultaneous acceptance; existing confirmed facts/evidence preserved; only selected facts saved; normal confirmation required; first-context creation; consumed-token rejection. No automatic approval, quotas or provider execution path is introduced.

Desktop/mobile PDF preview, save controls and axe scans at **1440, 1024, 768, 390 and 375px**: zero detected axe violations, no horizontal overflow, save controls clear of fixed navigation. Space/Enter selection and action behavior exercised. Confirmed-fact and empty-document states captured. Axe/Playwright are not screen-reader or physical-device acceptance, nor complete WCAG certification.

## Corrections found during implementation

1. The existing revision table rejects a new `document-import` action. Fixed by reusing `revise` with document evidence, avoiding a migration.
2. CI's explicit suite-count assertion required updating from 10 to 11 while retaining all earlier suites.
3. A rapid second browser upload correctly hit the five-second rate limit. The test now observes that state and explicitly waits before the next user action.
4. A sandboxed host build stalled; only its identified process was stopped. Successful retry used temporary synthetic build-time auth settings and a non-listening loopback DB URL, never production configuration.

## Reproduction

- `node --import ./scripts/marketing-creative-offline-guard.mjs node_modules/vitest/vitest.mjs run apps/marketing-saas-api/src/intake/pdf.test.ts apps/marketing-saas/src/PdfImport.test.tsx scripts/marketing-consolidate-ci.test.mjs`
- `node scripts/marketing-consolidate-ci.mjs` with fresh operator-owned loopback-only Marketing DB/config and external private/evidence directories, following the existing canonical runbook. The runner includes the new PDF browser stage and database suite. Never use real customer/production connections.
- Marketing types: `node node_modules/typescript/bin/tsc --noEmit -p apps/marketing-saas/tsconfig.json` and `-p apps/marketing-saas-api/tsconfig.json`.
- Marketing build: `node node_modules/vite/bin/vite.js build --config apps/marketing-saas/vite.config.ts`.

Parser watchdog termination is configured but a deliberately hung parser was not induced. Kernel-level isolation, adversarial fuzzing, comprehensive DLP, semantic truth/conflict detection, manual assistive technology and real-device acceptance remain unverified. Existing whole-repository dependency advisories remain unchanged; see [security assessment](SECURITY.md).
