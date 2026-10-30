# Android hardware Back focus guard — implementation report

Task began2026-10-29; completed2026-10-30 (Europe/Berlin).

**Implemented and native defect verification passed.** Production scope is one synchronous focus check plus the effect dependency in NativeWalkFlow.tsx. No visual redesign, storage/lease contract change or Screen14 change.

Branch `codex/onboarding-global-welcome`; HEAD `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus preserved existing uncommitted work. Worktree `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`. [Final source identity](source-final.json). Mobile Core only; Public/Admin Web and DB gates not applicable. Targeted GitHub issue424 preflight refreshed (updated2026-10-23, zero comments); current explicit owner authorization controls this slice.

## Exact files changed in this task

- Production: `mobile/src/components/NativeWalkFlow.tsx`, lines583 and606: immediately return false if the actual navigation object reports unfocused; include navigation in effect dependencies. All focused branches and no-navigation fixture behavior remain unchanged. [Exact two-line production change](production-change.patch).
- Tests: `mobile/tests/walk-flow.behavior.tsx`: additive ten-case real-stack regression group; existing BackHandler fixture now retains a collection to model RN listener ordering and removal; teardown clears it. Existing assertions preserved. [Mapping](REGRESSION-MAPPING.md), [assertion audit](ASSERTION-PRESERVATION.json).
- New QA evidence only: this folder. [Exact artifact inventory/hashes](ARTIFACT-SHA256.json). No other production or test file changed against this task's baseline; [changed hashes](changed-files.json), [preservation](PRESERVATION.json).

## Behavior and native evidence

Event-time navigation.isFocused() is checked before rebuild, proposal, panel, new-draft or legacy-step branches. Unfocused handler returns false before any cursor, selections, lease, receipt or other controller state changes; existing root navigation handles Back. The focus guard does not use delayed focusReady state. Existing focus revalidation and guarded storage writes are untouched.

[Before/after trace](NATIVE-BEFORE-AFTER.md) · [Acceptance matrix](ACCEPTANCE-MATRIX.md). Standard Pixel9 read-only emulator5556, Android17/API37, English, fresh guest development install; real native input/stack, not mocked callback invocation. Six unfocused hardware events return false and are followed by root GO_BACK. First Hub Back returns to the original constraints key; subsequent focused Back reaches08 then Location. Rapid two-event Back also reaches08 with only one pop. Guide hardware Back returns to same Hub; next Back returns to constraints. Guide's supported Explore places POP_TO fallback preserves return behavior. Hub Build dispatches targeted POP count1 with selections retained. Edit Back and direct Continue work. HOME/bring-to-front preserves the focused Hub and Back target without process death.

Explicit Build in the fresh QA session created a preview; Start walk was observed after scrolling but never pressed. Leaving to Hub and reopening Build resumed the existing preview without repeating05–08. No native Active Walk acceptance is claimed. Saved-route replay/current active semantics are covered by unchanged automated contracts and AB06; no real authenticated native session was used.

Reused local APK SHA256 `905941515ce1f4447db78da63af6cb2dc93a3dc3d31c6cbf3918ca1ddbb6db15`, appId com.citywalk.app.dev, RN0.86.3/Expo57 family. Expo native patch levels differ from current lockfile; this is compatibility evidence for exercised navigation, not exact native release fingerprint acceptance. No rebuild, dependency/native config edit or signed artifact. Existing release apps were not replaced. The new emulator was booted `-read-only -no-snapshot-save -no-window`, installed without -r, and used local Metro8091/API3000. Both QA emulators remain running for owner inspection, without saving snapshots. Original emulator5554 is restored to constraints with its recorded selections and duration verified against the prior QA baseline; fresh5556 retains only the isolated QA preview.

Temporary diagnostics were confined to the authorized source file and fully removed. A malformed initial diagnostic wrapper prevented HMR/loading; corrected temporary code parsed before accepted native runs. A separate Android WebView package update killed the fresh client once before the guest test started; it was reopened without data reset. Neither is counted as a product-navigation failure or a passed acceptance case. The final preservation audit found that development refreshes had reapplied defaults in the original unsaved QA draft. Its recorded interests and duration were restored through focused existing controls and verified against prior evidence. This development-refresh limitation was not addressed with a hydration or persistence change; the normal-navigation retention cases passed independently on the fresh session. Logs were sanitized to route names/keys, focus/cursor/stage, action type/source/target/count and lease resolution. A localhost-only fallback collector was stopped and its temporary adb8092 mappings removed. No production diagnostics or collection endpoint remains.

## Automated verification on final source

| Check | Result |
|---|---|
| Focused new regressions | **10 passed**, zero failed; original red baseline **6 failed /4 passed** controls |
| Full mobile `npm run test:run --prefix mobile -- --maxWorkers=2` | **1,076 ordinary passes +1 existing expected failure +17 TODO =1,094**, zero unexpected failures. Framework reports1077 passed because its expected-failure wrapper counts as passed. |
| Existing assertions | All756 original expect-call chains in walk-flow.behavior.tsx remain verbatim; no old expected-failure/TODO migration |
| TypeScript | PASS, final `typecheck-verified.log` |
| Lint | PASS, zero warnings, final `lint-verified.log` |
| Localization | PASS; seven locales/681 shared keys, `localization-verified.log` |
| iOS + Android `expo export` | PASS; unsigned local Hermes bundles7.2MB/7.4MB; no upload/deployment. Exported production source matches final guard-only source; bundles contain no diagnostic markers. [Hashes](bundle-artifacts.json). |
| `git diff --check` | PASS |

An initial test-harness TypeScript error was corrected by using the installed router's rehydration method, without assertions being relaxed. One normal-parallel full run passed; a repeat failed once in the unchanged Arabic Explore/Detail membership case while checking a save-state button. Its isolated rerun passed10/10, and the final full run with two workers passed all cases. Original failure evidence is retained in full-mobile-final.json; the intermittent unchanged-suite failure is a remaining test reliability observation, not silently erased or attributed to a proven cause.

## Preservation and remaining gates

1,052 of1,054 baseline source/test/config/asset files are byte-identical; only the two authorized files differ. Approved01–13 render/style/assets, Slice01 helper, Slice02 routing/lease/storage behavior and native config/lockfiles remain unchanged. Screen14 render/Start logic and D01–D14 decisions remain PENDING and untouched. No authentication, payments, backend or legacy deletion.

Specific diagnosed Android defect passes native verification. Overall Screen08 native acceptance is still partial: physical VoiceOver, TalkBack, live authenticated native, small Android/German device matrix, iOS gestures/max-text scrolling and full cold-process/background matrices remain unverified. Existing active-walk native acceptance remains separately pending; Start was not used. Midnight D03 remains expected failure; time-zone/day metadata dependencies are separately gated. No broader persistence or routing claim is made.

No commit, push, merge, deletion or deployment. Stop after this report.
