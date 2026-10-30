# CITYWALK Screen 08 — First Experience / picker restoration

Local visual approval candidate, 2026-10-25. Branch `codex/onboarding-global-welcome`, worktree `/private/tmp/citywalk-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617`. Existing stacked uncommitted work preserved. No commit, push, PR, merge or deployment.

## Scope and preflight

Mobile Core required. Public Web and Admin Web not applicable and preserved. Targeted GitHub refresh: develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591` (isolated Preview real-data policy #448); no affected native-flow overlap. Continued the owner-requested existing worktree. Architecture/workflow/mobile instructions and Expo SDK 57 Router guidance were used, together with CITYWALK design/engineering and React component criteria.

Screens 01–07 visuals are frozen. All eleven frozen source hashes match in `logs/frozen-screens.log`; approved Screen 05/06/07 presentation/controller blocks also remain intact (`logs/frozen-controllers.log`). The specifically authorized return-by parsing correction is the sole Screen 06 exception; its styles/layout are unchanged.

## Isolated return-by fix

`ReturnByTimePicker.tsx` had a double-escaped digit pattern that failed to parse saved HH:MM. Only that expression changed. No new time model, picker UI, transport calculations or dependencies.

- `return-by-picker.test.tsx` exercises the real picker component with native bridges mocked: open saved 13:25; choose/save 15:45; reopen and retain 15:45. Both EN/DE cases failed before and pass after the fix. Evidence: `logs/picker-before.log`, `logs/picker-after.log`, `picker-fix.patch`, `logs/picker-isolation.log`.
- Native iOS evidence: the time picker initially showed 18:33; its hour wheel was changed to 19:33 and saved. Reopening showed **19:33**, rather than the current clock. `screenshots/ios-picker-restored-1933.png` records it. Status-bar time is overridden for design screenshots; the picker value uses the simulator’s actual clock.
- Return-by remains walking-based: existing future-today validation, deadline budget, walking finish/loop estimate and precedence remain unchanged. No car, transit, timetable or next-day contract was introduced. Existing real-builder deadline/return-leg test remains green. This closes the restoration defect reported in Screen 07; transport limitations remain intentional.

## Screen 08 implementation

City-specific photograph, blue confirmation badge, editorial “You're all set!” heading, honest supporting text, and “Explore [Selected City]” CTA. No generated itinerary, route count, start-walk claim, permission request or authentication requirement.

The existing launch registry gates the view. A coming-soon/unknown city receives unavailable content and no Explore action. Lübeck’s photo is explicitly mapped to Lübeck only; other available cities use their own published city media through existing selectors and URL resolver. No global fallback to Lübeck. Unit coverage uses a separate available-city fixture to verify dynamic name/image/CTA and unavailable-city blocking.

Existing `NativeWalkFlow` owns interests, duration, optional GPS, deadline and city. Screen 08 adds a completion flag, not a second settings store. Back returns to Location; Android hardware Back follows the same flow. Earlier Back navigation retains choices. Explore opens the selected city hub while retaining the planner in the native stack. A scoped `returnToPlanner=1` navigation intent makes that hub’s Build my walk action return to the retained planner instead of creating a fresh one. Other hub entry paths keep their existing link behavior; no-back-destination falls back to that link. No GPS coordinates or preferences are placed in the URL.

Pending choices are retained for the current navigation session, not newly persisted across process termination. Existing account defaults/current-walk storage contracts are unchanged. Screen 08 performs no planner generation or persistence; the existing explicit Build action still owns route creation.

English/German and other current native locales are supported. Content scrolls independently of a safe-area CTA. Dynamic Type changes remount the footer so native text height is remeasured. At larger text sizes the decorative arrow is omitted to allow the localized city action to wrap cleanly.

## Photography and attribution

Reused unchanged `introduction-holstentor.jpg`: Christian Wolf (www.c-w-design.de), CC BY-SA 3.0 DE, source https://commons.wikimedia.org/wiki/File:Holstentor_in_L%C3%BCbeck_Frontseite.jpg and license https://creativecommons.org/licenses/by-sa/3.0/de/ . Existing `introduction-photos.LICENSE.md` / `welcome-photos.LICENSE.md` remain authoritative. Display cropping is disclosed. The existing CityPhotoCredits control opens author, source and license information; its modal was verified on iOS. Other city media retain their provided attribution. No reference-image pixels or new unlicensed assets were used.

## Exact task files

Created:
- `mobile/src/components/FirstExperience.tsx`
- `mobile/src/lib/firstExperienceCopy.ts`
- `mobile/tests/first-experience.test.tsx`
- `mobile/tests/return-by-picker.test.tsx`

Modified:
- `mobile/src/components/ReturnByTimePicker.tsx` — isolated one-line restoration fix.
- `mobile/src/components/NativeWalkFlow.tsx` — additive Screen 08 view/state/navigation, hardware Back and new-walk completion reset.
- `mobile/src/app/city/[citySlug]/walk.tsx` — passes existing city media.
- `mobile/src/app/city/[citySlug]/index.tsx` — only the scoped return-to-retained-planner navigation behavior; no visual changes.
- `mobile/tests/walk-flow.behavior.tsx` — Screen 08 progression/state/navigation tests and existing-harness updates.
- `mobile/tests/city-hub-actions.test.tsx` — normal/scoped/fallback city-hub navigation coverage.

Evidence/docs: this folder. Other dirty files predate this task. No schema, API, dependencies/lockfiles, authentication, city data/availability, location provider or payment changes. City Pass remains €4.99 / 72 hours / one-time / no automatic renewal. `source.sha256` identifies final implementation/test sources.

## Automated verification

| Check | Actual result |
| --- | --- |
| Mobile full suite | **863 passed**, 100 files |
| Root suite | **1,902 passed / 239 skipped**, 268 passed / 27 skipped files |
| Mobile lint | Passed, zero warnings |
| Root lint | Passed, zero errors / 15 existing warnings |
| Mobile / root TypeScript | Passed |
| Expo config | Passed |
| Expo Doctor | **21/21 passed** |
| iOS / Android Hermes export | Passed, `/private/tmp/citywalk-screen08-final` |
| Next build | Passed with synthetic local auth config and isolated local QA database |
| db:generate | No schema changes / no new migration |
| db:migrate | Passed on task-owned local QA database, localhost:55604 |
| db:verify | Passed, 1 city / 25 places |
| Diff / frozen hashes | Passed |

Logs in `logs/`. The final full mobile suite includes picker restoration, guest paths, permission failures/late fixes, duration effects on actual suggestions, walking deadline budget, no route persistence before explicit Build, dynamic city imagery, blocked unavailable cities and retained hub navigation. Skipped database integrations are not claimed as passes. No production database, secrets or infrastructure were used.

## Native journey evidence

iOS 26.5 simulators: iPhone 17 Pro 402×874 points (`0C16995E-B9C1-4C80-9C1A-0FF544EBB498`) and iPhone SE 3 375×667 (`A6ACA995-0FA8-443E-BFB3-2DA7F73235BE`). Separate interactive simulator state was preserved. Current worktree runs via Metro 8091 and isolated local API 3000.

Observed standard-device guest journey:
1. Screen 01 Get Started → Screen 02 Next → Screen 03 optional account choice.
2. Explore Cities → Screen 04. Lübeck available; Hamburg/Düsseldorf disabled. Select Lübeck → existing city hub → Build my walk → Screen 05.
3. Select Food & Local Life; continue to Screen 06; select 3 hours; save/reopen 19:33 in the native picker.
4. Continue to Screen 07; Not now → Screen 08. No authentication or location grant required.
5. Back from Screen 08 → Location → Time → Interests retains 3 hours and Food selection. Return to Screen 08 in German.
6. Explore Lübeck opens its existing hub. Its scoped Build my walk action returns to the retained planner with Food selected, rather than reopening fresh personalization. The corrected navigation was retested on device, not inferred from mocks.

Observed small-device alternate guest path: Screen 01 Explore Cities directly → Screen 04 → available-city hub → Screen 05 Skip → Screen 06 Skip (existing default budget) → Screen 07 Not now → Screen 08. This verifies the journey stays optional. EN/DE normal layouts and maximum-text action wrapping/scrolling were inspected. Photo-credit modal is functional. Successful GPS-state preservation is covered by the existing controller test using a synthetic fix; physical native GPS success is not newly claimed.

Screenshots:
- `screenshots/ios-standard-en.png`, `ios-standard-de.png`
- `screenshots/ios-small-en.png`, `ios-small-de.png`
- `screenshots/ios-small-en-accessibility-top.png`, `ios-small-en-accessibility-scroll.png`
- `screenshots/ios-small-de-accessibility-scroll.png`
- `screenshots/ios-picker-restored-1933.png`

Intentional reference adaptations: authentic selected-city Holstentor photograph rather than a generic global destination; blue badge within the approved brand; copy describes preparation rather than a generated route. Small screens/large text scroll; standard editorial layout remains uncluttered. Direct touch-swipe and spoken VoiceOver acceptance were not separately performed; native accessibility activation verified content reachability.

## Remaining acceptance / stop

Screen 08 visual approval pending. Android native-device and physical iPhone/VoiceOver acceptance remain unverified; Hermes exports and mocked rendering are not device acceptance. No pushed-revision CI/Preview/deployment readiness claimed. No subsequent screen redesign was implemented; the city-hub change is limited to the navigation required to preserve Screen 08 choices. Stop before additional screen work.
