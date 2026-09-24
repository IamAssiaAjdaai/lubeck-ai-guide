# CITYWALK V2 mobile parity

## Initial architecture audit (before implementation)

Baseline: `origin/develop` at `3684418`. Expo 57 / React Native 0.86 with Expo Router; one native application targets iOS and Android. Existing public API client validates published city/place DTOs; Better Auth uses SecureStore. Anonymous saved trips use AsyncStorage v2. Native MapLibre, Expo Audio and permission-aware Expo Location already exist. LocaleProvider supports EN/DE/AR with logical direction and safe-area/keyboard-aware screen primitives.

`packages/traveler-core` already shares distance, eligibility, ranking and the original personalized tour builder. V2 deadline planning, trip adaptation, context construction and copy remain web-owned. Native personalized trips currently page through place details, with four interests and two walking preferences; they have no V2 return-by/adaptation/finish state. Curated tours and legacy saved trips must remain readable.

Status below describes inspected implementation, **not device acceptance**. Both native columns refer to the same React Native source. Runtime acceptance is pending.

| Feature | Web | iOS | Android | Shared logic | Action |
| --- | --- | --- | --- | --- | --- |
| Multi-city Home | V2 | Partial | Partial | Public city API | Add search, location ordering, availability |
| City Hub | V2 | Partial | Partial | Public city/place/tour API | Add V2 entry points |
| Build Walk | V2 | Legacy | Legacy | Ranking, eligibility, distance | Share V2 settings/planner; seven interests and city tags |
| Return-by | V2 | Missing | Missing | None | Share exact budget and finish-leg calculation |
| Route Preview | V2 | Partial | Partial | Legacy builder | Metrics, ETA/buffer, itinerary/map/actions |
| Active Trip | V2 | Legacy paging | Legacy paging | Legacy navigation | Add resumable V2 journey |
| Adaptive Route | V2 | Missing | Missing | Web component | Extract shared proposals; explicit confirmation |
| Assistant | V2 context | Place only | Place only | Public verified-guide API | Share context builder and validation |
| Place detail | V2 | Partial | Partial | Public content, exact-locale audio | Saved/add-to-walk and source access |
| Error states | V2 | Partial | Partial | API failures | Route/map/storage fallback and retry |
| Saved | V2 | Legacy walks | Legacy walks | None | Add V2 walks/places/removal; preserve legacy storage |
| Finish | V2 | Basic count | Basic count | None | Visited highlights, metrics, share and feedback |

## Verification

At the initial audit, implementation and fresh checks were pending. A passing source assertion is not proof of a working native flow. Existing external AI, storage, tile-rendering and Stripe blockers must not be bypassed or reported as successful acceptance.

## Implementation

The existing native app remains intact: Expo Router, SafeAreaProvider, locale provider, authentication, public-content cache, audio, map adapter and curated-tour navigation are reused.

- Shared package: V2 settings, deadline/finish-leg planning, eligibility/ranking, shorter/add-stop proposals, elapsed budget, journey validation/advancement, guide-context construction/validation, launch status, and EN/DE/AR V2 copy. Web compatibility modules re-export the shared implementations. City-specific public tags supplement the seven interests on both platforms. Current taxonomy labels are shared in English/German/Arabic; unknown future editorial tags use a readable identifier fallback. Arabic-Indic clock digits are accepted by the shared return-by parser.
- Native UI: city search/location ordering and coming-soon states; hub entry points and nearby sorting; a dedicated planner/preview/active/finish route; explicit proposal review for skip/shorten/add/return; navigation links, itinerary, map fallback/retry, native share and local feedback.
- Persistence: new versioned AsyncStorage keys for active journeys, V2 saved walks and saved places. Writes are serialized. Existing `citywalk:local-trips:v2` entries remain readable, resumable and removable; no migration or reset. Account authentication remains optional.
- Content: failed images get a native placeholder. Place detail adds saved/add-to-walk actions and verified source links. The public place endpoint resolves publication before querying the existing verified-source provider. Source trust and publication remain separate.
- Assistant: native requests add validated active-trip metadata through the same shared context builder as web; city/current-place stay in the request envelope. No client-provided metadata becomes source evidence or authorization.
- Native-specific adapters remain native: Expo Location permissions/provider settings, Expo Audio, MapLibre, SecureStore/AsyncStorage, React Native Share/Linking, safe areas, Android back handling and keyboard behavior. Scroll screens adjust keyboard insets on iOS; Android retains resize behavior.
- Guidance: the permanent parity rule is in root `AGENTS.md`; `.github/pull_request_template.md` includes the platform matrix/checklist.

## Automated validation — 2026-09-24

| Check | Result |
| --- | --- |
| Entire root suite, `npm run test:run -- --maxWorkers=2` | **818 passed, 22 gated DB tests skipped**, 138 passing files and 5 skipped files |
| Web portion of root suite | **802 passed**, plus the 22 DB tests gated in the normal run |
| Shared package portion (included in 818) | **16 passed** across 2 files; do not double-count |
| Entire mobile suite, `npm run mobile:test` | **185 passed**, 33 files, no skips |
| Native interaction subset (included in 185) | **9 passed**: EN/DE/AR plan-preview-save-start, shorten confirmation/cancel, visited/finish/share/feedback, GPS denial/invalid deadline, return-only confirmation, add request review, storage failure |
| DB integration suites | **22 passed**: CMS 5, content 6, media 7, commerce 3, knowledge 1 |
| Database generation/migration/verification | Passed; no schema changes; 2 cities / 44 places |
| Native TypeScript / lint / Expo config | Passed |
| Web TypeScript / lint | Passed |
| Native Metro export (iOS + Android) | Both Hermes bundles exported successfully to `/tmp`, not into the repository |
| Web production build | Passed, exit 0. A sandbox port error was cached by Turbopack; moving only the generated cache to `/tmp` and rebuilding with worker-port access resolved it |
| Diff whitespace / credential and artifact review | Passed; no `.env`, credentials, lockfile churn or generated bundles in the diff. QA screenshots are intentional evidence |

The native interaction tests render the real flow component and exercise its events/state with native bridges and visual primitives mocked. They are useful functional regression evidence, **not** proof of iOS/Android rendering, permissions, audio, maps, VoiceOver/TalkBack, keyboard, safe areas or native sharing.

## Native acceptance blockers

- iOS: installed Xcode is **14.2**; only an iOS **16.2** runtime is installed and no simulator is booted. Expo 57 requires a newer toolchain and iOS baseline ([versioned Expo documentation](https://docs.expo.dev/versions/v57.0.0/)). No iOS screen/flow acceptance is claimed.
- Android: API 36 SDK is installed, but `android emulator list` returns no AVDs, the SDK has no `system-images` directory, and `adb devices` lists no connected devices. No Android screen/flow acceptance is claimed.
- Existing external blockers remain: real Upstash-backed AI completion, S3 image delivery, full map tile rendering, and Stripe sandbox acceptance. Test mocks and graceful fallbacks do not resolve these dependencies.

## Remaining acceptance on compatible devices

Run on iOS and Android with the real isolated Preview API: Home search/status/location denial and success → City Hub → each planner duration and future return time → preview → save/reopen/remove → start → listen/read/contextual assistant → skip/shorten/add/return confirm and cancel → finish/share/rating/time-fit feedback. Repeat critical controls in German and Arabic RTL, including long labels, text scaling, screen reader state, safe areas, keyboard, Android back, native deep links and map failure with itinerary access. Also verify app restart restores the active journey and preserves legacy saved walks. Until those checks pass, cross-platform acceptance is **not complete**.


## Implementation status after the audit

**Implemented** means code exists and automated checks/bundles pass. It does not mean native device acceptance passed. The iOS and Android UI share the same React Native implementation; both still require the device checks above.

| Feature | Web | iOS | Android | Shared logic | Remaining acceptance |
| --- | --- | --- | --- | --- | --- |
| Multi-city Home | Implemented | Implemented | Implemented | Launch registry, public API | Native search/status/location on device |
| City Hub | Implemented | Implemented | Implemented | Public city/place/tour data, ranking | Native navigation and nearby ordering |
| Build Walk / categories | Implemented | Implemented | Implemented | Settings, eligibility, ranking, localized category labels | Native controls, scrolling, text scaling |
| Return-by / finish leg | Implemented | Implemented | Implemented | Clock parsing, budget and finish-leg measurement | Native clock input and live-location cases |
| Loading / route preview | Implemented | Implemented | Implemented | Planner output and V2 copy | Native loading, layout, map rendering |
| Active Trip | Implemented | Implemented | Implemented | Route measurement, settings, eligibility | Native location/map/audio/navigation |
| Adaptive Route | Implemented | Implemented | Implemented | Shorter/add proposals and budget rules | Device confirm/cancel/back interactions |
| Assistant | Implemented; external AI blocked | Context wired; external AI blocked | Context wired; external AI blocked | Context builder + server validation/verified guide API | Real provider response and native keyboard |
| Place Detail | Implemented | Implemented | Implemented | Public details, verified-source provider | Native images/audio/source links/add action |
| Error states | Implemented | Implemented | Implemented | Copy and API failure boundaries | Device network/map recovery; external services |
| Saved | Implemented | Implemented | Implemented | Route validation; platform storage adapters | Native restart/remove, legacy compatibility on device |
| Finish | Implemented | Implemented | Implemented | Journey settings/metrics and V2 copy | Native share sheet/intent, screen reader, feedback |

## Actual browser checks

Local production build at `http://localhost:3034`, 390×844, using the real local public-content API/database:

- Home showed Lübeck available and Hamburg/Düsseldorf coming soon.
- English planner generated a **115-minute, five-stop loop** from Holstentor using History + waterfront interests. Preview, save, start, mark visited, shorter-route review/cancel, and return-to-start confirmation worked.
- Return-only state displayed **REMAINING WALK**, retained Navigate, and showed the friendly map fallback. Full provider map rendering remains unverified.
- Finish reported one visited place and its highlight, cleared the active session, and persisted the time-fit feedback.
- Saved-walk removal persisted after page reload. The removal control is icon-only with the accessible label `Remove walk: Lübeck`.
- The real public Holstentor detail endpoint returned HTTP 200 with **one verified source**, using an HTTP(S) URL. No fixture/source trust substitution was used.
- Real unavailable images showed placeholders in the preview. This is fallback evidence, not evidence that S3 delivery is repaired.
- German and Arabic planner screens showed no horizontal overflow. Arabic uses the RTL `main.app-shell` container; `document.documentElement` remains LTR, so checking only the root element would be misleading.
- The first Arabic visual check exposed English labels for additional city tags. Shared EN/DE/AR category labels were added; the final build was rechecked at `http://localhost:3035`. English/German/Arabic category labels passed; the Arabic app container was RTL; all three locales had no horizontal overflow. The English return-by preview showed the ETA/target buffer. Final screenshots and `web-locale-checks.json` were refreshed.

Evidence: `web-en-preview.png`, `web-en-return.png`, `web-de-planner.png`, `web-ar-planner.png`, `web-locale-checks.json`. These are **web** screenshots, not native screenshots.

## Commit boundary

No commit, push, deployment, seed or import was performed. This branch is `feat/citywalk-mobile-parity`, based on the merge of the prior acceptance work into `develop`. The implementation is reviewable, but native acceptance and external service acceptance are not complete; this is not a merge-readiness claim.

Do not force-add ignored `.env.local`, `.next/`, `.expo/`, `node_modules/`, `mobile/node_modules/`, `next-env.d.ts` or `*.tsbuildinfo`. Bundles, validation scripts, browser helpers and raw logs are in `/tmp`. No file in the reviewed change set needs exclusion.


### Changed entry points and components

- `mobile/src/app/index.tsx`, `city/[citySlug]/index.tsx`, `city/[citySlug]/walk.tsx`, `saved.tsx`, and the existing place/guide routes.
- `NativeWalkFlow.tsx`, `WalkControls.tsx`, `NativeTourPlanner.tsx`, `NativeCityMap.tsx`, `NativeContentImage.tsx`, header and screen primitives.
- `mobile/src/lib/walkStorage.ts`, legacy trip removal, public DTO parsing and guide-request contract.
- `packages/traveler-core/src/walkPlanner.ts`, `walkJourney.ts`, `walkGuideContext.ts`, `walkCopy.ts`, `cityAvailability.ts` and `copy/{en,de,ar}.json`.
- Web planner/journey/session adapters, public place-detail API, focused shared/native/API tests, root guidance and PR template.

The three deleted `src/translations/walk/*.json` paths are intentional moves into the shared package, not removed language support. There are no dependency/lockfile changes or database migrations.

### Final gate exit codes

- `web-full`: 0
- `mobile-tests`: 0
- `web-ts`: 0
- `mobile-ts`: 0
- `web-lint`: 0
- `mobile-lint`: 0
- `web-build`: 0
- `mobile-bundle`: 0
