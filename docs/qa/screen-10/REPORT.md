# Screen 10 — Explore Places

27 October 2026. Local implementation for visual approval; no commit, push, merge or deployment.

## Branch and recovery

Existing branch `codex/onboarding-global-welcome`, HEAD `98a1dbbda17f945a0d982eb6dbc36713bad61617`. The former `/private/tmp/citywalk-global-welcome` directory was missing when work resumed. Its uncommitted edits were recovered from the saved session's file edits; the original five raster assets were recovered byte-for-byte from the task simulators' image cache. The existing Git worktree registration was repaired to the durable isolated path:

`/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`

All **17 available recorded approval source hashes** match (`recovered-approved-sources.sha256`, `logs/approved-sources.log`). Screen 09 was recovered from its recorded edit sequence, including its original shared-component defaults and scoped styles. This task adds no visual or behavior changes to Screens 01–09. Earlier stacked work remains uncommitted. A source/assets/QA recovery archive is saved outside the checkout at `/Users/assia/Documents/GitHub/citywalk-onboarding-recovery-2026-10-27.tar.gz`; it contains no node_modules or environment files. Dependency copies are isolated; lockfiles unchanged. Historical QA screenshots/logs removed with the temporary directory are not represented as newly verified evidence.

Read-only remote check: develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591`, main `88191e77e55a489804c49bccccf6307b5876b41d`. No rebasing or integration occurred.

## Navigation fix, before redesign

The dedicated Explore route crashed because its search `Link asChild` child received an array of styles. Installed Expo Router's Slot rejects that array before rendering the child. The minimal fix is `StyleSheet.flatten([styles.search, nativeRowStyle(direction)])`, preserved in the final design. `navigation-fix.patch` records that isolated change.

The bug was reproduced in the simulator and in a mounted regression test before the fix. The regression's Link adapter rejects style arrays at the same boundary as the installed router. The fixed destination renders its actual city-scoped search link. Actual bottom-tab navigation from the City Hub was verified again after recovery; Screen 10 opens correctly with Explore active. The approved Hub's Explore places shortcut still scrolls to its existing in-hub Places section. No approved hub navigation behavior or tab destination was changed.

## Implementation

Mobile Core required. iOS implementation and simulator evidence supplied. Android shared implementation and bundle export passed; Android device visuals remain unverified. Public Web preserved; no redesign required. Admin Web not applicable.

Screen 10 reuses the approved official logo/header option, navy editorial heading, blue selected controls, off-white background and rounded POI cards. It preserves the selected city dynamically, canonical categories All / See / Eat / Fun, existing dedicated search, native map, POI detail links/prefetch, optional location, walk membership/budget feedback and customization. No fabricated distances, opening hours, audio availability or place data were added.

The list is virtualized. Cards offer separate accessible save and add/remove targets, outside the detail link. Saving reuses `loadSavedPlaces` / `toggleSavedPlace` and their existing serialized local storage contract. The view refreshes saved state on focus, filters it by city, guards repeated taps, disables actions until storage is ready, and offers retry on a read failure. Guest saving and discovery remain available. No second persistence, auth or POI system was added.

Large-text layouts stack categories, card image/copy and action areas; text remains scalable. Screen 10 opts into the same 1.4 navigation-label multiplier already used by approved Screen 09, without changing shared defaults. The list remounts at font-scale changes to refresh native measurements. Keyboard search remains the existing dedicated search flow.

## Exact Screen 10 files

Production:

- `mobile/src/app/city/[citySlug]/explore.tsx` — Slot fix and scoped Explore redesign, existing contracts and actions.
- `mobile/src/lib/explorePhotography.ts` — new place/city-specific photo resolution using existing approved public media or the exact matching licensed bundled asset.

Tests:

- `mobile/tests/native-v2-regressions.test.tsx` — mounted Slot regression, real search route, guest saving, cross-city saved-state isolation, storage retry and filter preservation.
- `mobile/tests/native-screen-chrome.test.tsx` — real tab-handler destination assertions from Hub, POI detail and Walk.
- `mobile/tests/explore-p1.test.ts` — updated presentation assertions for the approved-header reuse and accessible actions.
- `mobile/tests/explore-photography.test.ts` — public media preference, exact credits, no cross-city/POI substitution and no unverified legacy-image fallback.

Evidence files are in this directory. `implementation.patch` isolates production changes and newly added photo tests from the stacked branch; it does not attempt to represent earlier test-file history. `source.sha256` identifies the final six task files. Recovery also restored previously recorded test append blocks and their subsequent Screen 08 updates; those are recovery of earlier work, not a new onboarding implementation.

## Photo audit

`poi-photo-audit.csv` audits all 25 existing city-scoped POIs from the local public summary:

- 20 have no photo.
- Five have legacy image paths but no public media/attribution records.
- Holstentor has the already approved, accurately credited matching bundled asset: Christian Wolf, CC BY-SA 3.0 DE, resized/cropped, original source and license links retained.
- The remaining four legacy images have unverified provenance in the available repository/public metadata. Screen 10 uses placeholders for them, without declaring the images unlicensed or altering CMS data.

Approved public media takes precedence when supplied. No unrelated photo is substituted for a place and no new image/license claim is invented. The missing images are an editorial/content dependency, not a reason to fabricate content.

## Verification

Final recovered-working-tree results:

| Check | Result |
| --- | --- |
| Mobile tests | **102 files / 886 passed** |
| Mobile TypeScript | passed |
| Mobile lint, max warnings 0 | passed |
| Expo iOS / Android / Web export | passed, `/private/tmp/citywalk-screen10-final` |
| Expo Doctor | **21/21 passed** |
| Root tests | **268 passed / 27 skipped files; 1,902 passed / 239 skipped tests** |
| Root lint | no errors; 15 existing warnings |
| Root TypeScript | passed |
| Root production build | passed, synthetic local auth configuration |
| db:generate | passed, no schema drift/migration generated |
| db:migrate | passed, task-owned localhost:55604 QA database only |
| db:verify | passed; script reports 1 city / 25 places |
| Recorded approval-source hashes | all 17 matched |
| git diff --check | passed |

Logs are in `logs/`. Root/database gates preceded the final native-only heading/label sizing adjustment; final mobile tests/types/lint and exports were rerun afterward. No API/schema, authorization, source trust, entitlement, payment or import changes. City Pass remains €4.99 / 72 hours / one-time / no automatic renewal.

The isolated database's published city-summary endpoint returned 404 after recovery, so final screenshot runs explicitly use the existing **canonical code content source**. No seeding/import was performed to hide that gap. The code catalog is authentic repository content, not invented fixtures; database-backed visual acceptance is not claimed. No production database or storage was used.

## Native evidence

Task-owned simulators: iPhone 17 Pro 402×874 pt and iPhone SE 375×667 pt, iOS 26.5. EN and DE normal captures plus maximum DE accessibility text.

Observed checks across the original implementation run and final recovered run:

- Hub bottom-tab transition opens the separate Explore route without a Slot error; correct active tab.
- Search opens the existing keyboard-enabled search screen, finds the real Holstentor, and returns through Back.
- Guest save updates the existing detail screen; removing there updates the Explore card after Back.
- Add to walk becomes Remove from walk; removal restores the initial state.
- Eat yields five existing dining places; Map uses the filtered set, and List preserves the filter.
- Photo credits open accurate author/source/license information and close independently of the POI link.
- Maximum-text category, List/Map, save and add controls are reachable by native accessibility scrolling. Test-only save changes were undone.

Final captures:

- [Standard English](screenshots/ios-standard-en.png)
- [Standard German](screenshots/ios-standard-de.png)
- [Small English](screenshots/ios-small-en.png)
- [Small German](screenshots/ios-small-de.png)
- [Small map](screenshots/ios-small-map-en.png)
- [Photo attribution](screenshots/ios-small-attribution-en.png)
- [Maximum text controls](screenshots/ios-small-max-text-controls-de.png)
- [Maximum text actions](screenshots/ios-small-max-text-actions-de.png)

## Remaining differences / acceptance

The storyboard's dense photo-rich directory cannot be reproduced honestly with current image coverage. This implementation retains the published data order, shows the real durations and uses placeholders where photography/provenance is missing. Accessible touch targets, the existing five tabs and larger text require scrolling rather than fitting the storyboard's illustrative density. Maximum-size German navigation labels wrap to two lines under the same hub sizing option; no navigation architecture redesign occurred.

Android device acceptance, physical-device VoiceOver/TalkBack, successful live GPS and database-backed native catalog acceptance remain unverified. Exports are bundle builds, not new Xcode/Gradle binaries or store acceptance. No pushed-revision CI or deployment claims.

Stop: Screen 10 visual approval. No Screen 11 work, commit, push, merge or deployment.


### Follow-up: remove photo information icon

Removed the Screen 10 photo information overlay. Existing MediaAttribution now presents the credited author, crop notice, source link and license link beneath each credited card. Screens 01–09 remain unchanged. Verified the revised Holstentor card in the iPhone SE simulator and restored its original unsaved state after exercising Save. Screenshot: `screenshots/ios-small-no-photo-info-en.png`. Focused tests: 68 passed; mobile TypeScript and lint passed; diff check passed. No commit, merge or deployment.
