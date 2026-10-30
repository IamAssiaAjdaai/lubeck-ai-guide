# Screen 08 Minimal Slice 01 — bounded return-intent helper

**29 October 2026 · LOCAL IMPLEMENTATION ONLY · No commit/push/merge/deploy**

Implemented the narrower helper-only dependency specified in [NEXT-MINIMAL-SLICE.md](../screen-08-regression-tests-2026-10-28/NEXT-MINIMAL-SLICE.md), as required by the owner's explicit narrower-scope rule. **Continue Planning and Back/Edit transitions are not implemented in this slice.** See [scope reconciliation](SCOPE.md) before interpreting results.

Worktree: `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`; branch `codex/onboarding-global-welcome`; base `98a1dbbda17f945a0d982eb6dbc36713bad61617`, preserving all preexisting dirty work. Mobile Core required (iOS/Android); Public Web/Admin not applicable and untouched.

## Exact code/test files

1. **Created** `mobile/src/lib/plannerReturnIntent.ts`: versioned scalar envelope parser, normalized city/saved-source/add identity, bounded ephemeral lease registry and exact focused owning-stack target resolver. Uses existing `parseCityRouteIdentity`; no alternate navigation runtime/provider.
2. **Changed** `mobile/tests/planner-return-intent.test.ts`: four helper TODO specifications replaced with 11 passing real-helper tests; the unchanged I06 commit-order TODO remains. Every existing assertion in all other tests is unchanged.

New documentation/log files are confined to this report directory, listed in `artifact-sha256.json`. No controller, City Hub, assistant, S08 footer/copy, storage, planner, auth, native project, dependency or lockfile changed. No existing expected-failure assertion was removed, weakened or converted to passing.

## Implemented contracts and transitions

A fresh runtime has no leases. Publishing valid bounded metadata at constraints readiness creates/replaces one entry per exact native route key. A stale mount token cannot revoke a replacement; matching revoke removes readiness. Complete-stack-inventory reconciliation removes orphans. Invalid metadata/capacity overflow is rejected without evicting valid live entries. Incoming objects are projected to frozen metadata only; no settings/GPS/journey/session/auth data is retained.

Resolution requires complete v1 scalar parameters, matching city/key/token/live-ready lease, matching normalized new-draft target scope, the exact earlier `city/[citySlug]/walk` route, focused current `city/[citySlug]/index`, valid non-stale owning stack and unique route keys. It returns owning stack/source/target/count metadata only; it never pops, pushes, generates, persists or starts a walk. Nested/tab/arbitrary back targets are rejected. A cold runtime rejects restored envelopes until a real live controller publishes a new lease.

[Before/after flow and helper lifecycle diagrams](FLOW-COMPARISON.md). Current user-facing flow is intentionally unchanged; no claim that repeated interests or mandatory Hub detours are fixed.

## Verification

| Check | Actual result |
|---|---|
| Original full mobile baseline, before implementation | PASS: 974 ordinary passes, 15 expected failures, 24 TODOs; 111 files passed / 2 TODO-only skipped |
| New helper tests before source existed | Expected collection failure: missing production module; not claimed as assertion-level red proof |
| Helper after implementation | PASS: 11 executable tests, 1 unchanged TODO |
| Full mobile after implementation | PASS: **985 ordinary passes, 15 expected failures, 20 TODOs**, 0 unexpected failures; 112 files passed / 1 TODO-only skipped; 1,020 tests |
| Remaining expected failures run as ordinary tests | Intentional exit 1: all **15 assertion failures across 14 cases**, no module/setup/timeout failures |
| Mobile TypeScript | PASS |
| Mobile lint | PASS, zero warnings |
| Local iOS Hermes bundle export | PASS |
| Local Android Hermes bundle export | PASS |
| Whitespace diff | PASS |
| Native interactive standard/small iPhone/Android and live authenticated session | NOT RUN: no UI/native consumer integration in scope |
| Web/server build, DB generation/migration/verification | Not applicable to this isolated mobile TypeScript helper; no schema/API/server change or database target used |

Full-case counts remain **9 passed at existing tested boundaries, 14 known expected failures, 23 pending, 1 blocked, 0 unexpected failures** (47). Four former helper TODOs now have executable coverage, but I01/I04/I05/I07 still need real caller lifecycle/native integration; none is silently counted as a completed flow. Full mapping: [CASE-MAPPING.md](CASE-MAPPING.md) / [JSON](CASE-MAPPING.json).

Expected failures are not functionality passes. Vitest raw JSON includes them in its passed total; [RESULTS.json](RESULTS.json) reports ordinary passes separately. The real existing guest/default/account/current-walk/saved replay and legacy-control suites ran unchanged with mocked native/auth I/O. This is not live Better Auth or device acceptance. The helper has no auth branch or login prerequisite.

Commands from the worktree root unless noted:

```sh
TZ=Europe/Berlin npm --prefix mobile run test:run -- --reporter=default --reporter=json --outputFile=../docs/qa/screen-flow-consolidation-2026-10-27/screen-08-slice-01-2026-10-29/logs/full-mobile.json
npm --prefix mobile run typecheck
npm --prefix mobile run lint
# from mobile/, local bundle export only; dotenv disabled
EXPO_NO_DOTENV=1 CI=1 npx expo export --platform ios --platform android --output-dir /private/tmp/citywalk-s08-slice01-export-20261029
```

Raw evidence: [baseline](logs/baseline.log), [initial missing-module red](logs/helper-red.log), [focused helper](logs/helper-green.log), [full suite](logs/full-mobile.log), [strict-red remaining gaps](logs/remaining-strict-red.log), [strict-red first failures](strict-red-evidence.json), [TypeScript](logs/typecheck.log), [lint](logs/lint.log), [native exports](logs/native-export.log).

During test construction, TypeScript found overly narrow literal inference in synthetic stack/mutation fixtures. Fixture annotations were corrected without changing assertions. The first lint attempt lacked write access to the worktree lint cache; the authorized rerun passed. Neither was an observed product defect.

## Visual preservation / screenshots

All preexisting production, approved-screen sources/assets and tests except the one helper TODO test file match their start-of-task hashes. [Validation](VALIDATION.md) records exact exclusions and prior-decision manifest checks. Approved Screens 01–13 and unapproved Screen 14 are untouched; D01–D14 stay PENDING.

[Historical iOS screenshot and explicit evidence limitations](SCREENSHOTS.md). No new screenshot is represented as proof of a nonexistent integrated flow. Bundle exports validate the existing app graph; the unconsumed helper itself is checked by TypeScript and real unit tests, not exercised by native UI.

## Remaining gaps / next dependency

- **T01/T02/A01:** no Continue Planning callback/primary; no direct constraints handoff.
- **T04/T05/I06:** no new-draft cursor/edit-return integration, unified Back/gesture safety or commit-before-browse publication.
- **I02/I03/I08:** actual Hub still uses boolean-only Back and assistant loses the envelope; helper is deliberately not wired in this slice.
- **I01/I04/I05/I07:** standalone helper proven, actual controller token creation/committed publication/revocation, complete owning-stack reconciliation and final re-read-before-pop remain pending.
- **S02/S04/S05/S06/S07/E03/E04:** classified observation, storage-error recovery, guarded preview writes, missing saved-route recovery and replay collision protection remain outstanding.
- **D01/D03/D04:** day/zone reconfirmation and midnight integrity remain outstanding; walking-only existing contracts unchanged.
- Remaining retention/control/build lifecycle/native cases stay pending as mapped; no unsupported durable draft/geometry/transport/offline promise.

The next minimal proposal is the compatible slot-observation/guarded-commit prerequisite in existing `walkStorage`, with explicit separate authorization and exact tests before controller/Hub/footer integration. A live lease is not storage-freshness proof. The full approved flow must not be enabled merely because this helper passes. No Slice 02 or Screen 15 was started.

Preflight used [github-project-truth](/Users/assia/Documents/GitHub/lubeck-ai-guide/.agents/skills/github-project-truth/SKILL.md) and [citywalk-senior-engineer](/Users/assia/Documents/GitHub/lubeck-ai-guide/.agents/skills/citywalk-senior-engineer/SKILL.md), repository/native instructions and [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/). Current remote refs/issue evidence are recorded in `PREFLIGHT.json`; no remote writes or unrelated integration occurred.
