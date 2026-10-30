# Screen 13 refinement — duration integrity, routing audit and layout

Implemented locally on 27 October 2026. Awaiting final Screen 13 visual approval. No commit, push, merge or deployment; Screen 14 not started.

## Baseline and boundaries

Worktree: `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`, branch `codex/onboarding-global-welcome`, HEAD `98a1dbbda17f945a0d982eb6dbc36713bad61617`.
Live read-only GitHub refs remain develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591` and main `88191e77e55a489804c49bccccf6307b5876b41d`.

Mobile Core required: implemented. Public Web/Admin Web source unchanged. No new API/schema/provider, authentication, saved-state, planner, entitlement, availability or City Pass changes. Earlier unfinished work remains intact. All 154 preexisting source hashes outside the declared Screen 13/map boundary pass. The approved Screens 01–12 were not edited; map defaults for their callers remain unchanged.

## Priority 1: verified duration findings

Evidence chain:

1. `src/data/cities.ts`: `cities.lubeck.estimatedMinutes = 45`, a legacy city-level estimate with no walking-only scope or source citation.
2. `src/lib/content/publicRepository.server.ts`, `getCodeSnapshot`: copies that value into the published tour's `estimatedDurationMinutes`; each stop's `visitDurationMinutes` comes from its place's `durationMinutes`.
3. `src/lib/admin/content/importLubeck.server.ts`: the existing import also copies that city estimate into the editorial tour. The public DTO and database tour column do not distinguish walking-only from full-experience duration.
4. The current five stop visits are 30 + 30 + 20 + 30 + 10 = **120 minutes at stops**. This does not include walking.
5. `packages/traveler-core/src/walkPlanner.ts`, `measureWalk`, and `tourBuilder.ts`: builder full time includes visit time plus walking time; visit time alone is a separate field.

Conclusion: there is no verified basis for calling 45 minutes walking-only. It also cannot represent a full experience that includes all published visit estimates. No revised total, walking time, stop estimate or source data was invented.

Screen 13 now shows **120 min at stops / 120 Min. an den Stopps**, with walking and total time explicitly unverified. An accessible expandable explanation retains the original 45-minute estimate, says its scope is undocumented and explains why it is not used as full duration. Missing per-stop estimates remain unknown rather than becoming zero or a partial asserted total. A regression checks the observed conflict and the same visit-versus-full-experience semantics as the existing builder.

Remaining data issue: the legacy canonical/API estimate has NOT been rewritten. Approved Screen 12 and other existing consumers still receive it; their freeze is respected. Verified editorial duration/scope is needed before a centralized data correction and corresponding cross-screen metadata/filter change. This handoff does not claim global duration data is repaired.

## Priority 2: real walking geometry audit

- `src/lib/mapProvider.ts` and `mobile/src/lib/mapStyle.ts` configure MapLibre/OpenFreeMap basemap styles, not a pedestrian route engine.
- Public tour DTOs expose ordered stop references, optional visit estimates and media; places expose coordinates. No pedestrian route geometry is returned.
- Existing `NativeCityMap` joins coordinates. `traveler-core/distance.ts` explicitly uses geographic straight-line distance and an assumed walking speed; those are not street-network directions.
- Existing Directions actions open external walking navigation, e.g. Google Maps with `travelmode=walking`. That does not supply verified geometry back to the app.
- No configured walking-route provider/client/API was found in this worktree. No external routing provider was provisioned or queried and no credentials or dependencies added.

Result: retain the dashed **stop sequence**, with the explicit EN/DE notice that it is not calculated walking directions. Real coordinates and order are unchanged. No new straight-line walking time, distance, route duration or fabricated path is displayed. Verified pedestrian geometry remains unavailable.

## Priority 3: visual changes

- Overview map reduced from 320 to 240pt only for Screen 13's existing opt-in mode. Default map layouts untouched.
- Existing explicit location action is a compact 44pt control inside the overview; opening the screen still requests no permission.
- All five actual numbered pins retained. Badge diameter reduced to 24pt so nearby numbers remain readable; interaction targets remain 44pt with native accessibility activation.
- Ordered stop list moved directly below the map, before photography/about content. The standard viewport meaningfully exposes the first stop.
- Start Walk remains fixed above the safe area, preserves explicit user action and uses the existing published-trip handoff. Ordinary stop selection/browsing has no trip parameters.
- Only verified Holstentor photography is reused; centralized Photo Credits and map attribution remain accessible. No new images or license metadata changes.
- Existing EN/DE, large-text stacking and persistent-action growth limits retained. New timing disclosure wraps and exposes expanded state.

## Exact source/test files for this refinement

Modified:

- `mobile/src/app/city/[citySlug]/tour/[tourSlug].tsx`
- `mobile/src/components/NativeCityMap.tsx` — opt-in Screen 13 presentation only
- `mobile/src/lib/routePreviewCopy.ts`
- `mobile/tests/route-preview.test.tsx`

Created:

- `mobile/src/lib/publishedRouteTiming.ts`
- `mobile/tests/published-route-timing.test.ts`

`source.sha256` identifies final source. Prior Screen 13 tests and implementation remain in the existing uncommitted worktree.

## Verification

| Check | Result |
| --- | --- |
| Focused duration/preview/map regressions | 14 tests passed |
| Complete mobile suite | 108 files, 915 tests passed |
| Mobile lint | Passed, zero warnings |
| Mobile TypeScript | Passed |
| Expo export | iOS, Android and Web passed; `/private/tmp/citywalk-screen13-refinement-final` |
| Root tests | 268 files passed / 27 skipped; 1,902 tests passed / 239 skipped |
| Root lint | Passed; zero errors, 15 existing warnings |
| Root TypeScript | Passed |
| Root build | Passed with synthetic localhost-only configuration and code content |
| db:generate | Passed; no schema drift |
| db:migrate | Passed on task-only isolated localhost PostgreSQL |
| db:verify | Passed: one city, 25 places |
| Frozen-source hashes / diff check | Passed |

Root gates preceded the final native-only pin-size refinement; complete mobile gates and exports were rerun afterward. Database gates reused only the task-owned disposable `citywalk-screen13-qa-20261027`, bound to `127.0.0.1:55613`, database `citywalk_screen13`. It was stopped again after checking. No production database or object storage accessed; no content import/migration files/provider spend/deployment. Skipped integration tests are not counted as passed. Final diff review found no new secrets, dependencies or unrelated source changes.

### Native observations

Standard iPhone 17 Pro (402×874pt) and small iPhone SE (375×667pt), iOS 26.5:

- EN/DE visit-time labels and the original-45-minute conflict explanation verified.
- Map activation selects a real stop; its detail screen opens as guest browsing without trip progress. Back restores the preview.
- Explicit Start Walk opens Holstentor as stop 1/5; Back returns to preview.
- All walking routes returns to approved Screen 12, and selecting its published card opens the preview again.
- Small-device last-stop access/Back and scroll position verified; all actual stops are reachable and Start Walk remains above the safe area.
- Timing disclosure remains reachable, expanded and readable at maximum accessibility text; persistent CTA remains visible. Original simulator `large` text setting restored.
- Centralized credits access and matching license data were retained from the verified Screen 13 implementation. No license attribution removal or new image usage.

Android export passed; Android device acceptance, physical VoiceOver/TalkBack and real-device offline/routing-provider acceptance remain unverified. The existing cache, loading, error/retry and map-failure behavior remain in use and covered by regressions.

## Screenshots

In `screenshots/`:

- `standard-en.png`, `standard-de.png`: final standard layout.
- `small-en.png`, `small-de.png`: final small layout.
- `small-scroll-de.png`: actual ordered stops and photo below the list.
- `standard-timing-de.png`: expanded conflict explanation (captured before the final smaller-pin adjustment; text/layout unchanged).
- `small-max-text-timing-de.png`: maximum accessibility text and persistent CTA.
- `before-standard-de.png`, `before-small-de.png`: previous Screen 13 baseline.
- `before-after-standard-de.png`: matched comparison.

Stop: final Screen 13 visual approval. No Screen 14 work, commit, push, merge or deployment.
