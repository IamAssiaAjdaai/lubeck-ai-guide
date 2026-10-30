# Approved-only integration Phase 1

## Revision and scope

Prepared 30 October 2026. Isolated branch: `codex/approved-only-integration-phase1`.
Base develop: `9f8470077dfa8eb7663246905bffd3cf8a0c6591` (remote reverified after validation).
Approved onboarding backup: `ab797b5ccefdbf672b2ad6280b9cb4b4a936a2fd`.
Screen 14/D14 source: `142bce0d710ad0c5f1ca7af1f36bf9477be351f7`.
Combined tested application tree: `fd353232949362d43e2e093bdd1ecd3baa624835`.
Reference review: PR #455; it is not an application integration merge.

Mobile Core: required. Public Web: compatibility validation only. Admin Web: no implementation changes.
This branch is a review candidate, not release or visual approval. No merge or deployment performed.

## Controlled slices

1. `f8d89571726016dd5a944de12b16926a5a742af8`: content/photography, timing, storage observations, guarded writes, navigation lease and published-progress foundations (47 changed files).
2. `b80b86701d8c38510519b39477a4e80e0497bda4`: approved onboarding and retained planner flow, Screen 08 Continue Planning/Back/Edit and Android focus guard (33 files).
3. `fd353232949362d43e2e093bdd1ecd3baa624835`: city discovery, places, routes, preview and separate published execution, including D14 Details push (24 files).

The application delta is 104 files: mobile assets/source/tests and one shared curated-progress domain file. See [exact changed paths and content hashes](CHANGED-FILES.json) and [slice file/commit registry](SLICE-COMMITS.json). Documentation is additional to that application delta. No files deleted, dependencies or lockfiles changed, backend/schema edits, or legacy-history removal.

97 files match source 142bce0 exactly. Seven reconciliation files: NativeWalkFlow.tsx, CuratedTourControls.tsx, the city tour route, and walk-flow.behavior, curated-controls, native-city-experience and route-preview tests. Approved presentation is retained; these adaptations protect newer develop behavior.

## Compatibility decisions and evidence

- Develop's CuratedTourControls remains the published Start controller. A presentation adapter renders the approved S13 button while retaining durable Start-before-navigation, first-pending-stop resume and write-error blocking. Existing six controller tests retained; added adapter regression. Route preview never starts execution merely by mounting.
- Develop's selected-place planner implementation and its four selection tests remain byte-identical to develop. Customize-to-Build carries existing selectedPlaceSlugs through retained settings; a rendered regression verifies these constraints and preview boundaries.
- Published curated progress keeps its existing V1 namespace and supports optional active/paused/ended state. Legacy records without executionState remain compatible. Corrupt observations, stale writes and storage errors have focused coverage. Custom current-walk storage and published execution remain distinct.
- Develop account-local-data cleanup and shared planner/index contracts remain unchanged. Better Auth server, City Pass, payments, backend and database contracts are untouched. Guest/onboarding/navigation regressions pass.
- PublishedActiveWalk.tsx exactly matches 142bce0, including the two approved ordinary Details Link push declarations. No custom/published convergence or D09/D14 migration.
- Approved image assets/license metadata and centralized guest Photo Credits are retained. No new photography or unsupported content introduced. This is preservation evidence, not a new legal-publication approval.
- S01–S13 approvals are preserved; Screen 14 remains a candidate pending final visual/native acceptance. No owner decisions were changed.

## Verification on combined application tree

| Gate | Actual local result |
| --- | --- |
| Slice 1 mobile | 91 ordinary passes, 1 TODO; 8 suites |
| Develop selected-place planner | 4 passes |
| Slice 2 onboarding/planner | 267 ordinary passes, 1 expected failure; 12 suites |
| Reconciled preview/controller/source contracts | 25 passes; 3 suites |
| Full mobile | 115 suites passed, 1 skipped; 1104 ordinary passes, 1 expected failure, 17 TODO |
| Root/shared full tests | 272 suites passed, 29 skipped; 1934 tests passed, 245 skipped |
| Mobile TypeScript / lint | PASS; zero lint warnings |
| Root TypeScript | PASS after build-generated Next route types |
| Root lint | PASS: zero errors, 15 existing warnings |
| Localization | PASS: 7 locales, 681 UI keys, zero errors |
| iOS and Android Hermes bundle exports | PASS, unsigned exports only |
| Root production build | PASS, code content and synthetic local-only build settings |
| Database generate | PASS, no schema drift |
| Database migrate / seed / verify | PASS on disposable localhost PostgreSQL only: 1 city, 25 places |
| Diff whitespace / staged secret patterns | PASS |

Commands: mobile npm run test:run, npm run typecheck, npm run lint, npm run i18n:check; expo export --platform all; root npm run test:run, npm run lint, npx tsc --noEmit, npm run build, npm run db:generate, npm run db:migrate, npm run db:verify. Seed used only to populate the disposable verification database. No production database or secrets used.

Initial fresh-checkout root TypeScript lacked generated Next route types; successful build followed by TypeScript resolved it. Initial build lacked Better Auth URL; successful rerun used synthetic localhost configuration. A new preview test initially needed async handling and was corrected before the green final gates. No assertions weakened.

Raw local logs: `/private/tmp/citywalk-integration-evidence/`. Bundle artifacts: `/private/tmp/citywalk-integration-bundles/`. These local paths are not remote CI artifacts.

## Remaining gates and limitations

- Midnight/date/time-zone handling remains unresolved. The preserved expected-failure test is `[S08 XFAIL][D03] midnight cannot reinterpret an earlier-day HH:MM as a new deadline` (D03 here is the regression-case identifier). It is not a passing feature.
- 17 historical TODO cases remain visible. Some descriptions predate completed Slice 02; do not infer current missing functionality solely from stale TODO prose. Separate test-contract triage is required before reclassification.
- Root/provider/database integration skips (245 tests) are not passes. Disposable migration/verification does not replace external-service integration acceptance.
- No new same-revision simulator/device acceptance was performed on this combined successor. Historical source-branch screenshots and traces do not prove combined-tree native acceptance.
- Pending: Android hardware Back/device navigation, reliable iOS edge-swipe, small iPhone maximum Dynamic Type, VoiceOver/TalkBack physical acceptance and real authenticated-device acceptance.
- Screen 14 final visual approval and broader D09/D14 consolidation remain pending. Separate execution models retained. No unapproved convergence.
- D07 See all walks placement remains separately gated; no new link added by this integration.
- Remote PR CI/Preview and owner review remain required. Local green checks do not authorize merge, deployment or stores.

## Handoff

Review the draft PR against the exact head SHA and changed-file manifest. Require same-SHA CI and scoped native acceptance before any integration approval. Preserve source branches and all worktrees. Stop before merge.
