# Screen 08 — regression tests only: report

**28 October 2026 · Approved UX preserved · Feature implementation NOT AUTHORIZED / NOT IMPLEMENTED**

Worktree `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`, branch `codex/onboarding-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus preserved preexisting work. No production source, navigation/state implementation, dependency, approved screen or unapproved Screen 14 changed. D01–D14 remain PENDING.

## Results — case counts versus unit counts

| Contract-case category | Count |
|---|---:|
| Passed at defined current production boundary | **9** |
| Known expected failures — NOT working functionality | **14** |
| Pending — missing implementation/interfaces | **23** |
| Blocked — real native layout/accessibility acceptance | **1** |
| Unexpected failed cases | **0** |
| Total | **47** |

Full mobile unit run: **974 ordinary passes, 15 expected failures, 24 TODOs, 0 unexpected failures (1,013 tests)**; 111 test files passed and two TODO-only files are reported skipped. The TODOs correspond to 23 pending plus one blocked contract case. Fifteen expected-failure unit variants represent 14 cases because A01 runs EN and DE.

**Expected failures are not functionality passes.** Vitest JSON's `numPassedTests=989` includes the 15 expected failures; our [RESULTS.json](RESULTS.json) subtracts them. Strict-red mode disables `it.fails` wrapping for only tagged gap assertions: **15 ordinary failures across 14 cases, intentional exit 1**, with no module/setup/timeout failures. Their first failures demonstrate the actual missing behavior rather than a fake implementation. Unexpected future passes under `it.fails` must fail the suite until deliberately converted after authorized implementation.

Mobile TypeScript **passed**. Mobile lint **passed, zero warnings**. Existing assertions preserved: **265 original assertion chains unchanged and in order** across the three edited files, verified via TypeScript AST ([evidence](assertion-preservation.json)). Production/config protection hashes: **934 unchanged files**. Source-tree addition checks and prior decision manifests are covered in validation.

## Test files created

- `mobile/tests/screen-08-persistence-regressions.test.ts` — real storage/replay/stale-clear/write failure/start and shared deadline/planner assertions, plus explicit corrupt-clear expected failure. Only WalkStore I/O is doubled.
- `mobile/tests/planner-return-intent.test.ts` — five explicit TODO lease/lifecycle/native-target cases; the production helper does not exist and no substitute is supplied.
- `mobile/tests/screen-08-contract-pending.test.ts` — nineteen explicit TODOs for remaining missing controller/recovery/date-intent/native gates, including one blocked device-acceptance case.

## Existing test files changed

- `mobile/tests/walk-flow.behavior.tsx` — appended real-controller regressions; transparent presentation doubles expose actual supplied planning/Back callbacks only. Existing tests/assertions remain. Checks direct handoff, skipped inputs, Back target, guest preview/active resume, real planner controls, missing saved/storage recovery, concurrent writes, location races and midnight semantics. Loaded through unchanged `walk-flow.test.tsx`.
- `mobile/tests/city-hub-actions.test.tsx` — inert return-param inputs plus explicit expected failures for bare/forged return and lost full envelope. No lease resolver or navigation implementation was mocked into existence.
- `mobile/tests/first-experience.test.tsx` — real component expected-failure assertions for distinct EN/DE planning primary and browsing secondary. No unsupported production props are injected to fabricate an action.

All 47 cases map to concrete tests or TODO reasons in [CASE-MAPPING.md](CASE-MAPPING.md) / [CASE-MAPPING.json](CASE-MAPPING.json). Native DOM fixtures and storage I/O mocks are not device, external-provider, backend or production-data acceptance.

## Exact current gaps demonstrated by strict-red assertions

| Case(s) | Current behavior observed |
|---|---|
| T01/T02/A01 | Controller/real UI do not supply/display Continue planning; missing primary blocks direct handoff. Later assertions in those tests have not run. |
| T05 | Remaining constraints Back returns to legacy interests, not Screen 08 confirmation. |
| I02/I03 | Hub calls Back based only on return flag/canGoBack, including forged/mismatched or incomplete identity. |
| I08 | Hub Guide entry drops the full return envelope, forwarding the boolean/city only. |
| S02 | Storage read error falls into fresh interests rather than blocking new-draft planning. |
| E03 | Missing saved ID falls into time/new planning instead of requested-route recovery. |
| E04 | Saved replay replaces another unfinished current walk during hydration. |
| S04/S05 | Controller Build can overwrite a new current walk or same-ID edited membership while planning is pending. These are controller counterexamples; a guarded writer API is not faked/tested as implemented. |
| S07 | Corrupt current slot can be cleared under an undefined/absent expectation. |
| D03 | HH:MM selected on a prior day can be accepted as a new current-day deadline after midnight. |

Remaining pending dependencies include the actual lease/stack resolver, named draft cursor/Edit Interests, full-field retention on the new path, typed read/observation and guarded-commit API, selected-day/time-zone intent, build tickets and recovery integration. Existing picker/time/control/current/saved logic has passing checks without claiming these missing dependencies exist.

## Execution / limits

Commands and raw JSON/logs are under `logs/`:

- `TZ=Europe/Berlin npm run test:run -- --reporter=default --reporter=json --outputFile=<QA>/full-mobile-results.json` — exit 0, ordinary/expected/TODO counts above.
- `CITYWALK_S08_STRICT_RED=1 TZ=Europe/Berlin npm run test:run -- tests/walk-flow.test.tsx tests/city-hub-actions.test.tsx tests/first-experience.test.tsx tests/screen-08-persistence-regressions.test.ts --testNamePattern='S08 XFAIL' ...` — deliberate exit 1; only intended assertion failures.
- `npm run typecheck` and `npm run lint` in mobile — exit 0.
- `git diff --check` and original-assertion/source/decision hash validation.

The TZ setting applies only to test processes; fake dates affect tests only, not the user's clock/time-zone. No simulator/native build, app feature, root/Web build, DB/migration/provider, billing, production infrastructure or deployment was needed/performed for test-only changes. Exact [Expo SDK 57 guidance](https://docs.expo.dev/versions/v57.0.0/) was reviewed as required by mobile instructions; no package/version change.

Initial test-construction corrections are preserved in the logs: the new retry test initially assumed Back returned to constraints, but current Back exits to Hub; the final test uses the real Retry path. The category fixture's actual accessible label and test-only TypeScript narrowing/options were corrected. No production code or original assertion was changed to resolve them. Only the final strict-red assertion failures are classified as product gaps.

## Stop point

Test-only deliverable complete. Feature flow remains unimplemented and not ready for native visual approval. [NEXT-MINIMAL-SLICE.md](NEXT-MINIMAL-SLICE.md) is a proposal only. No commit, merge, branch deletion, push or deployment.
