# Screen 08 native QA environment recovery — 2026-10-29

**Partial acceptance: Android client recovered; one Android hardware Back failure observed. No application changes made.**

Worktree: `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`  
Branch: `codex/onboarding-global-welcome`  
HEAD: `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus preserved existing uncommitted Slice02/approved-screen work. [Preservation evidence](preservation.json): all 1,054 product/test/config/asset hashes match the completed Slice02 source manifest. Exact source identity includes that manifest, not HEAD alone.

Mobile Core: QA only, both platforms. Public Web and Admin Web: not applicable. GitHub targeted preflight refreshed issue #424 (updated 2026-10-23, zero comments), develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591`, main `88191e77e55a489804c49bccccf6307b5876b41d`. Owner's current QA-only scope controls this work.

## Android diagnosis and actual acceptance

[Recovery recipe and artifact identity](ANDROID-REUSE.md). Reused a separate local debug development APK, installed without replacing any package. Its native dependency patch levels are not an exact current lockfile match; actual runtime compatibility is established only for exercised cases. Current worktree JS loaded over Metro. No ReactNativeJS/AndroidRuntime errors were logged in the scoped check ([log](citywalk-native-qa-errors.log)). No rebuild required.

Native guest Profile confirmed no account was required. Real touch activation and hardware Back verified Continue → remaining constraints; constraints → 08 → location → duration → interests; selected 3 hours and Food retained. Explicit Edit added Hidden Gems and returned directly to constraints. Edit hardware Back also returned directly. Optional Explore city → Hub → Build my walk preserved 180 minutes, four interests, manual start and loop. A fresh Hub visit → visible Back also returned to constraints. Build/Start were not pressed; no preview or active walk was created in this recovery session.

**FAIL — Android hardware Back on the optional Hub:** constraints → Back → 08 → Explore city → Hub → KEYCODE_BACK leaves the Hub visible, including after a settled recapture. Then the visible header Back reveals Screen 08 rather than constraints. Positive control without KEYCODE_BACK returns to constraints. Evidence: [Hub after hardware Back](android-hub-hardware-back.png), [settled hierarchy](android-hub-back-settled.json), [subsequent visible Back](android-hub-visible-back.json), [fresh visible-Back control](android-hub-visible-back-control.json), [action log](android-actions.jsonl).

Read-only source finding: `mobile/src/components/NativeWalkFlow.tsx` around lines 579–607 installs a hardwareBackPress handler without checking navigation focus. Its new-draft branch can call draftBack while the planner remains mounted beneath the Hub. This is consistent with the observed hidden cursor change; it is a suspected mechanism, not an implemented fix. A separately authorized fix should test that an unfocused planner cannot consume Back, then verify the focused Hub/native stack returns to retained constraints. Do not weaken the existing Back-chain assertions.

## iOS limits and restoration

Existing iPhone SE3 simulator, iOS 26.5, 375×667 points. At maximum accessibility text (`accessibility-extra-extra-extra-large`), both Screen08 actions fit above the bottom safe area ([capture](ios-max-text-attempt.png)). The editorial body was not visible in that viewport. A fresh native-tool drag produced no observable scrolling; earlier gesture attempts lacked a reliable positive control. Therefore full-content scrolling and edge-gesture acceptance are **BLOCKED**, not passed and not diagnosed as an app layout failure. Installed simctl lacks touch/swipe commands; Maestro/idb were unavailable. No extra drivers or native configuration were installed.

Native AX button activation verified Continue → constraints with History/Architecture/Food and 180 min, then Edit → original checked interests. Original English, `large` text size, Edit cursor and selections were restored. The small simulator remains running. No QA state reset or current-walk replacement occurred.

TalkBack is installed on Android, but reliable spoken/focus interaction was not established; NOT TESTED. UI Automator labels and checked states are metadata evidence only. Physical VoiceOver is BLOCKED by no connected physical iOS device; simulator AX does not establish VoiceOver behavior. [Apple accessibility testing guidance](https://developer.apple.com/documentation/accessibility/performing-accessibility-testing-for-your-app). Real authenticated native acceptance is NOT TESTED: no live authenticated QA session used. Existing controller tests with identity doubles do not substitute for it.

## Verification and remaining acceptance

[Acceptance matrix](ACCEPTANCE-MATRIX.md) · [structured evidence](ACCEPTANCE-MATRIX.json). Existing exact-source automated results: **1,066 ordinary passes, one expected failure, 17 TODO; zero unexpected failures**. TypeScript, lint, localization and both unsigned platform bundles previously passed; not rerun during this infrastructure-only task. That automated result does not negate the newly observed native hardware-Back failure. Whole-screen native rerun of approved 01–13 was not performed. Source preservation passes; complete native non-regression remains unverified.

Required manual checklist:

- After a separately authorized hardware-Back fix, repeat optional Hub Back on Android alongside visible Back and Build return; confirm no duplicate draft and no background cursor change.
- Small and standard iPhones, English/German, maximum text: physically scroll every content section, then exercise edge gestures from constraints, Edit and optional Hub; retain values and safe-area access.
- TalkBack on a supported Android device: reading order, checkbox state, focus visibility, both footer actions, Back, Edit, Hub return and recovery announcements.
- Physical iPhone VoiceOver: same flow, rotor/focus, action labels, large-text scrolling and gesture return.
- Live authenticated QA account versus guest: retained preferences and return identity without a new session/draft; use existing authorized credentials manually.
- Keep midnight D03 (known expected failure), time-zone D04 and missing day/zone metadata separately unresolved. No timing fix was attempted.

Only this QA evidence folder and temporary QA tooling were written. No production code, tests, dependencies, lockfiles, native project configuration or approved Screen01–14 source changed. Screen14 and D01–D14 remain PENDING. No commit, push, merge, deployment or legacy deletion. Stop after this report; native acceptance is incomplete.
