# CITYWALK Screen 07 — Location Permission

Local visual approval candidate, 2026-10-25. Worktree `/private/tmp/citywalk-global-welcome`, branch `codex/onboarding-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617`. No commit, push, PR, merge or deployment. Screen 08 not implemented.

## Scope and preflight

Mobile Core required; Public Web and Admin Web not applicable and preserved. GitHub targeted refresh found develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591` (isolated Preview real-data policy #448); this does not overlap the scoped native view. Continued the explicitly requested isolated worktree with its existing stacked changes, preserving all other worktrees and unfinished work. Architecture/workflow and mobile instructions apply; exact Expo 57 Location documentation was read. CITYWALK design/engineering and React component guidance applied.

Approved Screens 01–06 remain frozen: all ten source hashes in `locked-screens.sha256` pass. Their Screen 05/06 controller blocks also match the captured baseline byte for byte. See `logs/frozen-screens.log` and `logs/frozen-controllers.log`.

## Return-by audit: functional acceptance is limited

See **RETURN-BY-AUDIT.md** for the full trace, test and limitations. The return-by value genuinely reaches `WalkSettings.deadline` and the existing builder. A real-builder controller test confirms a 12:45 deadline entered at noon constrains visit + walking + loop-return time to 45 minutes for the fixture. Finish-point walking estimates are reserved before accepting stops. Explicit deadline takes precedence over the selected duration.

Two gaps are reported rather than hidden: the iOS picker fails to restore a previously saved HH:MM value when reopened because of an existing double-escaped regex; the native contract supports estimated walking returns, not car/transit/timetable constraints. Future-today validation and estimated-time limits also remain. No frozen Screen 06/picker source was changed. Screen 06 is visually approved, but this report does not assert complete functional acceptance.

## Implementation / reuse

The new presentation sits after Available Time in the existing optional guest Build my walk flow. Continue and Skip from Screen 06 both retain their existing callbacks; Screen 07 is a view guard at the resulting planner step. Saved, active and add-place journeys bypass onboarding.

- Global globe illustration in CITYWALK Navy/Blue/Off-white; no city-specific backdrop or supported-city implication. Original code-authored decorative SVG; no external photo/license dependency.
- Editorial heading and useful location explanation; English/German and all existing native locales.
- **Use my location** is the only action that requests foreground permission. No mount/locale effect requests permission. Existing `locate()` → `requestForegroundLocation(expoForegroundLocationAdapter)` handles native permission/provider/fix/timeout behavior; no second location service or store.
- Success sets the existing GPS route start and advances. City selection stays unchanged; no automatic destination activation.
- Denied, disabled services, unavailable provider, failed fix and error retain an optional screen and manual exit using the existing localized GPS-help message.
- **Not now** proceeds to the existing manual planner without requesting permission. A generation guard ignores late fixes after Skip/Back; manual start cannot be replaced by an abandoned request.
- Busy primary action, error status, back action, existing language selector, scrollable content and fixed safe-area actions. Decorative map/icons excluded from accessibility. Labels grow/wrap; actions remain reachable on small iPhones at maximum Dynamic Type.
- No authentication requirement, background-location request, city/availability change, route-generation contract change or payment change. City Pass remains €4.99 / 72 hours / one-time / no automatic renewal.

## Exact task files

Created:
- `mobile/src/components/LocationPermission.tsx`
- `mobile/src/lib/locationOnboardingCopy.ts`
- `mobile/assets/images/location-world.svg`
- `mobile/tests/location-permission.test.tsx`

Modified:
- `mobile/src/components/NativeWalkFlow.tsx` — optional entry guard/completion flag, existing location-result reuse, late-result guard and rebuild reset.
- `mobile/tests/walk-flow.behavior.tsx` — explicit optional-entry progression, success/failure/skip/late-fix tests, real deadline/return-leg controller test.

Evidence/docs: this folder only. Other dirty files predate this task. No dependencies, lockfiles, APIs, database schema, auth, source/media trust, infrastructure or shared UI styles changed. `source.sha256` identifies implementation/test files; `before-walk-flow.tsx.txt` records the pre-task controller.

## Verification results

| Check | Actual result |
| --- | --- |
| Mobile full suite | **854 passed**, 98 files |
| Root suite | **1,902 passed / 239 skipped**, 268 passed / 27 skipped files |
| Mobile lint | Passed, zero warnings |
| Root lint | Passed, zero errors / 15 existing warnings |
| Mobile / root TypeScript | Passed |
| Expo config | Passed |
| Expo Doctor | **21/21 passed** |
| iOS + Android Hermes export | Passed, `/private/tmp/citywalk-screen07-final` |
| Next production build | Passed with synthetic local auth config and disposable local QA database |
| db:generate | No schema changes; no migration created |
| db:migrate | Passed on local task-owned QA database localhost:55604 |
| db:verify | Passed, 1 city / 25 places |
| Diff / frozen source checks | Passed |

Logs in `logs/`. No production resources were used. Skipped integrations are not claimed as passes. Security review: no new identity, entitlement, location persistence or background tracking; provider invoked only from explicit primary action. No secrets/config files changed. Presentation has controlled callbacks and no permission side effects.

## Device and screenshot evidence

iOS 26.5: iPhone 17 Pro (402×874 points), iPhone SE 3 (375×667 points). Dedicated fresh permission device `0C16995E-B9C1-4C80-9C1A-0FF544EBB498` and existing task-owned small device `A6ACA995-0FA8-443E-BFB3-2DA7F73235BE`. The standard German screenshot was captured on the existing standard task device before switching to the fresh permission-test device. Existing interactive QA data and active walks were preserved. Current worktree served by Metro 8091 and local API 3000.

- `screenshots/ios-standard-en.png` — final standard English design.
- `screenshots/ios-standard-de.png` — standard German design.
- `screenshots/ios-small-en.png`, `ios-small-de.png` — small iPhone layouts.
- `screenshots/ios-small-de-accessibility-top.png`, `ios-small-de-accessibility-bottom.png` — maximum text and last-benefit scrolling reachability with fixed actions.
- `screenshots/ios-native-permission.png` — actual native foreground dialog appears only after the explicit primary CTA.
- `screenshots/ios-denied-location.png` — denied-permission fallback.

Observed on iOS: entering the screen does not show a native permission dialog; Use my location triggers it; Don’t Allow returns an error with Not now available; Not now advances guest planning without an account. Locale switch does not request permission. Native accessibility activation brings offscreen content into view on the small device. Direct touch-swipe and spoken VoiceOver acceptance were not separately performed. A real native successful location fix was not independently accepted; controller tests verify its application to actual route generation.

Android: platform-specific presentation tests render both EN/DE under Android at 375×667 and maximum font scale, and the Hermes export passes. **Actual Android layout/permission/device acceptance remains unverified.** Android SDK/AVDs exist, but `adb devices` shows no running device and no existing development APK was found in the checked worktrees. Mocked rendering and exports do not establish device acceptance.

## Handoff

Pending: owner visual approval of Screen 07; Android native layout/permission acceptance; physical iPhone/VoiceOver acceptance; separately scoped decision on the existing return-by picker defect and unsupported transport constraints. No pushed SHA/CI/Preview/deployed readiness is claimed. Stop before Screen 08.
