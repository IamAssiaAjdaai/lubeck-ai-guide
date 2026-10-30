# Screen 09 — Premium redesign implementation report

## Status and scope

Implemented locally for visual review in `/private/tmp/citywalk-global-welcome`, branch `codex/onboarding-global-welcome`, HEAD `98a1dbbda17f945a0d982eb6dbc36713bad61617`. No commit, push, PR, merge, deployment, or Screen 10 implementation. The working tree includes earlier approved onboarding work; that work was preserved.

Mobile Core: required. iOS: simulator checked. Android: implemented through shared native components and successfully bundled; device visual acceptance remains unverified. Public Web: existing functionality preserved, no redesign required. Admin Web: not applicable.

Read-only GitHub preflight found develop at `9f8470077dfa8eb7663246905bffd3cf8a0c6591` (#448, isolated Preview policy). This feature intentionally continues the user's named worktree rather than rebasing the accumulated uncommitted approved screens. Current checks are local working-tree checks, not CI evidence for a pushed revision.

## Baseline audit and design result

The hub already used the city-scoped public API, real published tours/places, the existing native walk builder, optional location provider, membership actions, Guide fallback, and five-tab navigation. It previously used a split photo/copy hero and vertical route cards. No second discovery, recommendation, location, planner or state system was needed.

The redesign uses the official unchanged CITYWALK mark with a hub-only proportional header variant; cinematic city photography under an accessible navy wash; integrated city switcher; separate blue full-width builder CTA; three consistent icon cards; a horizontal editorial tour card; editorial Places cards and category/List/Map controls. Large-text layouts stack route content, quick actions and categories instead of shrinking touch targets. Normal category targets are at least 44 points tall.

All 16 frozen Screen 01–08 source hashes match. Shared-component changes are opt-in to the hub; existing defaults remain unchanged. See `logs/frozen-screens.log`.

## Actual data and trust boundaries

- The reusable hero obtains the city name and description from the selected city's public data. Its short visible description is the first published clause; the accessibility label retains the complete description.
- Published city media takes precedence. The existing licensed Holstentor asset is a fallback only for the matching Lübeck city / Holstentor place identities. Other cities cannot receive this photograph accidentally.
- The one local published tour is **Lübeck Historic Center**, **45 minutes**, **5 stops**, description **Walking Tour**. Themes derive from actual stop tags. The reference's Classic Lübeck / 2 hours / 6 stops and longer prose were not substituted for real data.
- The bundled photograph is Christian Wolf's *Holstentor in Lübeck Frontseite.jpg*, CC BY-SA 3.0 DE, resized/cropped. Existing source and license links are reused. Hero, tour and matching place information controls open the existing attribution modal, independently of navigation links. Existing published place images and their metadata remain intact; missing images retain an honest icon fallback.
- City availability, guest access, authentication, locale selection, API DTOs, schemas, RBAC, publication rules, membership and recommendation contracts are unchanged. No content writes, migrations, imports, provider spend, or production resources were used.
- City Pass remains €4.99 / 72 hours / one-time payment / no automatic renewal.
- Builder navigation retains the existing `returnToPlanner` back-navigation contract and onboarding preferences. No new storage was added.

## Exact files changed in this redesign

Production:

1. `mobile/src/app/city/[citySlug]/index.tsx` — hub composition, primary/quick actions, editorial tour/place presentation and inline responsive filters.
2. `mobile/src/components/CityHubHero.tsx` — dynamic photographic hero and accessible overlay copy.
3. `mobile/src/components/NativeChrome.tsx` — optional hub-only official logo proportions; tab destinations unchanged.
4. `mobile/src/components/ui.tsx` — optional hub header variant forwarding.
5. `mobile/src/components/WalkControls.tsx` — opt-in hub category/segment appearance and large-text wrapping; other consumers retain defaults.
6. `mobile/src/lib/cityHubPhotography.ts` — new identity-scoped existing-photo/license lookup.
7. `mobile/assets/images/city-hub-cinematic-wash.svg` — new code-native navy readability wash.
8. `mobile/assets/images/city-hub-blue-fill.svg` — new code-native brand-blue button fill.

Verification:

9. `mobile/tests/city-hub-photography.test.ts` — new identity and license regression tests.
10. `mobile/tests/city-hub-actions.test.tsx` — native/credit mocks for the updated component imports; action coverage retained.
11. `mobile/tests/city-hub-editorial-v1.test.ts` — updated scoped-photo assertion.
12. `mobile/tests/membership-screens.test.tsx` — native image mock; membership behavior coverage retained.
13. `mobile/tests/native-v2-regressions.test.tsx` — new real-metadata assertion, editorial heading/row and expanded-layout expectations.
14. `mobile/tests/places-v2-presentation.test.ts` — updated photograph sizing and text presentation expectations.

Evidence: this `docs/qa/screen-09-premium/` directory, including baseline copies, screenshots, comparison images, logs, final source hashes and `implementation-delta.patch`. The patch compares this redesign against its starting source snapshots, excluding earlier stacked onboarding changes. Test file history also contains earlier work; this list describes only this task's edits.

## Native interaction checks

Task-owned iPhone SE (375×667 pt) and iPhone 17 Pro (402×874 pt), iOS 26.5:

- City switcher opens existing guest discovery. Lübeck opens without sign-in; Hamburg and Düsseldorf remain disabled Coming Soon.
- Build my walk opens the existing builder. Previously selected History & Culture and Architecture were retained in the checked guest path.
- Explore places scrolls to the measured in-hub Places section.
- Near me uses the existing provider and reports location unavailable without blocking manual exploration. Successful GPS coordinates were not simulated in this run.
- Ask CITYWALK honestly reports unavailable city-wide answers and exposes the supported Explore places fallback.
- The route card opens its real detail with 45 minutes and five named stops. Back returns to the hub; detail correctly selects Trips and the hub selects Explore.
- Eat filters to real dining places. Map displays native map controls/markers; returning to List retains the category. All restores the place list.
- Holstentor Add to my walk changes to selected Remove from walk; removing restores the initial state. The place link opens the existing detail and Back returns correctly.
- Attribution opens author, crop notice, license, source and license links; Close returns to the hub. These link destinations reuse the approved photo record; no license was invented.
- English and German normal layouts captured. Maximum accessibility text in German was inspected; categories stack full-width with readable labels, and lower controls remain scroll-reachable. Existing five-tab labels wrap at maximum text; no navigation redesign was introduced.

These are simulator checks with AX inspection, not a full VoiceOver audit or physical-device/store acceptance.

## Automated verification

| Check | Actual result |
| --- | --- |
| `npm run test:run --prefix mobile` | 101 files, **870 passed** |
| Mobile TypeScript | passed |
| Mobile Expo lint (`--max-warnings=0`) | passed |
| Expo export iOS / Android / Web | passed, `/private/tmp/citywalk-screen09-premium-final` |
| Expo doctor | **21/21 passed** |
| Root `npm run test:run` | 268 passed / 27 skipped files; **1,902 passed / 239 skipped tests** |
| Root lint | passed; **15 existing warnings**, no errors |
| Root `npx tsc --noEmit` | passed |
| Root `npm run build` | passed with synthetic local auth configuration and isolated QA database |
| `npm run db:generate` | passed; no schema changes/migration generated |
| `npm run db:migrate` | passed against task-owned localhost:55604 QA database only |
| `npm run db:verify` | passed; 1 city / 25 places |
| Frozen onboarding hash verification | all 16 matched |
| `git diff --check` | passed |

Final mobile checks were rerun after the last accessibility filter fix. Root/DB gates ran earlier in this task; the subsequent change was scoped native control layout only. Logs are in `logs/`. Export is bundle verification, not an Xcode/Gradle binary build or Android device acceptance.

## Visual evidence and remaining differences

- [Final standard iPhone EN](screenshots/ios-standard-after-en.png)
- [Final standard iPhone DE](screenshots/ios-standard-after-de.png)
- [Final small iPhone EN](screenshots/ios-small-after-en.png)
- [Final small iPhone DE](screenshots/ios-small-after-de.png)
- [Standard Places section](screenshots/ios-standard-places-en.png)
- [Small Places section](screenshots/ios-small-places-en.png)
- [Maximum German text — readable stacked filters](screenshots/ios-small-de-max-text-filters.png)
- [Matched small-device before / after](small-before-after.png)
- [Latest reference / native comparison](reference-comparison.png)

Comparison images show uncomposited native captures, uniformly resized side by side with labels. The reference and iPhone have different aspect ratios and OS safe areas; this is a visual comparison, not a pixel-diff claim.

The licensed photographs differ from the supplied reference, and the navy wash is stronger for text readability. Actual route title/metadata/description differ as listed above. Missing city/place media uses a fallback. The hub is less dense than the illustration: Places requires scrolling, especially on the SE and with large text. No unsupported tour favorite or redundant See all links were fabricated for the single published tour. Existing native map and tab artwork differ from the illustration.

Known pre-existing gap: navigating to the separate `/city/[citySlug]/explore` screen can trigger Expo Router's array-of-styles Slot error on its search link. This source was not modified because Screen 10 is explicitly out of scope. In-hub Places navigation, filters, map and Guide fallback are operational. Five tab destinations remain unchanged; this report does not claim all-tab end-to-end acceptance. Android visual/device acceptance and successful live GPS are still unverified.

Stop point: Screen 09 visual approval. No Screen 10 work, commit, push, merge or deployment performed.
