# Account-backed Saved Walks — physical acceptance — 2026-09-27

## Accepted source and environment

Status: **owner-confirmed physical iPhone acceptance COMPLETE for this feature**. Results below were reported by the owner on 2026-09-27; they are not inferred from automated tests. iPhone model, iOS version and installed native binary/build number were not supplied. No Android physical or release-build acceptance is claimed.

- Feature branch / PR target: `feat/saved-walk-account-ux` → `develop`.
- Accepted implementation: `dfa87f8a535fe59591df933853170b6a6ab8d984`.
- Same implementation cherry-picked onto the remote safety history: `fdbe765ecda32b1a16096da464a244a8a5436691`.
- Accepted deployed head: `52276bc440aad35959f4dbf19f9fb2bf5397d191`; its full tree matches the accepted implementation. The temporary feature-only deployment block was removed; unrelated Vercel configuration was preserved.
- Feature Preview: https://lubeck-ai-guide-1vtksxs8j-iamassiaajdaais-projects.vercel.app
- Runtime target for acceptance is this isolated feature Preview. Permanent mobile build profiles were not changed by the acceptance/bootstrap work. The documentation commit adds no product changes.

## Owner-confirmed iPhone results

| Scenario | Result and observed behavior |
| --- | --- |
| 1. Launch language selector | PASS — only DE/EN/DA/SV/NL/ES visible; Arabic hidden. Arabic catalogs/technical compatibility retained. |
| 2. Guest Save | PASS — account gate shown; Continue without saving preserves the walk; no permanent save created. |
| 3. Guest → Create account | PASS — returns to the same walk; explicit Save creates one account-backed record. |
| 4. Duplicate Save | PASS — saving the same walk does not create a duplicate. |
| 5. Reopen | PASS — same saved walk opens with Saved ✓. |
| 6. Modified route | PASS — Update saved walk updates the same record. |
| 7. Different route | PASS — a distinct saved record is created. |
| 8. Sign out | PASS — account saves disappear from the account view; local traveler state/preferences remain. |
| 9. Sign back in | PASS — account-backed saves return from the backend. |
| 10. Account isolation | PASS — a second account cannot see the first account’s saves. |
| 11. Historical local saves | PASS — remain local-only; no automatic upload; explicit removal works. |
| 12. Empty walk | PASS — cannot save. |
| 13. Completed itinerary | PASS — saving works. |
| 14. App restart | PASS — account saves return after sign-in. |
| 15. Accessibility | PASS — EN/DE/NL at 110%; Save/Update/Remove and account gate remain readable. |

Preserve previously accepted navigation, Add stop/membership, planner, audio and exact-language behavior. This report does not claim those unrelated scenarios were re-executed in this round.

## Isolated Preview/backend evidence

The exact feature-branch Preview database/auth overrides were verified before push. Database identity was checked against Production without displaying credentials. The feature uses an isolated non-production Neon database; no Production database connection or mutation was performed. Environment bindings and Production/develop deployment identities remained unchanged during bootstrap/smoke testing.

- Automatic feature Preview deployment reached READY. All **15 migrations (0000–0014)** match the committed migration hashes.
- Separately approved `npm run cms:import-lubeck` imported **1 published city / 25 published places / 175 authored place localizations / 1 tour / 5 tour stops**. Traveler city/detail/summary APIs returned 200 and resolved valid Lübeck stop slugs.
- No `db:seed`, Production data copy, managed-media record import, or automatic build-time content import. Managed-media assets remain zero; managed audio/media coverage was not an acceptance prerequisite here.
- **33 backend smoke assertions passed, zero failed**: synthetic signup/sign-in/session; account list; valid save; duplicate prevention; same-record update; removal; empty rejection preserving the valid record; completed itinerary through the actual shared projection; ownership and independent-account lists.
- A second account received 401 for impersonation through the expected-account header and 404 for update/delete of the first account’s record. The original record remained unchanged.
- Smoke-test saved records were explicitly removed through the API; sessions signed out. Two synthetic accounts were created in this round in addition to two earlier smoke accounts. No later owner-created records were removed.

## Final focused validation

Final source is the accepted implementation above; only QA documentation changes in this round. No assertions/timeouts, dependencies or runtime code changed.

| Gate | Result |
| --- | --- |
| Relevant mobile tests | **201 passed / 11 files**, 0 failed/skipped. |
| Shared/account/auth/selector tests | **18 passed / 5 files**, 0 failed/skipped. |
| Isolated account backend integration | **13 passed / 1 file**, 0 failed/skipped; real auth and PostgreSQL. |
| Total focused automated tests | **232 passed**, 0 failed/skipped; no reruns required. |
| Shared i18n | **477 keys × 7 locales**, zero errors. |
| Root TypeScript | PASS. |
| Mobile TypeScript | PASS. |
| Root lint | PASS. |
| Mobile lint | PASS, zero warnings. |
| Working/staged diff checks | PASS. |

Commands:

```sh
npm --prefix mobile run test:run -- tests/account-guest-flow.test.tsx tests/account-walk-api.test.ts tests/account-walk-scope.test.tsx tests/saved-route-identity.test.ts tests/walk-flow.test.tsx tests/walk-save.test.ts tests/walk-session.test.ts tests/native-v2-regressions.test.tsx tests/locale-preference.test.tsx tests/launch-locale-selector.test.tsx tests/auth-errors.test.ts --maxWorkers=2
npm run test:run -- packages/traveler-core/src/savedWalk.test.ts src/lib/auth/native-policy-contract.test.ts src/lib/auth/env.test.ts src/lib/auth/server.test.ts src/components/LanguageSelector.test.tsx --maxWorkers=2
node scripts/test-account-saved-walks.mjs
npm run i18n:check
./node_modules/.bin/tsc --noEmit --incremental false
npm --prefix mobile run typecheck
npm run lint
npm --prefix mobile run lint
git diff --check
git diff --cached --check
```

The isolated integration runner connects only to a newly allocated loopback database, verifies 14→15 migration upgrade/rerun with an existing synthetic account/profile preserved, then removes that database. It does not migrate Preview or Production. Earlier full-suite counts in the linked reports are historical, not rerun claims. Existing Vite configuration notices remain; no unhandled test errors.

## Dependency, repository and release boundaries

Both root/mobile lockfiles retain **Better Auth 1.7.2**. The root installed Better Auth, core, Expo and Drizzle adapter packages were also verified at 1.7.2 for this final integration run; the earlier 1.7.6 workspace drift is historical, not the validated baseline. No manifest/lockfile edits were made.

The feature diff contains no private env/signing files or Preview database URL/Neon credentials. The isolated-test runner’s existing loopback-only synthetic credentials are test fixtures, not remote secrets. Untracked Expo runtime output remains local and excluded. The held media/tooling stash remains untouched. Production configuration is unchanged; no merge is authorized by this acceptance.

Only Saved Walks are account-backed. Favorites/current progress remain local. Broader cloud sync and historical-save import are deferred. Password-reset email delivery and account deletion remain lifecycle follow-ups. Android physical acceptance, release/store builds and general release readiness remain unverified. Final PR-head CI/Preview checks and reviewer approval remain merge gates; physical iPhone acceptance is complete only for the scenarios listed above.

## CI boundary correction — 2026-09-27

PR #143 run #90 failed because the root auth contract test imported `mobile/src/lib/auth/errors.ts`. With root-only `npm ci`, Vite/Oxc selected `mobile/tsconfig.json`, whose `expo/tsconfig.base` dependency is intentionally absent. The normal developer install masked this root-to-mobile dependency.

The exact transform failure was reproduced in a disposable root-only, lockfile-matched source copy with the mobile source/config present but no Expo or mobile dependencies installed. `traveler-core/accountPolicy` now owns the unchanged 12–128 password bounds. The server factory, native validator and root contract consume the shared package; native exports remain compatible. A native regression checks both shared bounds and their rejection/acceptance edges. No root Expo dependency, workspace, lockfile, Saved Walk behavior or environment changes.

Validation on the fix:

- Focused root auth/shared: **17 passed / 4 files**, zero failed/skipped.
- Full root suite, still without Expo/mobile dependencies: **874 passed / 143 files; 35 tests / 6 files skipped; zero failed**. These skips are conditional integration gates, not passes.
- Focused mobile auth/account: **37 passed / 4 files**, zero failed/skipped. Full mobile was not rerun for this policy-only extraction.
- Isolated account integration: **13 passed / 1 file**, zero failed/skipped, including real Better Auth. These exercise 13 of the root suite’s conditional skips; 22 unrelated integration tests were not rerun. Disposable database removed.
- Root/mobile TypeScript and lint: **PASS**. The fresh root copy initially lacked generated `PageProps`/`LayoutProps`; `next typegen` generated the standard route declarations, after which TypeScript passed. No build or source workaround.
- i18n: **477 keys × 7 locales**, zero errors. Diff check: PASS.
- Root source/shared import scan finds no imports of `mobile/`; the root suite succeeds with that dependency boundary enforced by absent Expo. All 514 checked root/shared/script/schema/config files matched the proposed source.

The root-only copy retains Better Auth 1.7.2. Earlier physical acceptance remains evidence for the unchanged product policy; this CI correction does not invent a new device run or Android acceptance. The held stash and original working checkout remain untouched.
