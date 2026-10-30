# CITYWALK Screen 06 — Available Time

Local visual approval candidate, 2026-10-25. Branch `codex/onboarding-global-welcome`, worktree `/private/tmp/citywalk-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617`. Continued the existing isolated worktree and preserved its stacked uncommitted work. No commit, push, PR, merge or deployment.

## Audit and design decision

Mobile Core: required. Public Web and Admin Web: not applicable; preserved. Targeted GitHub refresh confirms develop `c4c4eb2cb0a6697d18749f1c3561b17014d26ad7` (admin publishing #453), with no affected native flow overlap. Root architecture/workflow, mobile AGENTS and exact Expo 57 Router documentation were reviewed. CITYWALK designer/engineer and React component checklist applied.

| Existing model / behavior | Screen 06 reuse |
| --- | --- |
| `NativeWalkFlow` owns `minutes`, initially 120, hydrated from traveler defaults | Controlled view receives that same value/setter; no new duration store or duplicated state |
| Existing duration cards: 60, 120, 180, 240 minutes | Same four choices: 1 hour, 2 hours, 3 hours, Half day |
| Account preferences also support 90 minutes | A hydrated nonstandard duration is displayed as its actual localized minute value and selected; never silently rounded |
| `WalkSettings.minutes` is a number | Passed unchanged to existing `buildWalkSteps`; route generation and persistence contracts unchanged |
| `buildWalkSteps` uses duration as budget unless deadline overrides it | Existing fitting, start/finish, interests, pace and deadline precedence preserved |
| Existing `ReturnByTimePicker` | Mounted unchanged, with the same value/setter, labels and validation |
| New walk route already enters approved Screen 05 | Continue/Skip from Screen 05 now enters the redesigned existing time step |
| Existing planner step 2 / start/end / saved and active journeys | Preserved; no later screen redesign |

Premium editorial serif heading, Navy #09234D, Blue #155CAF, Off-white #FBFDFF, selected city context and large radio cards follow the approved storyboard. Selected cards include both a checkmark and radio checked state. Content scrolls independently of safe-area Continue/Skip actions. Larger text moves card icons above the full-width text. EN/DE supported through existing copy/provider; all current native locales retained.

Continue retains the chosen duration and advances to the existing next planner step. Skip retains the current duration/deadline and advances identically; it does not invent an unlimited-time contract. Continue is available because the flow always has a hydrated/default duration, and is disabled for a nonpositive duration. UI Back and Android hardware Back from new-walk time entry return to Screen 05 without resetting interests, duration or deadline. Back from the next existing planner step also retains the duration. No account required.

## Changed-file boundary

Created:
- `mobile/src/components/AvailableTime.tsx` — controlled native time presentation and localized supporting text.
- `mobile/tests/available-time.test.tsx` — EN/DE radio selection, exits, city context, large-text rendering and hydrated 90-minute coverage, with native bridges mocked.

Modified:
- `mobile/src/components/NativeWalkFlow.tsx` — imports and renders the time view for the existing onboarding route; reuses existing setters/picker; handles time-to-interests hardware Back.
- `mobile/tests/walk-flow.behavior.tsx` — mock presentation bridge plus controller tests for duration persistence, hardware Back, Skip and actual suggested-stop differences between 60 and 180 minutes.

Evidence/documentation only: `docs/qa/onboarding-screen-06/`. Other dirty/untracked files predate this task. No dependencies/lockfiles, schema, API, authentication, city data/availability, guest discovery, location permission or payment changes. City Pass remains €4.99 / 72 hours / one-time / no automatic renewal. No shared styles were altered. Approved Screens 01–05 source hashes all pass; Screen 05's controller block is also byte-for-byte unchanged. See `locked-screens.sha256`, `source.sha256` and `logs/frozen-screens.log`.

## Verification

| Check | Result |
| --- | --- |
| Mobile full suite | 97 files / **841 tests passed** |
| Root full suite | 268 passed / 27 skipped files; **1,902 passed / 239 skipped tests** |
| Mobile lint | Passed with zero warnings after correcting an array-type style warning |
| Root lint | Passed, zero errors / 15 existing warnings |
| Mobile and root TypeScript | Passed |
| Expo config | Passed |
| Expo Doctor | **21/21 passed** |
| iOS and Android Hermes exports | Passed; final output `/private/tmp/citywalk-screen06-final` |
| Next production build | Passed with synthetic local-only Better Auth config and disposable local QA database |
| db:generate | No schema changes / no new migration |
| db:migrate | Passed on task-owned local QA database, localhost:55604 |
| db:verify | Passed: 1 city / 25 places |
| Diff check | Passed |
| Approved-screen hash check | All eight frozen source files match |

Logs: `logs/`. Database gate used only the existing disposable local `cw-screen04-qa` database; no production resources. No backend integration was changed. Root skipped integration tests are not claimed as passes. React review: controlled props, stable value keys, no added effects in presentation, no data fetching/persistence, unchanged shared domain logic, native accessible roles/states, conditional rendering after existing hooks.

## iOS evidence

Task-only iOS 26.5 simulators, preserving unrelated existing active walks. iPhone 17 Pro 402×874 points and iPhone SE 3 375×667 points. Existing development app runs current worktree via Metro port 8091 and local API port 3000.

- `screenshots/ios-standard-en.png` — standard English approval preview.
- `screenshots/ios-standard-de.png` — standard German.
- `screenshots/ios-small-en.png` — small English.
- `screenshots/ios-small-de.png` — small German.
- `screenshots/ios-small-de-bottom.png` — lower content and deadline control reachable through scrolling.
- `screenshots/ios-small-de-accessibility-top.png` — maximum Dynamic Type, fixed actions visible.
- `screenshots/ios-small-de-accessibility-choice.png` — last duration card reachable at maximum Dynamic Type; content naturally scrolls if taller than viewport.

Observed: selectable radio states; three-hour selection persists through Screen 05 Back/Continue; current city remains Lübeck; optional deadline opens and clears through the unchanged native picker; Skip reaches the existing planner; returning from that step retains Half day; language switching retains the selected budget. Native accessibility activation brought offscreen controls into view, verifying scrolling reachability. Direct touch-swipe and spoken VoiceOver acceptance were not separately performed.

Intentional differences from the storyboard: existing hourly walk budgets replace multi-day reference labels to keep real route contracts; existing deadline control is preserved; Skip is available; no Screen 07 or later design is implemented. Small screens and accessibility text use scrolling rather than truncating choices. No new photo/license dependency.

## Remaining acceptance

Screen 06 visual approval pending. Android device acceptance and physical iPhone/VoiceOver testing remain unverified; exports and controller tests are not device acceptance. No exact pushed SHA/CI, Preview or production readiness claimed. Screens 01–05 remain approved and frozen. Stop before Screen 07.
