# Screen 08 storage safety prerequisite — implementation report

**29 October 2026 · LOCAL IMPLEMENTATION / AUTOMATED VERIFICATION · STOP BEFORE SLICE 02**

Implemented the explicitly authorized two-file storage prerequisite. **No Screen 08 navigation integration, Continue Planning/Back/Edit change or legacy assertion migration.** Worktree `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`, branch `codex/onboarding-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus preserved preexisting work.

## Exact files

Production modified:

- `mobile/src/lib/walkStorage.ts` — classified observation, private opaque receipt, guarded preview commit on the existing queue, candidate snapshotting, affected mutation fail-closed protection, preserved current/saved lineage.
- `mobile/src/components/NativeWalkFlow.tsx` — real classified hydration, guarded Build/saved-replay call sites, recovery/explicit resume, retained-input retry/attempt identity, narrow build lifetime lock/ticket. Uses existing localized recovery components/copy.

Tests modified:

- `mobile/tests/walk-flow.behavior.tsx` — existing I/O harness delegates to the real new storage APIs; five storage XFAIL wrappers converted only after unchanged assertions passed; 11 real-controller recovery/lifetime regressions added. Native/auth I/O stays mocked.
- `mobile/tests/screen-08-persistence-regressions.test.ts` — S07 wrapper converted to ordinary passing test; now-unused XFAIL alias removed; every assertion unchanged.
- `mobile/tests/screen-08-contract-pending.test.ts` — S01/S03/S06 TODO specifications activated through real executable coverage; remaining partial lifecycle wording corrected; other pending/blocked gates retained.

Test created:

- `mobile/tests/current-walk-observation.test.ts` — **37 passing cases/variants** covering classification, corrupt/read/write faults, bound receipts, concurrent writes, real browse Add to Walk race, replay collision, linkage, immutable candidates and cancellation/uncertain completion.

[Machine-readable file list](changed-files.json) · [Isolated patch against the task-start snapshot](IMPLEMENTATION.patch). This patch excludes all preexisting approved redesign work; `git diff` against the old HEAD alone contains unrelated historical work.

## Behavior

Reads now distinguish **empty / current / terminal / blocked / unavailable**; errors and corrupt records cannot masquerade as absence in the affected planner. Observations preserve bytes. Preview writes require a matching in-memory city/store/raw-slot receipt and a live request at the actual queued write boundary.

A current walk appearing or changing during planning wins: the stale draft cannot overwrite it. Saved-open preserves its source and cannot silently replace another unfinished current route. New/replay previews may replace only their unchanged empty/terminal observations; existing explicit Customize is separately checked and retains saved/account linkage.

Failures recover through existing localized Retry/Back controls; collision recovery offers Resume trip. Selected interests, duration, return-by, walking, category filters and manual/finish choices remain in the mounted controller. Retry re-inspects before allowing another write, keeps attempt ID for unchanged input, and can reconcile the exact preview when a rejected write actually committed. Neither retry nor recovery auto-starts a walk. Invalid clear/rebuild cannot erase corrupt data or terminate the live companion before storage validation succeeds.

[Exact implemented contract and limitations](STORAGE-CONTRACT.md).

## Actual automated results

| Check | Result |
|---|---|
| Original mobile baseline | PASS — 985 ordinary passes, 15 expected-failure variants, 20 TODOs / 1,020 tests |
| Six existing storage assertions before fix as ordinary tests | Six real assertion failures; intentional exit 1, preserved evidence |
| Same six assertions after fix before wrapper conversion | Six ordinary passes; no assertion changes |
| Final full mobile suite | **1,039 ordinary passes, 9 expected-failure variants, 17 TODOs; 0 unexpected failures (1,065 tests)**; 113 test files pass / 1 TODO-only skipped |
| Final strict-red probe of remaining expected failures | Nine ordinary assertion failures across eight cases; intentional exit 1; no module/setup/timeout failure |
| Mobile TypeScript | PASS |
| Mobile lint | PASS, zero warnings; narrow existing-event purity exception disclosed below |
| Additional strict lint of changed test files | Five **preexisting** import/first warnings in the legacy behavior harness; zero new findings/errors; strict command exits 1, not labelled green |
| Locale consistency | PASS — seven locales, 681 UI keys each, zero errors |
| Local iOS / Android Hermes exports | Both PASS, exact final production source; no signed install/device acceptance implied |
| Diff whitespace | PASS |

Vitest JSON includes successful expected-failure wrappers in its passed total. [RESULTS.json](RESULTS.json) explicitly subtracts those nine; they are **not passing functionality**. Full technical 47-case matrix: **18 passed at tested boundaries, 8 known expected failures, 20 pending, 1 blocked**. Storage S01–S07/E03/E04 are now covered; partial G01/G02/G03 controller/native variants remain honestly pending despite added passing baseline checks. [CASE-MAPPING.md](CASE-MAPPING.md) / [JSON](CASE-MAPPING.json).

Raw evidence: [baseline](logs/baseline.log), [six assertion failures before](logs/storage-before-red.log), [six passes after](logs/storage-after.log), [focused suites](logs/focused-final.log), [final full mobile](logs/full-mobile.log), [remaining strict-red](logs/remaining-strict-red.log), [red/green first failures](red-green-evidence.json), [TypeScript](logs/typecheck.log), [lint](logs/lint.log), [i18n](logs/i18n.log), [final iOS/Android export](logs/native-export-verified.log).

Commands (root unless stated):

```sh
TZ=Europe/Berlin npm --prefix mobile run test:run -- --reporter=default --reporter=json --outputFile=../docs/qa/screen-flow-consolidation-2026-10-27/screen-08-storage-safety-2026-10-29/logs/full-mobile.json
npm --prefix mobile run typecheck
npm --prefix mobile run lint
npm --prefix mobile run i18n:check
# mobile/; local bundle checks only
EXPO_NO_DOTENV=1 CI=1 npx expo export --platform ios --platform android --output-dir /private/tmp/citywalk-storage-safety-verified-20261029
```

Supplemental test-file lint found one unused alias from converting S07, which was removed. It then reported only five import-order warnings in the old behavior harness; ESLint lintText comparison with its task-start source confirms the same five warnings and zero new findings ([comparison](test-lint-baseline.json), [raw log](logs/test-lint.log)). Their unrelated import layout was preserved. The standard required mobile `expo lint` passes with zero warnings.

The initial focused compatibility run caught a changed Start error code for corrupt input. Production was corrected to retain the existing `walk-changed` contract, without changing the old assertion. Lint also reported the preexisting `Date.now()` in the async explicit Start event as render impurity after the structural change. Before-source lint passed; only two explicit button call sites invoke that handler. A **single-line documented purity exception** preserves its exact runtime logic; no global lint configuration or tests were weakened. The unchanged Start function was verified by comment-free TypeScript AST comparison; bundles pass with the existing compiler. The first diagnostic is retained in [lint-first.log](logs/lint-first.log).

## Compatibility and frozen boundaries

[Preservation validation](VALIDATION.md) / [assertion evidence](assertion-preservation.json) verify **318 original assertion chains unchanged and in order**, all existing onBack expressions, the complete approved Screen 05–08 rendering/callback blocks and Android Back handler byte-identical, and the legacy public load/replay transformations unchanged. The Start runtime function remains AST-identical aside from the lint explanation comment.

Slice 01 helper/source/test and all five B01–B05 legacy assertion contexts remain unchanged. No new production file, dependency, migration, storage namespace, backend API, auth/payment, city data or design asset. Screen 14 and D01–D14 remain PENDING; approved Screen 01–13 styles/photo/copy files are untouched. Storage error/recovery now has the deliberately scoped new behavior through existing components; this is not a claim that every error screen layout has fresh native visual approval.

Mobile Core iOS/Android applies; Public Web/Admin/schema/DB gate not applicable to this isolated native storage change and no DB target was used. No root Web build/migration/provider execution, production access, new simulator/device/VoiceOver/TalkBack or live-auth acceptance is claimed. Existing guest and account-mode regressions passed with mocked auth/native ports. Native export is not on-device storage/runtime acceptance.

## Remaining risks / mandatory stop

- Queue guard covers participating writers in one JS runtime, not cross-process/device writers; no distributed CAS or guaranteed rollback of an already-started write. Native companion cleanup plus local storage is not a transaction.
- Legacy compatibility readers/writers remain available; new preview callers must use the stronger observation/commit API. No global namespace repair or durable guest draft promise.
- Current recovery Resume uses ordinary authoritative city hydration; pending in-memory inputs remain only until the user explicitly leaves/resumes or the controller unmounts.
- **Slice 02 navigation remains unauthorized and unimplemented.** Continue Planning, explicit Back/Edit, actual lease publication/consumption/forwarding and the B01–B05 test migration are unchanged. Remaining expected-failure cases: **T01, T02, T05, I02, I03, I08, A01 (EN/DE), D03**.
- Midnight/time-zone parent intent (D01/D03/D04 technical regressions), full scope/cancel/build-fingerprint variants and native A02 remain pending. These technical case IDs do not change the owner D01–D14 decision rows.
- No Screen 14/15 work, broad consolidation or release-readiness claim.

**Stop after this storage prerequisite report. No commit, push, PR, merge, legacy deletion or deployment.** Owner review of this evidence must precede separately authorized Slice 02 integration.
