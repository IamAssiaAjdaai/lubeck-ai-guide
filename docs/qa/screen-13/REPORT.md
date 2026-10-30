# Screen 13 — Route Preview

Implemented locally on 27 October 2026; awaiting visual approval. No commit, push, PR, merge or deployment. Screens 01–12 preserved.

## Branch and evidence

- Existing isolated worktree: `citywalk-onboarding-global-welcome`; branch `codex/onboarding-global-welcome`.
- HEAD: `98a1dbbda17f945a0d982eb6dbc36713bad61617`.
- Live remote read: develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591`, main `88191e77e55a489804c49bccccf6307b5876b41d`.
- Current GitHub discovery included #449 (published-tour integrity), #450 (curated-progress persistence), #452 (selected-place regeneration). Their descriptions are external implementation evidence, not claims that these changes exist in this older isolated branch. No cherry-picking, rebasing or unrelated integration was performed. No remote CI or deployed-revision acceptance claimed.
- Mobile Core required: implemented for iOS/Android. Public Web and Admin Web source unchanged/not applicable. Expo Web bundle preserved.
- `source.sha256` identifies final task files. All 154 preexisting mobile source snapshots outside the route-preview/map boundary passed `frozen-sources.sha256`. Existing unfinished work was preserved.

## Audit and architecture

The existing tour preview resolved published routes through `usePublicCity` and `resolveTourForRoute`. Its Start Tour linked to the first Place Detail with the existing `MobileTripContext`; subsequent places used the same ordered trip contract. Merely opening a stop also supplied trip parameters, which prematurely entered itinerary browsing.

The custom trip builder's `NativeWalkFlow` has a separate persisted CurrentWalk preview/active state and walking-only return-by constraints. This screen does not convert curated tours into generated plans or overwrite a user's active custom walk. Start Walk retains the existing curated place-to-place handoff; it does not promise live turn-by-turn navigation, background GPS, account-sync or durable curated progress absent from this worktree. Ordinary stop/photo/map browsing now omits trip context. Only Start Walk enters the published sequence.

The installed map component already supports MapLibre, coordinate markers, foreground location on explicit press, loading, failure, retry and attribution. There is no published pedestrian routing geometry/API in this worktree. The opt-in overview connects real published stop coordinates with a dashed line explicitly described as stop order, not calculated walking directions. No routing service, distance, ETA or coordinates were invented.

## Exact files

Modified:

- `mobile/src/app/city/[citySlug]/tour/[tourSlug].tsx`: premium city/title/metadata, existing map, ordered stops, verified photography, credits, return-by explanation/builder link and persistent safe-area Start Walk.
- `mobile/src/components/NativeCityMap.tsx`: opt-in published stop-order diagram, fit-to-stops control, 44pt marker targets and accessible selection. Existing callers retain their original camera/markers/location/routing behavior without the opt-in; covered by a regression.

Created:

- `mobile/src/lib/routePreviewCopy.ts`: English/German route-preview copy; no shared localization changes.
- `mobile/tests/route-preview.test.tsx`: rendered guest/Start Walk/city/order/localization/loading/error/incomplete-route regressions, including Expo Router Slot style compatibility.
- `mobile/tests/route-overview-map.test.tsx`: actual-coordinate diagram, selection/accessibility activation, fit, no automatic location request, default-map preservation, failure/retry.

No dependencies, lockfiles, schema, API, authentication, RBAC, publication, city availability, planner, payment or entitlement changes. No migration files or content imports. The €4.99 / 72-hour one-time City Pass is unchanged.

## Content and visual fidelity

- Canonical current route: `historic-center-walk`, “Lübeck Historic Center” / “Historisches Zentrum von Lübeck”, published estimate 45 minutes, five stops. The selected city is dynamic.
- Published stop order and coordinates are reused verbatim. Missing stop references prevent partial map presentation and disable Start Walk.
- Only verified matching imagery is shown: Holstentor's existing Christian Wolf photo, CC BY-SA 3.0 DE, linked to the exact centralized guest Photo Credits entry. Other four stops have no verified matching asset in this catalog; no unrelated images or unverified legacy assets substituted.
- MapLibre map attribution remains functional. Unknown future CMS image attributions retain existing adjacent credit handling.
- The storyboard's invented Classic Lübeck duration/distance and multiple photos are not copied. The real title wraps differently; one verified image replaces a fictional multi-photo strip. Map line is dashed to distinguish schematic order from street geometry. No unsupported Save/favorite control.
- Existing content-quality finding: the published estimate is 45 minutes while individual visit durations are 30 + 30 + 20 + 30 + 10 = 120 minutes. Both are original metadata. They were not silently recalculated or changed in this UI task; editorial reconciliation remains necessary.
- Published routes have no personal return-by time. The localized explanation links to the existing builder for supported walking-based constraints; no car/transit return logic added.

## Automated checks

| Gate | Actual result |
| --- | --- |
| Mobile tests | 107 files, 909 tests passed |
| Mobile lint | Passed, zero warnings |
| Mobile TypeScript | Passed |
| Expo export | iOS / Android / Web passed, `/private/tmp/citywalk-screen13-final` |
| Root tests | 268 files passed / 27 skipped; 1,902 tests passed / 239 skipped |
| Root lint | Zero errors, 15 existing warnings |
| Root TypeScript | Passed |
| Root build | Passed with synthetic localhost-only configuration and code content |
| db:generate | Passed, no schema drift |
| db:migrate | Passed on task-only disposable PostgreSQL |
| db:seed | Canonical test catalog seeded only into disposable local database |
| db:verify | Passed: one city, 25 places |
| Frozen sources | 154 source hashes passed outside the declared route-preview/map boundary |
| git diff --check | Passed |

Logs are in `logs/`. Root checks preceded the final native-only accessibility refinements; complete mobile tests/lint/types/exports were rerun afterward. Database gates used container `citywalk-screen13-qa-20261027`, bound only to `127.0.0.1:55613`, database `citywalk_screen13`, synthetic QA credentials. Only that container was stopped after validation. No production database, object storage, provider spend or infrastructure configuration was touched. Skipped root integration tests are not counted as passed.

## Native acceptance evidence

Simulators: iOS 26.5, standard iPhone 17 Pro 402×874pt; small iPhone SE 375×667pt.

Observed:

- Guest route-list selection opens this preview; All walking routes returns to approved Screen 12.
- Real localized title, duration, five numbered stops and coordinates shown in EN/DE.
- Map-pin touch selection and native accessibility `activate` select a real stop and reveal its ordinary place link. Fit-to-stops is functional.
- Opening a map-selected stop opens Place Detail without trip progress. Back returns to preview.
- Explicit Start Walk opens Holstentor as stop 1/5. Next Stop advances to Marienkirche as stop 2/5. No automatic GPS permission or active custom-walk write on preview entry.
- Last stop reachable on both devices, ordinary Place Detail/Back works, scrolling returns to the same list position.
- Photo Credits opens the Holstentor creator/source/license/modification record without login; Back restores preview.
- Fixed Start Walk stays above safe area while body scrolls on both devices.
- Maximum accessibility text tested on the small German device. Stop cards stack and reflow; title hierarchy adapts with a two-times display-heading limit, CTA growth is bounded to two times to keep persistent navigation usable, while body text remains scalable. Decorative numbered badges keep fixed legible numerals with full stop names announced. Text-scale layout remount prevents stale native measurements on this screen. Simulator text size restored to its original `large` setting.

Automated: loading/error retry, incomplete stops, city mismatch, map failure/retry, no permission request on render, default map behavior and navigation contracts.

Limits: Android bundle passed but Android device QA remains unverified. Physical VoiceOver/TalkBack, live offline tile failure on a device and production/database-backed route-catalog acceptance are not claimed. Existing public-content cache and map failure/retry remain in use; ordered stops and Start Walk do not depend on tile success. Real pedestrian geometry and persistent curated progress are separate existing architecture gaps, not implemented features.

## Screenshots

- `screenshots/before-standard-de.png`: original route preview.
- `screenshots/standard-de.png`: final matching standard viewport.
- `screenshots/before-after-standard-de.png`: side-by-side comparison.
- `screenshots/standard-en.png`: standard English initial view.
- `screenshots/standard-scroll-en.png`: ordered stops and return-by explanation.
- `screenshots/small-de.png`, `screenshots/small-en.png`: small-device initial views.
- `screenshots/small-scroll-de.png`: small-device ordered list.
- `screenshots/small-max-text-scroll-de.png`: maximum accessibility text and persistent CTA.

Normal-size screenshots remain visually representative after the accessibility-only refinements; final standard German capture is from the final source. Before source snapshots: `tour-preview.before.txt` and `map.before.txt`.

Stop: Screen 13 visual approval. No Screen 14 redesign started; no commit, push, merge or deployment performed.
