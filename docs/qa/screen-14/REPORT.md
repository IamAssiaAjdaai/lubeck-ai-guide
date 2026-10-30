# Screen 14 — Active Walk

Implemented locally; awaiting Screen 14 visual approval. No commit, push, merge or deployment. Screen 15 not started.

## Scope and audit

Existing isolated worktree: `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`; branch `codex/onboarding-global-welcome`; HEAD `98a1dbbda17f945a0d982eb6dbc36713bad61617`.

Read-only live refs: develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591`, main `88191e77e55a489804c49bccccf6307b5876b41d`. GitHub confirms PR450 is merged, head `2e18b8714dc47310c81311b07813454aaa45e1e0`, merge commit `bc3896278a81b0c3327c7edfbd4da4421b73a8b8`. That tested curated-progress slice existed on the local `codex/historic-tour-progress` branch but was absent from this older isolated checkout. Its domain/storage implementation and cleanup were reused selectively; no Git merge/cherry-pick or approved-screen integration from that PR was performed.

Mobile Core required: Screen 14 implemented for the published-tour journey from Screen 13. Public Web/Admin Web source unchanged. The existing custom planner's separate `NativeWalkFlow`/CurrentWalk and premium companion flows remain unchanged. This is not a redesign of the custom planner.

Audit findings:

- Screen 13's explicit Start Walk linked to Place Detail with published `MobileTripContext`.
- The old published sequence had URL-only progression and React-local completion; it had no durable curated progress or pause/end lifecycle in this checkout.
- The custom planner already had a separate durable CurrentWalk, manual progression and finish behavior, but no real paused phase. Reusing it as a curated tour would overwrite/mix separate traveler journeys.
- Existing MapLibre/location handling supports explicit foreground location, denial/error states, numbered stop coordinates and a schematic stop sequence. It does not provide pedestrian street geometry.

## Implementation and contracts

- A narrow PlaceScreen entry seam selects the new Active Walk only for parsed `source: published` trip context. Ordinary Place Detail still renders the original PlaceContent. `place-route.before.txt` and `logs/place-detail-preservation.log` prove its content/styles are byte-for-byte unchanged.
- The supplied city, `published-${tour.slug}` identity and entire ordered stop list must exactly match the current public city/tour data. Missing, reordered, substituted and wrong-city stops fail closed before persistence.
- Reused PR450's versioned curated progress and serialized device storage, separate from custom CurrentWalk. The immutable editorial order is retained, with pending/visited/skipped statuses and first-pending cursor.
- Added backward-compatible optional `executionState: active | paused | ended`. Older records without that field remain active. Pause, resume and confirmed end persist using the same expected-record comparison/serialized queue as stop progression.
- Pause blocks manual progression and foreground following; it does not manufacture stopwatch/ETA accounting. Resume is explicit and preserves statuses/cursor/start time. End stops execution while preserving progress, with an explicit later Resume option. Completed tours cannot silently restart.
- Opening the new screen after the existing explicit Start action initializes or restores device progress. Merely browsing Screen 13 or an ordinary stop does not initialize execution. Reopening paused/ended records does not auto-resume.
- Visit and skip advance only after successful durable writes. Failed/stale writes show error and Retry without false advancement or saved claims. Corrupt stored bytes fail visibly without being overwritten as a fresh walk.
- Existing successful-account-deletion cleanup now also includes the reused curated namespace. It still runs only after server deletion succeeds. No new account/auth system or cross-device synchronization.

## Product presentation

Premium Navy/Blue/Off-white route heading and current-stop context; manual progress bar; stop overview with real coordinates/current stop; current-stop photo/details where verified; full ordered list; persistent visited/next, pause/resume and confirmed end controls. English/German, native safe areas, scrolling and large-text reflow are supported.

Only verified Holstentor photography is reused. Missing POI photos are omitted rather than replaced by unrelated images. Centralized guest Photo Credits links identify the exact licensed record; existing media attribution remains adjacent where required. No new imagery or license metadata changes.

### Critical routing boundaries

The map is explicitly labeled **Stop overview / Stoppübersicht** and explains that connections show order, not walking directions. No street route, turn instruction, distance, arrival estimate, GPS completion or offline-navigation capability was added. Foreground location follows only after the user explicitly requests it and permission succeeds. No GPS location is stored in curated progress or used to complete stops.

The approved Screen 13 duration integrity remains unchanged: 120 minutes at stops, walking/total time unverified, original 45-minute conflict explained. Screen 14 displays actual current-stop visit time, with no invented tour total or ETA.

## Exact modified files

Modified:

- `mobile/src/app/city/[citySlug]/place/[placeSlug].tsx` — published-trip route-entry seam only.
- `packages/traveler-core/src/index.ts` — export reused curated progress contract.
- `mobile/src/lib/auth/accountLocalData.ts` — curated namespace cleanup.
- `mobile/src/lib/auth/accountLocalData.test.ts` — corresponding existing colocated regression.
- `mobile/tests/route-overview-map.test.tsx` — explicit permission, denial and watcher cleanup regressions.

Created:

- `mobile/src/components/PublishedActiveWalk.tsx`
- `mobile/src/lib/activePublishedTrip.ts`
- `mobile/src/lib/activeWalkCopy.ts`
- `mobile/src/lib/curatedProgressStorage.ts`
- `packages/traveler-core/src/curatedProgress.ts`
- `mobile/tests/curated-progress.test.ts`
- `mobile/tests/published-active-walk.test.tsx`

Final source hashes: `source.sha256`. No dependencies/lockfiles, backend API, schema, city/content publication, planner, payment, entitlement or production configuration changes. City Pass remains €4.99 / 72 hours, one-time payment, no automatic renewal.

## Preservation and validation

- 156 frozen source hashes passed outside the declared entry/cleanup boundary. The original full snapshot remains in `frozen-baseline-all.sha256`; the new task-owned storage file was excluded from the approved-screen manifest because it was created during parallel implementation, not part of an approved screen.
- Approved Place Detail body/styles remain byte-for-byte unchanged; Screen 13 Start CTA and its visual implementation are unchanged. Approved map source/behavior for Screens 01–13 was not edited.
- Native source/server input boundaries remain intact. Public response validation owns city/publication identity; this UI additionally validates exact editorial identity. No staff or entitlement trust is derived from route params.

| Gate | Actual result |
| --- | --- |
| Full mobile suite | 110 files / 949 tests passed |
| Mobile lint | Passed, zero warnings |
| Mobile TypeScript | Passed |
| Expo exports | iOS / Android / Web passed; `/private/tmp/citywalk-screen14-final` |
| Root tests | 268 files passed / 27 skipped; 1,902 tests passed / 239 skipped |
| Root lint | Passed: zero errors, 15 existing warnings |
| Root TypeScript | Passed |
| Root build | Passed with synthetic localhost-only config and code content |
| db:generate | Passed; no schema drift |
| db:migrate | Passed on task-owned disposable localhost PostgreSQL |
| db:verify | Passed: one city, 25 places |
| Diff check / frozen hashes | Passed |

Full logs are in `logs/`. One intermediate mobile run hit an asynchronous existing membership-screens assertion: Detail had updated before Explore's state was observed. The isolated 10-test membership file passed; subsequent complete mobile runs passed 949/949 without changing that test or approved product behavior. Original failure evidence remains in `mobile-tests.initial.log`.

The existing colocated accountLocalData test is outside the mobile tests/** runner. An additional cleanup regression in the included curated-progress suite verifies the new namespace removal. New rendered Active Walk tests use real curated storage with an injected in-memory store; native bridges are mocked. They verify guest EN/DE, exact route identity, progression/completion, pause/resume/end, remount restoration, stale/failed writes, corruption preservation, ordinary detail links and custom CurrentWalk isolation.

Database gates used only the preexisting task-owned disposable `citywalk-screen13-qa-20261027`, `127.0.0.1:55613`, database `citywalk_screen13`, synthetic QA credentials. It was stopped afterward. No production database/storage access, content imports, schema migration files or provider provisioning. Root gates preceded final native-only accessibility layout refinements; complete mobile gates/exports were rerun on final source.

## Actual native evidence

Simulators: iOS 26.5, iPhone 17 Pro 402×874pt and iPhone SE 375×667pt.

Observed:

- Existing explicit Screen 13 Start opens Screen 14 as a guest; no authentication requirement added.
- Real selected-city/route name, canonical five stops and current-stop identity shown in EN/DE.
- Standard iPhone: manual Visited advances Holstentor to Marienkirche. Next-stop details open approved ordinary Place Detail; Back preserves the cursor. Existing custom walk membership remains independently present.
- Location denial displays the existing denial guidance and leaves manual controls usable.
- Pause survives full app terminate/relaunch and reopening through unchanged Screen 13; it stays paused until explicit Resume.
- Confirmed End retains the visited stop/current cursor. Returning to Screen 13 and reopening stays ended; explicit Resume returns to stop 2 rather than resetting.
- Small iPhone: native permission prompt appears only after Use my location. Allow While Using displays a synthetic Lübeck point. Progress stays at stop 1; no GPS completion occurs. This is simulator evidence, not physical GPS accuracy evidence. Synthetic location updates were cleared afterward.
- Small-device last-stop browsing and Back preserve active stop 1 and scroll position; all ordered controls are reachable. Persistent walk controls remain above the safe area.
- Maximum accessibility text reflows the heading/current stop and stacks the three controls at full width. The original `large` simulator text setting was restored. Display heading and persistent action growth are bounded; body text remains scalable.

State restoration is local to the device. No account sync/history browser or unsupported restart control added. Android bundle validation passed, but Android device acceptance and physical VoiceOver/TalkBack remain unverified. Tile/network failure is handled by the existing map recovery; this is not an offline navigation implementation.

## Screenshots

- `screenshots/before-standard-de.png`: prior published-trip Place Detail presentation.
- `screenshots/standard-en.png`, `screenshots/standard-de.png`: initial Active Walk.
- `screenshots/progress-stop2-en.png`: actual manual progress and highlighted next stop.
- `screenshots/small-en.png`, `screenshots/small-de.png`: small-device layouts.
- `screenshots/small-scroll-en.png`: ordered stops, current state and persistent controls.
- `screenshots/small-max-text-en.png`: maximum text and stacked controls.
- `screenshots/location-denied-de.png`, `screenshots/location-granted-small-de.png`: optional location outcomes.
- `screenshots/paused-restored-de.png`: paused state after a cold app restart.
- `screenshots/ended-en.png`: ended state retaining partial progress.

Normal-size captures remain visually representative after accessibility-only refinements. The approved storyboard's turn arrow/distance is intentionally replaced by truthful stop guidance because verified pedestrian routing is unavailable.

Stop point: Screen 14 visual approval. No Screen 15 work, commit, push, merge or deployment.
