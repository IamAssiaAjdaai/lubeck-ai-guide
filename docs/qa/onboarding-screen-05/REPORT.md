# CITYWALK Screen 05 — visual approval candidate

Date: 2026-10-25. Worktree: `/private/tmp/citywalk-global-welcome`. Branch: `codex/onboarding-global-welcome`. Local base: `98a1dbbda17f945a0d982eb6dbc36713bad61617`. No commit, push, PR, merge or deployment performed.

## Scope and baseline audit

Mobile Core: required. Public Web and Admin Web: not applicable; preserved. iOS implementation and simulator acceptance are recorded below. Android has a successful Hermes export, but device acceptance remains unverified.

Targeted GitHub preflight found develop at `c4c4eb2cb0a6697d18749f1c3561b17014d26ad7` (admin publishing review queue #453); no relevant native planner overlap. Continued in the owner-requested isolated worktree, preserving its existing stacked uncommitted onboarding work. Root architecture/workflow and mobile instructions were reviewed. Expo SDK 57 Router documentation was checked before native changes: https://docs.expo.dev/versions/v57.0.0/sdk/router/.

| Existing capability | Finding / implementation choice |
| --- | --- |
| Interest taxonomy | `packages/traveler-core/src/walkPlanner.ts` owns canonical `Interest` and `WalkSettings.interests`; reused without changes. |
| Six requested labels | History & Culture → `history`; Food & Local Life → `food`; Architecture → `architecture`; Nature & Parks → `nature`; Art & Museums → `culture`; Hidden Gems → `hidden-gems`. Existing tag matching is unchanged. |
| Additional existing preference | `family` remains a smaller full-width option so a valid saved selection stays visible and editable. No backend category added. |
| Account preference model | `mobile/src/lib/travelerStyle.ts` remains account-scoped. Guest uses launch defaults. Screen 05 never writes account defaults. |
| Planner state | `NativeWalkFlow` already owns city-scoped interest state and hydration; presentation receives that same array and callbacks. Only a view-completion boolean was added. |
| Existing saved/active walks | Resume before personalization; `journey`, saved and add-place paths bypass the entry. Existing preview restoration is covered by a regression test. |
| City selection / guest discovery | Approved Screen 04 navigation is unchanged. Screen 05 is the optional entry to the existing city hub’s **Build my walk** route (`/city/[citySlug]/walk`), rather than a new mandatory screen after discovery. City route validation and city key are reused. |
| Continue / Skip | Continue disabled with zero choices. Continue retains selections and enters the existing time planner. Skip clears only this walk’s interest filters and enters the same planner. Existing planner steps remain unchanged. |
| Locale / accessibility | Existing locale provider, selector, safe areas, controls and platform icons reused. EN/DE labels; fallback copy for all other native locales. Multiple choices expose checkbox/checked states and a visual checkmark. One column at larger text or very narrow widths. |

Screens 01–04 were frozen. `locked-screens.sha256` was captured before implementation and all six files pass final verification in `logs/frozen-screens.log`. No changes were made to city availability, auth, purchases, location permissions, data contracts, APIs or schema. City Pass remains €4.99 / 72 hours / one-time / no automatic renewal.

## Exact implementation files

Created:
- `mobile/src/components/SelectInterests.tsx` — controlled premium selection view, scrollable content, safe-area footer, responsive text layout.
- `mobile/src/lib/interestOnboardingCopy.ts` — localized heading/help/Skip copy.
- `mobile/tests/select-interests.test.tsx` — presentation checkbox, multiple selection, empty state, callbacks and EN/DE coverage (native bridges mocked).

Modified:
- `mobile/src/components/NativeWalkFlow.tsx` — optional entry view backed by existing interest state, guard for restored journeys, confirmed-new-walk entry reset.
- `mobile/src/app/city/[citySlug]/walk.tsx` — enables the entry on the existing route.
- `mobile/tests/walk-flow.behavior.tsx` — entry/skip/restoration integration coverage and route harness progression.

Documentation/evidence: this folder only. `source.sha256` identifies the exact implementation/test files. Other dirty/untracked files in this worktree predate this task and were preserved.

## Native evidence

Fresh task-only simulators were used; previous simulators contained active walks, which were deliberately preserved. Native app connects to task Metro port 8091 and local public API port 3000 backed by disposable local database `cw-screen04-qa`, not production.

| Evidence | File |
| --- | --- |
| iPhone 17 Pro, 402×874 points, English | `screenshots/ios-standard-en.png` |
| iPhone 17 Pro, German | `screenshots/ios-standard-de.png` |
| iPhone SE 3, 375×667 points, English | `screenshots/ios-small-en.png` |
| iPhone SE 3, German | `screenshots/ios-small-de.png` |
| Small iPhone scrolled to last option | `screenshots/ios-small-en-bottom.png` |
| Small iPhone, German, maximum Dynamic Type initial viewport | `screenshots/ios-small-de-accessibility-top.png` |
| Same, last option reached | `screenshots/ios-small-de-accessibility-bottom.png` |

Observed with native accessibility automation: deselecting all disables Continue; selecting an option re-enables it; multiple selections coexist; last Family checkbox is reachable through scrolling at normal and maximum text; Continue opens the existing time planner; Skip opens the existing time planner in German; Back leaves planner without building a walk; locale switching preserves selections and city. Scrolling reachability was verified by native accessibility actions that bring offscreen controls into view. Direct touch-swipe behavior and spoken VoiceOver output were not separately accepted.

Visual comparison: editorial serif headline, six icon cards, blue selected cards, off-white background, navy text and Continue follow the approved storyboard direction. Intentional differences: no three-choice cap (owner requests multiple selection), explicit optional Skip, city context, and an additional existing Family choice. Small screens and large text scroll; lower cards need not all fit at once. Actions remain outside the scroll area above the safe area. No photography was introduced on this screen; no new licensing dependency.

## Verification results

| Check | Actual result |
| --- | --- |
| Mobile tests | 96 files, **836 passed** |
| Root tests | 268 passed / 27 skipped files; **1,902 passed / 239 skipped** tests |
| Mobile lint | Passed, zero warnings |
| Root lint | Passed, 0 errors / 15 pre-existing warnings |
| Mobile and root TypeScript | Passed |
| Mobile Expo config | Passed |
| Expo Doctor | **21/21 passed** after allowing official metadata network access |
| Android Hermes export | Passed; final artifact `/private/tmp/citywalk-screen05-android` |
| Next production build | Passed with synthetic local-only Better Auth config and disposable local QA database |
| db:generate | No schema changes / no migration created |
| db:migrate | Passed on isolated localhost:55604 QA database |
| db:verify | Passed: 1 city / 25 places |
| git diff --check | Passed |
| Frozen source hashes | All six approved-screen source files match |
| Contrast calculation | White/blue 6.60:1; navy/card 14.22:1; supporting text/off-white 5.57:1; blue/off-white 6.47:1 |

Logs are in `logs/`. Initial sandbox-only network/IPC checks were retried with required local/network access; final logs record successful runs. The first build without auth environment failed; the final successful build used a synthetic test-only secret. No production credentials or infrastructure were used. No DB/schema/API/RBAC changes; security review found only presentation/controller wiring and test additions. Guest discovery and resumed walks are preserved; no second authentication or preference persistence system was created.

## Acceptance remaining

Screen 05 visual approval is pending. Android device behavior and physical iOS/VoiceOver acceptance are unverified, not observed defects. No pushed revision/CI/Preview/production acceptance is claimed. Do not begin Screen 06 until owner approval; no Screen 06 redesign was implemented.
