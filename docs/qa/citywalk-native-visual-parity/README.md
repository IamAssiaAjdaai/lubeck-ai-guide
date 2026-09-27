# CITYWALK Web → Native visual parity

## Current checkpoint status — 2026-09-27

Implementation Commit 1 is `c23b0eb6e10321a2e8c5e89d1d5e9f737dde90bd` (`feat(citywalk): integrate launch localization and validated native traveler flows`). It was committed locally with owner approval; no push, build, deployment or publication accompanied that commit. This documentation checkpoint does not modify it.

- **Owner-confirmed iPhone acceptance:** the specific Start/Save/Rebuild correction round, including all six Save checks; Add stop Close/Cancel/confirm-once/rejection feedback; accepted Home/Explore/Back and membership behavior; audible English narration with Silent mode ON, Pause/Resume, no English playback in the tested German flow, and working playback after returning to English.
- **Presentation evidence:** English at Control Center Text Size 110% / All Apps, readable actions/navigation, full-width filters/toggle and Home/City Hub brightness were owner-confirmed. German at 110%, returning to the prior text size and other unanswered physical checks remain **UNVERIFIED**. The later compact German notice after catalog-refresh correction still needs explicit visual confirmation.
- **Automated checkpoint:** 868 Web/shared + 468 mobile + 22 isolated DB tests passed; TypeScript/lint passed; 440 keys × 7 catalogs, zero errors. Exported Commit 1 staging checks added 75 focused tests plus TypeScript, targeted lint and i18n validation. These are local results, not device/release certification.
- **Android and release readiness remain UNVERIFIED.** No newly supplied model/OS/build/source identity is inferred for owner confirmations. Native review-module availability, source-matched release builds and external/content acceptance stay separate.
- Historical media 502s were followed by successful sampled image delivery and full English audio delivery/decoding, then owner-confirmed audibility. This does not establish provider repair causality, new-upload success or city-wide audio coverage.

The dated sections below retain their original investigation/test context; earlier pending failures, source hashes, build records and no-commit statements are **historical**, not current blockers or a claim of new deployment. For scoped evidence, use the latest dated owner results and [reviewed checkpoint](reviewed-checkpoint.md). Missing screenshots mean **UNVERIFIED**, not a demonstrated visual mismatch. Current surface scope follows #136; literal Web/native duplication is not a universal release gate.

Private local paths, registration/access links and transient request/process IDs are omitted from this portable record. `${DEVELOP_PREVIEW_ORIGIN}` denotes the configured develop Preview, not a public URL or a newly verified deployment.

Audit recorded before implementation, 2026-09-25. Source of truth: refreshed `origin/develop` / `7e6abee`. Existing EAS configuration/acceptance changes are preserved. TestFlight Build 7 is described by the product owner as functional acceptance only; no new store build is authorized here.

## Pre-implementation comparison

| Screen | Web V2 | Current native | Required changes |
| --- | --- | --- | --- |
| Global Home | Skyline wordmark with language picker; waterfront backdrop; question/subtitle; location CTA; search; horizontal photographic city cards including upcoming cities | Old large illustration/headline/discover CTA; vertical city cards; upcoming text rows; no bottom nav | Reuse Web artwork/copy, horizontal cards, availability/chevron, five-item nav |
| City Hub | 218px hero, city title/subtitle, primary planner CTA, four compact actions, visual suggestions, optional city details, discovery/map | Large standalone photo and prose, five stacked buttons, old planner mixed into hub | Hero overlay, four-column actions, compact photographic tour suggestions; retain discovery/map and content |
| Build Walk step 1 | Branded overlay, step dots, 2×2 150px duration cards with icons/help, deadline area, sticky Continue | Heading, generic chip choices, inline return input and button | Duration cards, progress, headline, separated deadline area and persistent CTA |
| Interests/start/end | Step 2: icon chips, selected borders/checkmarks, three-way walking segment; step 3: location/place and endpoint choices | All controls share generic wrapped boxes; every place exposed at once | Distinct chip/segment/radio styles, numbered sections, compact place picker; preserve selection logic |
| Loading | Waterfront headline, animated 174px ring, four named stages, reassurance | Generic activity spinner and joined text | Native ring/real phase labels; no fake percentage/delay |
| Route Preview | Your CITYWALK/title; three metrics; return feasibility; compact numbered/photo itinerary; start/customize/save | Text metrics, map before itinerary, itinerary as full-width buttons | Three-column metrics, feasibility surface, compact itinerary, optional map, CTA hierarchy |
| Active Walk | Stop counter/title; prominent map; walk/navigation bar; three quick actions; four trip controls; assistant sheet | Stacked title/metrics/actions, combined Listen/Read, no stop counter | Same hierarchy, separate quick actions, compact controls, contextual assistant surface |
| Assistant | Branded rounded conversation/sheet; soft-blue prompts, sources, blue CTA | Purple AI styling; otherwise native conversation and source handling | Shared blue palette, V2 sheet/conversation hierarchy; preserve API/history/limits |
| Place Detail | Hero first, category/title/story, facts/audio/verified sources, add-to-walk action | Save/add buttons precede media; generic hierarchy | Hero/title/story first; compact save/add actions and facts/audio/source sections |
| Saved | Heading; compact bookmark cards with metadata/open/remove; empty/trips distinction | Full-width stacked buttons and plain empty text | Compact saved rows, icon action, trip tab/resume, styled empty state |
| Finish | Success check, heading, three stats, highlights, save/share, feedback | Plain title and joined stats, stacked actions | Success motif and metrics; consistent itinerary/feedback cards |
| Error/Empty | Waterfront/map-compass artwork, centered title/help, primary retry/secondary return | Inline messages or generic text | Shared illustrated states preserving retry/back and error semantics |
| Explore/map | V2 cards and image priority surrounding map/fallback | Existing native MapLibre, generic surrounding cards | Preserve native map/GPS/fallback; apply tokens/cards/nav |

## Measured source tokens and layout

Final CSS values from `src/app/globals.css`: canvas #fbfdff; navy #09234d; primary #155caf; accent #0967c8; secondary #61748c; muted #657b98; light surface #f2f7fc; selected #eaf3fc; border #dce6f0; success #218653. Content max width 480px, horizontal padding 24px (16px at ≤360px). Radii 12px itinerary, 15–16px cards/buttons, 22px large cards, 24px assistant. White-card shadows use navy at 3.5–4.5%. Home headline 29–37px responsive; planner/preview 30px; active title 28px; card title 18–21px; body 14–16px; metadata 11–13px. Buttons ≥48px; navigation items ≥48px plus safe-area inset. Web uses Geist with sans fallback; native system font is an explicit platform adaptation pending screenshot review.

Sources inspected: `src/components/walk/{AppHeader,BottomNavigation,CitySelector,CityHubActions,WalkPlanner,WalkStates,WalkJourney,RouteSummary,FinishWalkScreen,SavedWalks}.tsx`, `src/components/travel/{CityExperience,PlaceExperience,TourCard}.tsx`, `src/app/globals.css`; corresponding native routes, `NativeWalkFlow`, `WalkControls`, `ui`, tokens, media adapter and MapLibre boundary.

## Screenshot acceptance

This historical screenshot matrix records available captures; owner-confirmed scenarios elsewhere in the ledger remain valid within their tested iPhone scope. Android requires its own evidence. Missing evidence is recorded as UNVERIFIED, not an observed mismatch or accepted difference. The local Xcode/runtime limitations from the native acceptance report still apply until rechecked.

| Screen | Web | iOS | Android | Match status | Exact mismatch / missing evidence |
| --- | --- | --- | --- | --- | --- |
| Global Home | [Web](screenshots/web/home-390.png) | Not captured | Not captured | UNVERIFIED | No native capture; layout difference cannot yet be measured. |
| Available city cards | [Web](screenshots/web/home-390.png) | Not captured | Not captured | UNVERIFIED | No native capture; layout difference cannot yet be measured. |
| Lübeck City Hub | [Web](screenshots/web/city-hub-390.png) | Not captured | Not captured | UNVERIFIED | No native capture; layout difference cannot yet be measured. |
| Suggested now | [Web](screenshots/web/city-hub-390.png) | Not captured | Not captured | UNVERIFIED | No native capture; layout difference cannot yet be measured. |
| Build My Walk — time | [Web](screenshots/web/planner-time-390.png) | Not captured | Not captured | UNVERIFIED | No native capture; layout difference cannot yet be measured. |
| Build My Walk — interests/walking/start/end | [Web](screenshots/web/planner-interests-390.png) | Not captured | Not captured | UNVERIFIED | No native capture; layout difference cannot yet be measured. |
| Building your CITYWALK loading | Pending genuine capture | Not captured | Not captured | UNVERIFIED | No native capture; layout difference cannot yet be measured. |
| Route Preview | [Web](screenshots/web/preview-390.png) | Not captured | Not captured | UNVERIFIED | No native capture; layout difference cannot yet be measured. |
| Active Walk | [Web](screenshots/web/active-390.png) | Not captured | Not captured | UNVERIFIED | No native capture; layout difference cannot yet be measured. |
| Assistant/adaptive route | [Web](screenshots/web/assistant-390.png) | Not captured | Not captured | UNVERIFIED | Web reference is the guide sheet; native guide/adaptation captures remain missing. |
| Explore + map | [Web](screenshots/web/explore-map-390.png) | Not captured | Not captured | UNVERIFIED | No native capture; layout difference cannot yet be measured. |
| Place Detail | [Web](screenshots/web/place-detail-390.png) | Not captured | Not captured | UNVERIFIED | No native capture; layout difference cannot yet be measured. |
| Saved | [Web](screenshots/web/saved-390.png) | Not captured | Not captured | UNVERIFIED | No native capture; layout difference cannot yet be measured. |
| Finish | [Web](screenshots/web/finish-390.png) | Not captured | Not captured | UNVERIFIED | No native capture; layout difference cannot yet be measured. |
| Error state | Pending genuine capture | Not captured | Not captured | UNVERIFIED | No native capture; layout difference cannot yet be measured. |
| Empty/no-route state | [Web](screenshots/web/empty-trips-390.png) | Not captured | Not captured | UNVERIFIED | Web reference is empty Trips; no-route and both native captures remain missing. |


## Implementation ready for native review — not accepted

Presentation was updated on `fix/citywalk-native-device-acceptance`. No Web/shared domain/backend source or dependencies were changed. There has been no commit, push, native store build, TestFlight upload or Play submission in this pass.

- Shared native tokens now mirror the final Web V2 palette, 480px content width, responsive horizontal spacing, typography, radii and shadows. Native system fonts and platform symbols still need side-by-side review; they are not yet accepted differences.
- `NativeChrome` supplies the skyline wordmark, Home language selector, back action and safe-area-aware five-tab navigation. Home/Explore/Trips/Saved/Profile routes are functional. The planner has a sticky action footer and step-aware back/scroll behavior.
- Home uses V2 copy, search/location, photographic availability cards and localized upcoming-city descriptions. City Hub uses the waterfront hero, primary planner action, four compact quick actions, photographic suggestions, localized All/See/Eat/Fun discovery filters and List/Map controls around the existing native map.
- The planner follows the current Web's **three** steps: time/deadline, interests/walking, then start/end. Native modal place selection replaces the platform Web select; existing planner inputs and shared calculations are retained.
- Loading/error, three-metric preview, numbered photographic itinerary, active walk map/actions/controls, assistant, saved rows and finish state use reusable V2 presentation components. Separate Listen/Read actions route to the existing place detail/audio surface. Place images precede story/actions; existing facts, exact-locale audio and source links remain.
- The existing MapLibre adapter, location permissions, audio player, planner/adaptation functions, confirmations, persistence schemas, assistant API, authentication and backend contracts remain in place. Source/bridge tests do not establish their behavior on a real device.

### Files changed

This visual pass changes `AGENTS.md`; `mobile/src/design/{tokens,walkStyles,discoveryCopy}.ts`; `mobile/src/components/{ui,NativeChrome,V2Presentation,WalkControls,NativeWalkFlow,NativeContentImage,LocaleSelector}.tsx`; native Home, City Hub, Place Detail, Assistant, Saved, Account and root-layout routes; two copied Web artwork assets in `mobile/assets/images`; and the corresponding mobile presentation/flow/image tests. The old Home source-string test is replaced by rendered interaction tests.

Pre-existing work preserved: `.easignore`, `mobile/eas.json` Preview API origin corrections, their config test expectations and `docs/qa/citywalk-native-device-acceptance/README.md`. The user-added App Store Connect app ID in `mobile/eas.json` is preserved. These configuration changes are not a new store build.

### Media investigation

Read-only requests used the current develop Preview at `${DEVELOP_PREVIEW_ORIGIN}`.

| Surface/probe | Observed | Classification and handling |
| --- | --- | --- |
| Home Lübeck approved media | API returns media; `/api/media/d90f55b7-14ff-4fb5-b196-b7afec17d825?variant=card` returns **502**, text/plain | Remote/S3-backed delivery failure. Native first attempts the approved image, then the existing published Holstentor image. This does not resolve the S3 blocker. |
| Suggested historic-center tour | Tour API has **0 media** | API returned no tour image. Use its first stop's existing published media/image; no synthetic tour/placeholder content was added. |
| `/landmarks/holstentor.jpg` | **200**, image/jpeg | Published city/place fallback is reachable. |
| Hamburg, Düsseldorf, waterfront WebP assets | **200**, image/webp | Published artwork is reachable and now used for upcoming cards/brand surfaces. |
| Public content-image card variants for Holstentor and Marienkirche | **200**, image/webp | These sampled application image URLs resolve without auth redirects. |
| Other itinerary placeholders in Web reference | Visible in `preview-390.png` | Not evidence of native format failure; individual delivery URLs still need native/live review. Fallback only uses an existing image for that place, otherwise the accessible placeholder remains. |

No unsupported-format or auth/proxy failure was established for the successful samples. Native URL resolution is still based on the configured API origin. This is a host HTTP audit, not proof of image rendering on iPhone/Android. The image component attempts a distinct fallback once, forwards delivery errors and resets on source change; tests cover failure → fallback → labelled placeholder, source replacement, and avoiding duplicate URL retries.

### Automated validation of the final visual revision

| Check | Result |
| --- | --- |
| Full mobile suite: `npm run test:run --prefix mobile` | **188 passed, 34 files**, no unhandled errors |
| Shared core: `vitest run packages/traveler-core` | **16 passed, 2 files** |
| Mobile TypeScript | **PASS** |
| Mobile lint (`--max-warnings=0`) | **PASS** |
| Expo public config | **PASS** |
| Expo Doctor, actual local workspace | **20/21**; CocoaPods tooling check fails (missing/unavailable locally). First attempt was 19/21 with an additional transient Expo API schema connection failure; retry cleared the schema check. No checks were disabled. |
| iOS Hermes bundle export | **PASS**, final output `<local-only temporary artifact>` |
| Android Hermes bundle export | **PASS**, same output directory |
| Web/full DB suites | Not rerun for this native presentation pass: Web/shared/backend source unchanged. Historical 818 Web/shared and 22 DB tests are not claimed as fresh results. |
| Diff hygiene | `git diff --check` passed; changed/untracked paths and text reviewed for secret patterns, private env files and build artifacts; none found in the proposed source changes. |

One earlier full mobile run hit a 5-second English walk-flow timeout while the host was busy (184 passed, 1 timed out). Subsequent complete runs passed without raising timeouts or changing test behavior. The final count includes three new image-delivery tests. Existing EN/DE/AR flow tests continue to cover planning, saving, starting, guarded route changes and persistence with native bridges mocked.

Bundle exports are JavaScript/assets checks, not signed native builds, install/launch checks or screenshot acceptance. Logs and exports stay under `<local-only temporary artifact>`; ignored `mobile/ios`, `mobile/android`, local env/config caches and build outputs must not be staged.

### Native evidence blockers and required acceptance

- iPhone: user confirmed a device is available, but `xcrun xctrace list devices` and a separate USB inventory still detect **no connected physical iPhone**. The pending device question asks for a connected, unlocked/trusted phone and whether a CITYWALK development client is installed. TestFlight Build 7 cannot show these local UI changes.
- iOS simulator: Xcode **14.2**, only iOS **16.2** runtimes on this Mac. The current Expo 57 / React Native 0.86 application requires the newer supported toolchain (Xcode 26.4+ / iOS deployment target 16.4). The local simulator cannot run this app. CocoaPods is also unavailable. No package downgrades or blind upgrades were performed.
- Android: no attached device in `adb devices`. Previous acceptance recorded emulator package/window service failures on this host; no working Android native session exists for this revision.
- Upstash, S3-backed media/audio failures, full native map rendering and Stripe sandbox acceptance remain external/unverified. No fake services, screenshots, success states, credentials or production bypasses were introduced.
- Native screenshots for **every matrix row** remain missing. Therefore every screen remains **UNVERIFIED** and none is called complete. Native small-phone, standard-iPhone, large-Android and tablet layouts, EN/DE/Arabic RTL, font scaling, keyboard, VoiceOver/TalkBack, real GPS/audio/map/sharing, login and background/restart persistence still require connected native execution.

**Not ready for a new TestFlight / Google Play build.** Connect a supported development client, load this working tree through Metro, capture/review all matrix states on iOS and Android, resolve actual mismatches, then obtain the user's explicit build approval. No new store version is authorized by this report.


### Screenshot provenance and limitations

All committed-candidate images in `screenshots/web/` are genuine browser captures of the develop Preview, not React Native renders, emulators, generated mockups or device evidence. Main reference viewport: 390×844. Home references also cover 320×740, 430×932 and 768×1024. English and German Home references are included; Arabic RTL is captured separately. There are **19 Web screenshots**, providing references for 14 of the current 16 screen rows plus size/locale variants (empty Trips is only a partial reference for the no-route row). Planner step 3 has a separate [start/end image](screenshots/web/planner-start-end-390.png).

The Web active-walk reference shows a real map fallback. The discovery-map reference shows markers/controls over a blank basemap; this is not successful full map rendering. Web loading was too brief to capture reliably; a route-build error was not induced. Those Web reference rows remain pending, without injected delays or mocked service responses. During browser automation, coordinate clicks on below-fold preview controls reached the fixed bottom navigation; the actual button handlers were then activated through their DOM controls to capture Saved/Active/Finish. This observation is not claimed as a Web fix or native equivalence.

Source/assets fingerprint after automated validation: SHA-256 `3006d62a476838b7d8e70cad877bb92443986598787165bd5a3f4361c80d922c` (sorted paths and contents of `mobile/src` and `mobile/assets`). No source edits followed this validation; subsequent changes are QA documentation/screenshots only.


## Internal EAS QA build round — 2026-09-25

The user authorized **internal release builds only**, from the uncommitted visual revision, with no UI changes before screenshot review. This supersedes the previous development-client-only preview path. No commit, push, TestFlight/Store Connect submission, Google Play submission or public publication is authorized/performed.

### Frozen source and build settings

- Working branch: `fix/citywalk-native-device-acceptance`; source baseline HEAD remains `7e6abee` with the uncommitted V2 presentation changes included.
- Audited the historical EAS archive using `eas build:inspect --platform android --profile preview --stage archive` with a local-only output directory.
- Snapshot: **770 files, 38,210,262 bytes** before compression; sorted path/content SHA-256 **`599c076b8f7509f864fa8c79606c4b02b250ae109a1e920b29aed6062274ca72`**. This is a source manifest fingerprint, not the compressed upload checksum.
- All mobile/shared files in the snapshot were compared byte-for-byte with the working tree. Native source/assets fingerprint remains **`3006d62a476838b7d8e70cad877bb92443986598787165bd5a3f4361c80d922c`**. No UI edits were made in this build round.
- `.easignore` excludes secret environment files, signing files, Git metadata, dependency directories, generated local iOS/Android projects and build outputs. The archive audit found none of these and no credential-pattern hits. Temporary dependency symlinks support local CLI inspection and are excluded from uploads.
- Existing `preview` profile is now explicit: `distribution: internal`, `developmentClient: false`, `environment: preview`, automatic remote build numbers, Android `buildType: apk`, iOS `buildConfiguration: Release`. Release JavaScript/assets are embedded; this is not a Metro development client. Bundle/package identifier: **`com.citywalk.app`**; app version **1.0.0**.
- Only the profile configuration and its existing configuration test were changed in this round. Configuration tests: **13 passed / 1 file**. Earlier full visual-revision validation (188 mobile / 16 shared tests, TS/lint/exports) still applies to unchanged application code.
- Both platform requests use the same frozen directory with `EAS_NO_VCS=1`. Corrected requests use the canonical `EAS_PROJECT_ROOT=<canonical QA source root>` and `<local-only temporary artifact>` working directory (see packaging correction below). No Git commit is needed or made. Platform-specific remote version numbers/signing differ by design.
- Existing project: `configured private CITYWALK Expo project` (`ce652902-908a-4e73-8c2c-9ee5aafbfd53`). Its project visibility remains `hidden`. Internal-build download privacy was changed from `PUBLIC` to **`PRIVATE`** and re-read from EAS, so authorized Expo sign-in is required. This is the [official EAS internal-distribution access setting](https://docs.expo.dev/build/internal-distribution/).

### Backend preflight

Both profiles use only `${DEVELOP_PREVIEW_ORIGIN}`. No localhost, LAN origin or stale beta-store origin is used. EAS reported no Plain text/Sensitive variables in the Preview environment; the profile injects the public environment name and origin.

| Check | Fresh result |
| --- | --- |
| `/api/content/cities?locale=en` | **200 JSON**, 1 city, no redirect/auth gate |
| `/api/content/cities/lubeck?locale=en` | **200 JSON**, 25 places, 1 tour |
| `/api/content/cities/lubeck/summary?locale=en` | **200 JSON**, 25 place cards, 1 tour; native DTO parser accepts the response |
| `/api/content/cities/lubeck/places/holstentor?locale=en` | **200 JSON**, city/place/verifiedSources |
| `/api/auth/get-session` without cookies | **200 JSON `null`**, expected guest state; no account creation or authenticated-login claim |
| Shared planner with the fresh summary | 2-hour history/architecture route from Holstentor produces **5 stops, 118 minutes, ~937m**. Planner runs in shared native code using published API data, not a fabricated planner endpoint. |
| Approved city card media | **502**, still unresolved |
| Published `/landmarks/holstentor.jpg` | **200 JPEG**, fallback reachable |

### Media effect during this QA round

The existing fallback stays enabled. Home's available-city image falls back from approved media to the published city-launch image; upcoming-city cards use their real published images. Suggested tours with no tour media use the first stop's image. Explore cards, itinerary thumbnails and Place Detail try the existing published image for that same place after delivery failure; they keep an accessible placeholder if both sources fail. The waterfront/brand artwork is copied from Web and bundled locally.

These images occupy the intended V2 city-card, suggestion, thumbnail and detail-hero positions; no replacement design or fabricated image was introduced. Their final native crop/spacing/rendering must still be judged in screenshots. S3 502 is documented, not treated as a reason to prevent the QA build. Upstash, full map rendering, real audio and Stripe acceptance are not faked or claimed resolved.

### Device and screenshot handoff

Official iPhone registration workflow: official EAS device registration in Safari (session link retained locally). Follow the EAS/Apple profile instructions; manual UDID copying is unnecessary. EAS already lists one enabled iPhone registered on September 23; the owner confirmed registration and that this is the review device. Apple login succeeded through the existing local Keychain/session, and the existing distribution certificate is reused. No password or private key was copied into source or this report.

Capture English first after installing the **new internal release artifact**, then representative German/Arabic RTL screens. Record device model/OS, build ID/version, installation/launch result and original PNG filenames. Capture all 16 rows above; include both planner preference and start/end screens, assistant conversation and adaptation confirmation. For fast loading, capture a native screen recording frame without adding fake delays; capture real error/empty states and note the trigger. Do not alter UI during this first review. Review each image against Web and record the exact observed mismatch before proposing final polish.

No native installation or screenshot is established in this round yet. Existing screenshots are Web only. Build completion, if successful, will not by itself change any parity status to MATCH.


### Internal build requests and current blockers

| Platform | Build ID / install page | Profile | Identifier / version | Current result |
| --- | --- | --- | --- | --- |
| iOS | 1e7f02cb-26c7-4cce-9df8-ff515042e8ac (historical internal build; access link retained locally) | `preview`, internal Release | `com.citywalk.app`, **1.0.0 (8)** | **FAILED before dependency installation**: EAS project-root path mismatch; no IPA. Ad-hoc profile is active and includes the confirmed review iPhone. |
| iOS replacement | e18db018-1716-4886-aede-aa3919bc6b95 — install (historical internal build; access link retained locally) | `preview`, internal Release | `com.citywalk.app`, **1.0.0 (9)** | **FINISHED**. IPA downloaded and inspected; registered review iPhone is included in ad-hoc provisioning. Physical installation/launch and screenshots await owner/device evidence. |
| Android | **No build ID / no new APK** | `preview`, internal APK | `com.citywalk.app`, 1.0.0; code **4 allocated but not built** | EAS rejected scheduling because the account's monthly Android Free-plan quota is exhausted. EAS reports reset **October 1, 2026**. |

Android source upload succeeded before the quota rejection; no build job was created. A fresh build-list check still shows the previous September 24 APK as the latest preview build. It does **not** contain this V2 revision and must not be used for visual acceptance. No x86_64-only setting exists in this clean managed snapshot; the requested APK uses Expo's normal device ABIs, including ARM64, but physical compatibility cannot be verified without a new compiled artifact. No billing upgrade, quota bypass or account switch was performed. The owner chose to upgrade independently and requested a retry afterward. A fresh read still reports the Free plan; no new Android request will be made until capacity is available.

The iOS request created a new active ad-hoc provisioning profile using the existing distribution certificate. EAS confirms the registered iPhone is provisioned. The owner confirmed this is the current review iPhone. There is no App Store Connect/TestFlight submission.


### iOS packaging correction

The first iOS internal request (`1e7f02cb-26c7-4cce-9df8-ff515042e8ac`, build 8) failed before installing dependencies. Its cloud job used `<local-only temporary artifact>` and could not find `package.json`. The historical command mixed a symlinked temporary-directory alias with its canonical process directory. This produced an incorrect relative project root; the uploaded source and signing were not the failing boundary. The uploaded source itself was intact.

Retry uses **`EAS_PROJECT_ROOT=<canonical QA source root>`** with the canonical `<local-only temporary artifact>` working directory. The CLI path calculation is verified to produce exactly **`mobile`**. No source files, dependencies or UI changed. Remote credentials are frozen during the non-interactive retry; the active ad-hoc profile already contains the owner-confirmed iPhone. The retry intentionally increments the remote build number again; failed build 8 is not an install artifact.

Replacement build `e18db018-1716-4886-aede-aa3919bc6b95` (1.0.0, build 9) confirms `projectRootDirectory: mobile` in its actual cloud job. It passed `READ_PACKAGE_JSON`, dependency installation, Expo Doctor, prebuild, installation of 116 CocoaPods, Xcode project configuration, embedded JavaScript bundling and native release compilation. EAS reports **FINISHED**. This verifies that the missing-package error is resolved; physical-device acceptance remains a separate check.

### Successful iOS artifact verification

The replacement IPA was downloaded to `<local-only temporary artifact>`, outside the repository, and its actual package metadata inspected:

- `CFBundleIdentifier`: **`com.citywalk.app`**; version **1.0.0**, build **9**.
- Native target: **iPhoneOS**, minimum iOS **16.4**; not an iOS simulator artifact.
- Embedded ad-hoc profile contains **one device**, matching the owner-confirmed enabled iPhone. `get-task-allow` is **false**; profile expires September 23, 2027. Device identifiers and signing material are omitted from this report.
- `Payload/CITYWALK.app/main.jsbundle` is embedded and contains the expected develop Preview HTTPS origin. No development-client framework was found; the `preview` build also explicitly sets `developmentClient: false` and Release configuration.
- IPA size: **19,578,936 bytes**. Package inspection is not a claim of successful on-device installation or runtime behavior.

Open the replacement build's **install** link above in Safari on the registered iPhone, authenticate to the private Expo project and install. The owner has been asked to confirm installation and launch. A fresh `xcrun xctrace list devices` still detects no connected physical iPhone, so this Mac cannot capture native evidence yet.

Current screenshot coverage remains **19 Web / 0 iOS / 0 Android**; **0/16** required native screen rows are verified on either platform. No observed visual mismatches can yet be classified; matrix rows remain **UNVERIFIED** because evidence is missing. iOS visual review can now begin after installation, but final visual-polish approval remains pending native captures and Android build capacity. The media 502 and other documented external limitations remain unchanged. No commit, push or store submission was performed.

## Earlier five-issue native follow-up — 2026-09-25 (superseded by physical retest below)

Branch: `fix/citywalk-native-device-acceptance`. This round changes the local implementation after internal iOS build **9**; that existing IPA does **not** contain these fixes. No new EAS build, TestFlight build, store submission, commit or push was requested or performed. Web V2 screens, styles, backend and dependencies are unchanged.

### Reported bugs and findings

This historical round had automated coverage only. The subsequent owner retest rejected scroll/header/Ask/loading/RTL behavior and confirmed Read/Listen. Use the latest status table below for current acceptance; the earlier code changes were not physical acceptance.

| Bug | Status | Cause, change and remaining evidence |
| --- | --- | --- |
| Meaningful route-building loading | **CODE FIX READY at that earlier revision — not device accepted** | The native indicator always highlighted the first stage, while route calculation ran as one synchronous call. Hydration also reused the building view even though it was only reading saved state. The same shared planner now exposes actual work boundaries; native yields a rendering frame between them and shows completed/current/upcoming states in EN/DE/AR. No percentages, minimum duration or decorative timer. Hydration uses the localized general loading message. Content-fetch skeletons are not falsely described as route calculation. |
| Duplicate Places / Orte heading | **CODE FIX READY at that earlier revision — not device accepted** | Both `SectionTitle` and `WalkChoices.label` rendered a heading. The filter group keeps its accessible label and hides its second visible heading. Place data and filtering remain intact. Rendered EN/DE/AR tests assert one heading and both test places remain present. |
| Active bottom tab does not return to top | **CODE FIX READY at that earlier revision — not device accepted** | The custom bottom bar only called `router.navigate`. A focus-scoped scroll coordinator now uses actual ScrollView/FlatList refs. Root reselection scrolls to zero; nested reselection uses Expo Router `dismissTo` and consumes the scroll request when the root gains focus. Different tabs still navigate normally. No timer, route-counter parameter or wholesale history reset. Home, Explore, Trips, Saved and Profile are covered. |
| Listen / Read opens Schiffergesellschaft | **STILL FAILING — reported device symptom not reproduced or closed** | No hardcoded Schiffergesellschaft fallback was found. Existing action links already carried the current stop slug, cache keys include city/place/locale, and detail/guide screens reject mismatched response identities. Fresh Preview requests for Holstentor, Marienkirche and Schiffergesellschaft each returned their own identity. Confirmed adjacent defects: Read ignored `focus=story`; Listen used an offset relative to the wrong container; City Hub Ask selected the first API place without user selection. Those are fixed. Actions now explicitly push their exact place, local detail/audio state is keyed by identity, and a missing current stop cannot silently promote another place. Regression coverage proves Holstentor/Marienkirche bindings before/after confirmed Skip, correct detail story/audio/Ask, and rejection of a mismatched Schiffergesellschaft payload. This does **not** prove the original on-device misrouting cause; exact reproduction/screenshots are still required. |
| Arabic RTL layout | **CODE FIX READY at that earlier revision — not device accepted** | Mixed content-language alignment and layout direction, an artwork layer occupying the text area, inherited scroll-content direction and narrow compact-button content contributed to inconsistent composition. Scroll containers, header and bottom navigation explicitly receive the app direction; row order follows that direction once, without manually reversing arrays. The CITYWALK wordmark stays LTR inside the RTL header. Latin city names retain their writing direction but align to the app's start edge. Hero text reserves space above the artwork. Arabic line spacing/letter spacing and flexible card text containers avoid squeezed glyphs. Compact labels and bottom tabs fit long translations. Native screenshots are required to judge actual line breaking, mirroring and spacing. |

The City Hub Ask action now asks the user to choose a place and moves to the place list instead of inventing a place context. Actual place-specific Ask continues to carry the exact selected place. Audio remains exact-locale; missing audio displays the localized unavailable message rather than substituting another place or language.

### Scope and files

- Navigation/ref lifecycle: `mobile/src/lib/tabNavigation.tsx` (new), `mobile/src/app/_layout.tsx`, `mobile/src/components/NativeChrome.tsx`, `mobile/src/components/ui.tsx`.
- Progress and action identity: `mobile/src/components/NativeWalkFlow.tsx`, `mobile/src/components/V2Presentation.tsx`, `mobile/src/app/city/[citySlug]/place/[placeSlug].tsx`.
- Explore/RTL/labels: `mobile/src/app/index.tsx`, `mobile/src/app/city/[citySlug]/index.tsx`, `mobile/src/app/saved.tsx`, `mobile/src/components/WalkControls.tsx`, `mobile/src/components/LocaleSelector.tsx`, `mobile/src/design/discoveryCopy.ts`.
- Shared planner: `packages/traveler-core/src/walkPlanner.ts` exposes work stages while keeping `buildWalk` synchronous for existing consumers. It does not duplicate or change route selection rules. A comparison against the original HEAD implementation produced **identical route output in all 192 scenarios** using actual published Preview data: four durations × three walking styles × four interest selections × two end modes × two deadline modes.
- Regression tests: new `mobile/tests/native-tab-navigation.test.tsx` and `mobile/tests/native-v2-regressions.test.tsx`; expanded `mobile/tests/walk-flow.test.tsx` and `packages/traveler-core/src/walkParity.test.ts`. The existing source-level planner assertion in `mobile/tests/native-city-experience.test.ts` now names the observable planner entry point.

Related checks: the hero copy and art have separate vertical space; compact cards allocate their width to labels, including German `Gespeichert`; card text containers can shrink without moving the image; bottom navigation remains inside the Screen/VirtualizedScreen bottom safe-area boundary. Media fallback dimensions and the existing fallback logic are unchanged. None of these code checks substitutes for native rendering evidence.

### Validation of the final local revision

| Check | Result |
| --- | --- |
| Full mobile suite | **208 passed / 36 files**, zero unhandled errors (`npm run test:run --prefix mobile`) |
| Shared suite | **20 passed / 2 files** (`npx vitest run packages/traveler-core`) |
| Mobile TypeScript | **PASS** (`npm run typecheck --prefix mobile`) |
| Mobile lint | **PASS**, zero warnings (`npm run lint --prefix mobile`) |
| Expo public config | **PASS**; Expo SDK 57.0.0, version 1.0.0, `com.citywalk.app` for both platforms, Preview configuration |
| Expo Doctor | **20/21**; only the existing local CocoaPods version/tooling check fails. No check was disabled and no packages were upgraded. |
| Final iOS/Android Hermes export | **PASS on both platforms**; one iOS Hermes bundle (4.4 MB) and one Android Hermes bundle (4.6 MB), with assets/metadata, under `<local-only temporary artifact>`. Local exports only, not native signed builds or installation tests. |
| Planner compatibility | **192/192 identical outputs** against the pre-change implementation using published Preview place data |
| Diff/security hygiene | `git diff --check` passes. No Web/backend/dependency diff added in this round. No new `.env`, signing files, IPA/APK/AAB or generated native/build directories in untracked commit candidates; no private-key/token pattern hits in the diff. |

An initial focused action test needed to confirm Skip's existing proposal dialog before expecting the next place; the confirmation flow was retained. Lint caught an initial ref-forwarding implementation issue, corrected with React's `useImperativeHandle` and a stable coordinator initialized through state. The final full mobile run above includes those corrections.

### Fresh iOS screenshot requirements

The latest request references real-device screenshots, but its attachment directory contains only `Pasted text.txt`; no device images accompanied it or exist in this QA folder. Their local location was requested. Existing 19 Web references remain the source of truth, not native evidence.

A fresh toolchain/device check still reports **Xcode 14.2**, iOS 16.2 simulators and **no connected physical iPhone**. The current application requires the supported newer toolchain/iOS runtime; this host cannot render the changed app in its available simulator. No new build was uploaded to work around the user's explicit restriction. Build 9 predates this follow-up, so screenshots of it cannot validate these changes.

| Required new evidence | Result |
| --- | --- |
| Meaningful route-building loading, actual work in progress | **NOT CAPTURED** |
| Explore: one Places heading | **NOT CAPTURED** |
| Scroll down → reselect active tab → top | **NOT CAPTURED**; requires before/after images or a recording |
| Holstentor Read and Listen | **NOT CAPTURED** |
| Marienkirche Read and Listen | **NOT CAPTURED** |
| Arabic Home | **NOT CAPTURED** |
| Arabic city cards | **NOT CAPTURED** |
| Arabic Trips and Saved empty states | **NOT CAPTURED** |
| Arabic bottom navigation | **NOT CAPTURED** |

Coverage for this follow-up: **0/9 requested evidence groups**. The overall Web/iOS/Android matrix above remains unverified; no row was promoted to MATCH on the basis of automated tests. The specific wrong-place symptom and all device-dependent visual judgments remain open. Media 502, full map rendering, Upstash and Stripe blockers have not been bypassed or claimed resolved.

**Ready for another internal iOS QA build for verification**, once the owner explicitly authorizes that upload. Automated source gates and both bundle exports pass; the local CocoaPods toolchain limitation remains. This is not native visual acceptance, closure of the critical reported misrouting symptom or Store Beta readiness. No commit, push or upload was performed in this follow-up.


## Physical iPhone retest follow-up — 2026-09-25 (current)

The owner repeated QA in the Development Client after clearing Metro. **Read / Listen is FIXED according to the owner's physical verification** and its selected-place behavior is preserved. The five items below are not yet physically confirmed on this revision. The attachment contains QA text only; the referenced iPhone screenshots have not been supplied, and their location was requested. Earlier readiness/closure statements above are superseded by this section.

### Current code readiness and findings

| Physical QA item | Status | Root-cause evidence and targeted change |
| --- | --- | --- |
| Scroll-to-top | **CODE FIX READY** | The real bottom bar is custom `Pressable` navigation inside an Expo Router native Stack, not Expo Router Tabs. The previous focus registry depended on global pathname and focus timing. Root reselection now invokes that visible Screen's actual ScrollView/FlatList ref directly. Nested reselection records one intent, dismisses to the tab root and consumes it once at native `transitionEnd`, using the destination's local route identity. No delay is used. Device logging must confirm whether this resolves the reported double tap. |
| Back header | **CODE FIX READY** | `NativeBrand` previously placed Back below the branding row and inside the scrolling content. It is now one compact row immediately after the top safe area, outside ScrollView/FlatList: Back, CITYWALK, language action. Back has a 44pt target; nested header minimum height is 52pt. Home, Saved/Trips and Profile have no Back. City Hub, Place Detail, planner/preview and nested Explore use the compact header. Compact planner/preview heroes no longer reserve a marketing artwork band. |
| Ask EN/DE/AR | **CODE FIX READY** | The audited City Hub action did not navigate in any locale: it set a message and scrolled to the place list, which could appear inert depending on position. No locale-specific route condition was found. All three languages now use the same `/city/[citySlug]/assistant` action and validated `{ type: "city", citySlug: "lubeck" }` context. The backend guide contract requires a place, so the city screen opens with a localized unavailable state. It never substitutes a place or claims a grounded city-wide AI response. |
| Planner loading | **CODE FIX READY** | `/city/[citySlug]/walk` renders `CitywalkLoading` while fetching published city/place data, before the planner is available. That exact skeleton used the generic loading translation; it now identifies the content fetch. Saved-state hydration has separate preparation copy. Real planning still uses the existing `V2Loading` component; computation now waits for its native layout before advancing actual shared-planner stages with rendering-frame yields. No new loader, artificial duration or fake percentage. A fast local calculation can remain brief; physical visibility still requires confirmation. |
| Arabic RTL | **NOT READY** | Concrete code issues addressed: Latin names lacked Unicode bidi isolation, non-directional waterfront artwork was mirrored, nested header composition was split across rows, and compact heroes reserved unused height. FSI/PDI now isolates displayed city/place names without changing routes; search writing direction follows locale, Back mirrors semantically, and artwork is not flipped. The requested device-driven assessment of actual city cards, action cards, wrapping, bottom navigation and spacing remains blocked on the referenced screenshots/new device evidence. Automated layout assertions do not establish acceptance. |

### Exact components and regression coverage

- `mobile/src/components/NativeChrome.tsx`, `ui.tsx`, `mobile/src/lib/tabNavigation.tsx`: direct active-tab ref wiring, transition completion and compact header outside scrolling content. The existing place-guide screen changes only header placement and its bottom-bar scroll callback.
- `mobile/src/app/city/[citySlug]/index.tsx`, new `assistant.tsx`, new `mobile/src/lib/cityAssistant.ts`: one city-assistant route/context in EN/DE/AR; explicit unavailable screen.
- `mobile/src/app/city/[citySlug]/walk.tsx`, `CitywalkLoading.tsx`, `NativeWalkFlow.tsx`, `V2Presentation.tsx`, `discoveryCopy.ts`: content-fetch diagnosis, localized copy, native-layout readiness for the existing actual planner progress view, compact hero spacing.
- New `mobile/src/lib/bidi.ts`, Home, City Hub, Saved and `V2Itinerary`: display-only isolation for mixed-language names; non-directional hero artwork remains unmirrored.
- `native-screen-chrome.test.tsx` renders the actual Screen/VirtualizedScreen plus custom bar to verify one press reaches its native ref exactly once, Back shares the header row outside content, roots omit Back and RTL uses a right-pointing Back.
- `native-tab-navigation.test.tsx` verifies all five active tabs, different-tab navigation and one-time nested-return consumption after transition completion.
- `native-v2-regressions.test.tsx` checks the identical city-assistant action/context and unavailable screen in EN/DE/AR; selected-place regressions remain intact.
- `walk-flow.test.tsx` exercises the actual WalkScreen route in EN/DE/AR: content fetch, real planner progress and route preview. `home-presentation.test.tsx` verifies bidi-isolated Arabic city-card names while route identities remain raw.

### Final automated checks for this revision

| Check | Result |
| --- | --- |
| Full mobile tests | **227 passed / 37 files**, zero unhandled errors; `npm run test:run --prefix mobile` |
| Shared tests | **20 passed / 2 files**; `npx vitest run packages/traveler-core` |
| Mobile TypeScript | **PASS**; `npm run typecheck --prefix mobile` |
| Mobile lint | **PASS**, zero warnings; `npm run lint --prefix mobile` |

Final `git diff --check` passes. The changed/untracked file review found no secret-pattern hits, `.env` files, signing material or generated build artifacts among commit candidates. All changes remain uncommitted on `fix/citywalk-native-device-acceptance`.

The shared test command prints existing Vite configuration migration notices. No package upgrade or configuration suppression was introduced. No Web/backend/shared-planner/dependency code changed in this round. No EAS build, native build, bundle export, submission, commit or push was performed.

### Immediate Development Client verification

The previous project Metro process was verified and stopped; the replacement was started from `mobile/` with:

```sh
EXPO_PUBLIC_CITYWALK_ENV=preview \
EXPO_PUBLIC_CITYWALK_API_ORIGIN=${DEVELOP_PREVIEW_ORIGIN} \
EXPO_PUBLIC_CITYWALK_QA_LOGS=1 \
npx expo start --dev-client --clear
```

Metro reported its cache cleared and `/status` returned `packager-status:running`. Current LAN server: **`<local Metro LAN address>`**. Open it in the existing CITYWALK Development Client on the same Wi-Fi and reload. The backend remains the develop Preview HTTPS endpoint; only JavaScript development delivery uses the local Metro address. This does not validate device connection or startup by itself.

1. Scroll Home and Explore down and tap their active tab **once**. Repeat Trips, Saved and Profile. From Place Detail, tap Explore once and verify City Hub returns at the top. A root press logs exactly one `[TAB_PRESS] home active=true action=scroll-top` (or the relevant tab); nested return logs `return-root-and-scroll-top`.
2. Check City Hub and Place Detail Back directly below the safe area, on the branding/action row; also check planner/preview. Root tabs must have no Back.
3. Open City Hub Ask in English, German and Arabic. Each must open the city assistant with its explicit unavailable message, never an unrelated place.
4. Open Build My Walk, select preferences, then build. Distinguish the initial localized place-data fetch from meaningful calculation progress. Use a recording if the actual local calculation completes quickly; do not add a fake delay.
5. Capture Arabic Home, City Hub, city cards and bottom navigation, including the mixed Latin names and directional icons. These captures are required before RTL can be considered ready.

The temporary tab logger is DEV-only and opt-in. Keep it enabled for this verification; remove it after the owner confirms the physical result. No logs contain credentials, user identity or location. **No new native screenshot or successful physical check is claimed for this revision.** The Web/native parity matrix remains unverified. Existing media 502, full map rendering, Upstash and Stripe limitations remain unchanged and are not bypassed.

## Latest physical follow-up — Home, planner and RTL (2026-09-25)

The owner's latest iPhone Development Client check confirms **Explore one-tap scrolling, compact Back header, Ask in EN/DE/AR and Read/Listen place identity work**. These areas have not been redesigned or refactored in this round. Only the three remaining issues were investigated.

| Item | Current status | Evidence and change |
| --- | --- | --- |
| Home one-tap | **NOT READY** | Existing physical Metro logs show repeated `[TAB_PRESS] home active=true action=scroll-top`, ruling out a missing press or incorrect active-tab branch for those taps. Home uses Screen/ScrollView with a forwarded ref and a cities-section scroll effect; the accepted Explore path uses VirtualizedScreen/FlatList. A new regression renders the actual Home route with real Screen/chrome in EN/AR and proves one press calls its scroll ref once. It passes with the existing wiring, so it does not reproduce or explain the device symptom. DEV-only opt-in Home diagnostics now report ref/native-ref presence, pre-tap y and whether native scroll events reach the top. Logs are limited to the press/result, not every scrolling frame. A fresh physical tap was requested; no speculative navigation rewrite was made. Remove this temporary probe after diagnosis/verification. |
| Planner progress | **CODE FIX READY** | Published place data is already available before submission. The shared planner is local synchronous computation split into four generator stages; the previous frame yields could complete in a few frames, with no visible presentation lifecycle. The same `V2Loading` now has a 220ms native opacity entrance using the existing motion token. Actual computation proceeds during that transition; preview waits for its successful completion. Reduced-motion presentation crosses two animation-frame boundaries instead, with no display timer. Layout readiness also resets the planner viewport to y=0 after progress attaches. No fabricated percentages, service calls, second loading component or minimum-duration timeout. Native presentation is now allowed to complete; its physical visibility remains for the owner to confirm. |
| Arabic RTL | **NOT READY** | No new visual change was made without the requested screenshot evidence. The owner supplied `IMG_9172.png` (attachment reference; not a repository file), `IMG_9173.png`, `IMG_9174.png`; those files/path are absent from this Mac workspace. Exact-name searches in Downloads, Desktop, Documents and Codex attachments found no copies. Their Mac paths were requested. Existing bidi isolation and accepted header/assistant behavior are preserved. No screenshot-driven layout or native visual acceptance is claimed. |

Exact changed implementation in this round: `NativeWalkFlow.tsx` and `V2Presentation.tsx` for planner presentation; `ui.tsx` plus Home's `index.tsx` only for the opt-in Home scroll probe. No changes to backend, Web, shared planner logic, dependencies or the accepted Explore/Back/Ask/Read/Listen implementation.

Regression additions: real Home route/ref/one-tap coverage in EN/AR; Arabic Home direction, all three Latin city names and five single-line bottom labels; real `V2Loading` mount before entrance completion; reduced-motion frame boundaries; completed local planning cannot show preview before native presentation completes. Tests mock native bridges and cannot certify native pixels or physical scroll success.

Validation: full mobile suite **233 passed / 37 files**, shared suite **20 passed / 2 files**. Mobile TypeScript and lint passed. After narrowing the diagnostic logging, the affected real Screen/Home suite was rerun separately. No build, export, upload, submission, commit or push.

Metro was restarted with `npx expo start --dev-client --clear`, the existing Preview HTTPS backend and `EXPO_PUBLIC_CITYWALK_QA_LOGS=1`. Current Development Client LAN URL: **<local Metro LAN address>**. Reload on the same Wi-Fi. Capture Arabic Home top/cities/City Hub; Home before and after one active-tab press; planner progress in English and German or Arabic. For Home, keep the app open for the `[HOME_SCROLL]` result and record whether search had keyboard focus. The referenced screenshots and a fresh Home diagnostic tap remain pending; the earlier overall parity matrix is not promoted by passing automated tests.

## Native Arabic display names and RTL — 2026-09-25

Implemented against the owner's attached Arabic UI reference. This is native-only presentation work; no Web V2, API, database, shared copy/planner, route identity, saved-record schema or audio selection behavior changed. Earlier Home scroll diagnosis remains separate and is not claimed resolved by this localization pass.

- `mobile/src/lib/displayNames.ts` adds Arabic city names for Lübeck (لوبيك), Hamburg (هامبورغ), Düsseldorf (دوسلدورف), plus the current Lübeck place catalog, including Holstentor (هولستنتور) and Lübeck Old Town (البلدة القديمة في لوبيك). Authored Arabic names take precedence over local transliterations. Unknown names retain their original spelling with bidi isolation rather than receiving an invented translation. English/German labels remain unchanged.
- Home city cards, accessibility labels and search; City Hub/place cards; place detail/audio title; suggested and published-tour stops; planner start/end options, itinerary/current stop/finish/share; Saved/account saved-city labels; city/place assistant headings; and map marker accessibility labels use the native display-name helper. Saved Latin names are localized when rendered, without rewriting stored names or IDs. Search matches both Arabic and original city names.
- The root cause of inconsistent alignment was source-language styles overriding Arabic application alignment. Native `AppText` now enforces right alignment for Arabic even when fallback content has LTR source-language styling. Fallback descriptions retain their real language and LTR writing semantics; this pass does not fabricate Arabic editorial stories or audio. Latin brand/name runs in Arabic text are isolated once with FSI/PDI.
- City/place cards, suggestions, itinerary and Saved rows follow Arabic layout direction. Compact action-card labels align right; Arabic hero titles use the full text width and right edge. Loading/error/empty text follows the same right-alignment rule. Existing single-line bottom labels, directional Back/chevrons and accepted navigation remain intact. Brand marks, photos, waterfront artwork and map imagery are not mirrored.
- No duplicate Places heading was introduced; the rendered EN/DE/AR regression continues to assert exactly one heading.

Validation: **243 mobile tests passed / 38 files**, **20 shared tests passed / 2 files**; mobile TypeScript and lint pass; `git diff --check` passes. New/updated tests cover Arabic city search, labels and original route identity; existing authored Arabic; city-scoped place lookup; unknown mixed-script names and idempotent isolation; actual Home direction/bottom labels; fallback-description right alignment; detail/audio locale isolation; Saved labels across locale switches; planner itinerary labels; and city assistant context. An initial full-suite failure was a missing `EmptyState` export in the new Saved test mock, corrected before the passing full rerun.

| Platform | Scope and evidence |
| --- | --- |
| Web | Unchanged; no Web behavior/style/source changes |
| iOS | Native implementation and automated coverage ready; fresh physical Arabic screenshots still required |
| Android | Same native implementation and automated coverage; on-device visual acceptance pending |

Review on the existing Development Client: switch to Arabic, inspect Home and all three city cards; search لوبيك; open City Hub and Holstentor; check detail, Ask, planner start/end/preview/current stop, Saved and loading/error/empty states. Switch back to English/German and verify original labels return. Check names on items saved before this revision as well. Metro remains available at `<local Metro LAN address>` using the develop Preview HTTPS backend. No native build, store submission, commit or push was performed. No new environment/signing files, generated build artifacts or secret-pattern candidates were found among changed/untracked files. Passing automated tests is not a claim of physical Arabic visual acceptance.

## Native loading and current-walk membership — 2026-09-25

The accepted Arabic RTL implementation is retained for physical review. This round changes native loading/recovery and membership only; Web V2, shared planner rules, backend and build configuration remain unchanged.

The [flow-by-flow loading and membership audit](loading-and-membership.md) lists the actual component/state for content, planning, AI, maps, images, audio, account, Saved and button actions, together with recovery paths. Content uses skeletons, warm navigation keeps cached content, planner progress remains meaningful, and action busy states stay local. AI's existing unavailable boundaries and non-streaming response contract are explicit.

Current preview and active walks now share observable persisted membership. Detail renders **Add to my walk → Adding… → In my walk ✓**, with **Remove from walk**. Preview/active itinerary controls and Explore/Saved place badges consume that same record. Writes serialize and deduplicate IDs; failed persistence cannot show success. Preview stays a preview until Start succeeds. A first Detail addition creates a one-stop preview; it does not start navigation. Route eligibility/time rules still apply. External changes update current-stop links and dismiss stale adaptation proposals.

Validation for this round: **262 mobile tests passed / 41 files, zero unhandled errors**; **20 shared tests passed / 2 files**; mobile TypeScript and lint (zero warnings) passed; `git diff --check` passed. The final mobile run completed independently in 33.57 seconds, without changing test timeouts. Native bridge tests are not physical visual acceptance. Device review is required on iOS and Android using the checklist in the audit; no new screenshots or native rendering success are claimed.

No commit, push, build, bundle export, EAS upload or store submission. No environment/signing/generated-build candidates or secret-pattern candidates were found in the changed/untracked paths. Earlier opt-in Home scroll diagnostics remain separate existing work.

## Expo Router Slot render crash — 2026-09-25

Root cause: City Hub's `TourCard` (`mobile/src/app/city/[citySlug]/index.tsx:335`) and `PlaceCard` (line 467) passed RTL arrays as `style` on the direct `PressableSurface` child of `Link asChild`. The installed Expo Router `BaseExpoRouterLink` selects its internal UI Slot for `asChild`; that Slot rejects an array on the child's props before rendering the child.

The only application-code changes in this crash fix are:

```tsx
style={StyleSheet.flatten([styles.tourLink, { direction: appDirection }])}
style={StyleSheet.flatten([styles.placeLink, { direction }])}
```

Audit: the app has one `_layout.tsx` (Stack, object-valued container styles), no nested layouts or explicit app Slot outlets. Inspected NativeChrome, Screen, VirtualizedScreen, locale/RTL wrappers and all 24 Link/asChild boundaries. The two arrays above were the direct offending props; other direct style props are objects/absent or a Pressable callback, not array-valued Slot children. The ordinary SafeAreaView, View, ScrollView, FlatList, text and internal Pressable style arrays remain intact. No router package/node_modules edits, dependency changes, layout redesign or RTL behavior changes.

Regression: the Link test bridge now enforces the installed Slot array check before rendering its selected child. Six EN/DE/AR place/tour cases reproduced the crash before the fix and pass afterward, asserting flattened row styles, RTL direction and route identity. Validation: mobile TypeScript passed; lint passed with zero warnings; focused navigation/layout tests **58 passed / 6 files**; full mobile suite **268 passed / 41 files**, no unhandled errors; `git diff --check` passed.

Metro restarted using `npx expo start --dev-client --clear`, the existing develop Preview HTTPS backend and existing QA-log setting. Confirmed fresh-cache Metro startup at **<local Metro LAN address>**. Reload the physical Development Client and open City Hub's place and suggested-tour cards in English and Arabic to confirm the device error is cleared. Automated reproduction/fix is verified; no new physical-device acceptance is claimed. No commit, push, native build or export.

## Physical Arabic follow-up, Profile and Explore membership — 2026-09-25

Implemented the latest reported iPhone composition issues using centralized native RTL helpers. Home/search/cards, City Hub/suggestions, Detail and Profile use full-width right-aligned Arabic text; Arabic chips and embedded city-name fragments are localized. Profile retains only the compact header language selector. Slot-bound card styles remain flattened. Accepted compact Back, Ask EN/DE/AR, Read/Listen place identity, Explore active-tab behavior and planner progress are preserved.

The [physical Arabic follow-up report](arabic-physical-polish.md) lists changed RTL files, all missing published Arabic records, the audited API/CMS read path and the Place Detail image investigation. Both public Preview and production return **5 Arabic place records / 25 places**, with **20 English fallbacks**; the city localization is also missing and the Arabic tour title contains a Latin city-name fragment corrected only in native display. Available Arabic prose is retained. Missing editorial stories are not fabricated.

Explore now exposes the same Add / Adding / In my walk / Remove control as Detail, using the existing shared persisted current-walk state. Seven actual cross-screen regressions cover both add directions, Arabic labels, concurrent duplicate prevention, removal and Saved/membership independence. The [loading inventory](loading-and-membership.md) records each content/image/planner/AI/map/button/navigation flow and recovery behavior. Published Holstentor imagery returned HTTP 200; the approved city image still returned 502. The exact large placeholder seen on-device remains a physical follow-up, not a claimed fix.

Validation: full mobile suite **290 passed / 43 files**, no unhandled errors; shared suite **20 passed / 2 files**; mobile TypeScript and lint passed (zero lint warnings); `git diff --check` passed. The full mobile run completed in **32.39 seconds**. The new cross-screen harness initially used split storage adapters; it now uses AsyncStorage's browser adapter consistently. A later TypeScript-only locale literal correction in the Profile test changed no runtime behavior.

Platform status: Web is explicitly unchanged; iOS and Android share the implementation and automated coverage, but new physical RTL/profile/image/membership screenshots remain pending. No core screen is newly marked visually accepted. No EAS build, export, upload, submission, commit or push. All changed/untracked paths are native code or QA documentation; no secret-pattern, environment, signing or generated-build candidates were found. Previous uncommitted work remains intact.


## Shared Web / iOS / Android internationalization — 2026-09-25

[Architecture, migration inventory, remaining native literals and validation](../../architecture/shared-i18n.md). `packages/i18n` is now the single EN/DE/AR static UI source: **429 semantic keys per locale**, typed lookup, English fallback, development warnings and shared direction metadata. Native Home, Explore, City Hub, Detail, planner/preview/active walk, Trips, Saved, Profile, Ask, loading/recovery and bottom navigation use its adapters. Web EN/DE/AR use the same catalogs; all **27 Web locales** remain supported, with the other **24** retaining their legacy dictionaries for progressive migration.

Dynamic city/place/tour prose stays in published CMS translations and the existing canonical source. The shared resolver preserves requested → English → canonical fallback, original IDs/slugs and truthful locale metadata. Existing canonical editorial seed text was separated from static UI dictionaries; no existing application database or CMS records were modified. Exact-locale audio selection is unchanged. The known **20 missing Arabic place records**, missing Lübeck city localization and mixed-script tour title remain content work, as detailed in the [published Arabic audit](arabic-physical-polish.md). Legacy native name shims are documented explicitly.

Validation: complete Web/shared **845 passed / 139 files**, with opt-in DB tests run separately; DB integration **22 passed / 5 files**; complete mobile **290 passed / 43 files**, no unhandled errors. Web/mobile/package TypeScript and Web/mobile lint passed. Tests were rerun separately at lower concurrency after resource-related five-second timeouts; no timeouts or assertions were relaxed. A standalone mobile-only package installation smoke check also passed. Full commands, limitations and audit findings are in the architecture report.

Web, iOS and Android are all required. Native bridge tests verify functional language/layout paths; fresh physical EN/DE/AR review and corresponding screenshots remain pending. This task does not promote any screen to visual acceptance. Existing accepted RTL/Slot/navigation behavior and earlier local work are preserved. No build, bundle export, EAS upload, store submission, commit or push.

## Launch localization/reviews reconciliation — 2026-09-25

[Current A–I reconciliation, exact source identity, validation, content coverage, issue ownership and release-stage blockers](launch-reconciliation.md). This supersedes the earlier EN/DE/AR-only counts and universal Web/native parity language above. #136 defines native traveler capability parity, Public Web acquisition/preview, and Admin Web operations; existing Web features are preserved. Historical owner iPhone observations remain dated evidence, not a current binary/screenshot pass. Home one-tap remains unresolved.

Official launch UI locales: **DE / EN / DA / SV / NL / ES**. Arabic/RTL compatibility retained. Today's seven catalogs contain **432 keys each**, checked dynamically. Preference persistence/device variants, walk preservation through locale refresh and the corrected native review policy are local changes. Private feedback and explicit approved store links remain separate from automatic native review. No approved store URL is invented.

Final validation and the source digest are recorded in the linked reconciliation report. No commit, push, build/export, deployment or submission in this pass. Missing native screenshots are **UNVERIFIED**, not an observed visual mismatch.

Final current-source validation: **868 Web/shared tests passed (140 files), 22 opt-in DB tests skipped in that runner; 349 mobile tests passed (47 files); 11 affected isolated CMS/content DB tests passed (2 files)**. Mobile/Web/shared/standalone-i18n TypeScript and mobile/Web lint passed. All seven current 432-key catalogs pass the dynamic completeness/interpolation gate. Native full tests/typecheck/lint were repeated after a lint correction; the first disposable DB attempt lacked its required fixture, and a fresh correctly initialized isolated run passed. See the reconciliation report for exact commands, source identity, rerun history and why the remaining 11 DB tests were not repeated. Builds remain prohibited and were not run.

## Live owner-driven iPhone QA — 2026-09-25, 19:03 UTC onward

This session preserves the reconciliation baseline and all local work. Two targeted native fixes were made after owner failures; physical retest remains pending. The physical results below are scenario-specific; earlier automated results remain historical until the final affected gate is run. LAN Development Client testing is valid without Xcode USB detection.

### Session identity

- Branch `fix/citywalk-native-device-acceptance`; HEAD `efe8cf62f408181f0f4ca922f32e53e712a982a2`.
- Reconciliation source digest `dabce61609b820b25467d8a49f34c3a09315a61845768a26b59632773543f11b`; every manifest path still matches at session preparation.
- Reused existing Metro process (local PID omitted), cwd this repository's `mobile/`, port **8081**, LAN host **<local Metro LAN address>**. `/status` reported running. No competing Metro or reload/storage reset initiated.
- Metro reports a live **iPhone** / **`com.citywalk.app.dev`** runtime. Runtime reports **iOS 26.6.2** and native build number **1**. Manifest version is **1.0.0**; installed native marketing version, exact iPhone model and EAS build/profile ID are not independently exposed by this probe and remain **UNVERIFIED**. Manifest version is not substituted for native binary version.
- Actual initialized `citywalkApi.origin` read from the phone: **`${DEVELOP_PREVIEW_ORIGIN}`**. Metro is JavaScript delivery only; API requests target this remote develop Preview. Local backend edits do not change that deployment.
- Safe module check: native registry plus Expo's initialized **`requireOptionalNativeModule('ExpoStoreReview')`** return no module. **BLOCKED — native binary**; compatible rebuild requires separate approval. No `requestReview`, guessed module, package installation or build. This does not block unrelated JS/UI QA.
- The first debugger handshake lacked Metro's required local Origin header (401); retry used the proper local Origin and succeeded. No security configuration was changed.

### Scenario ledger

| Time (UTC) | Scenario / locale | Status | Evidence / exact scope |
| --- | --- | --- | --- |
| 19:05–19:06 | Select Deutsch → force-close CITYWALK → reopen same Development Client project | **PASS** | Owner: “yes is still deutsch Deutsch remains selected”. No app-storage deletion. This confirms DE persistence only |
| 19:06–19:07 | Native review module availability | **BLOCKED** | Read-only live optional-module check returns absent. No review requested; build 1 cannot prove review integration |
| 19:08 | Live managed media delivery on the connected iPhone | **FAIL** | Several `/api/media/[asset]` responses returned 502 while city/place content returned 200/304. Backend/service delivery failure; exact screen/locale and visible effect not yet reported; no inferred S3 root cause |
| Pending | DE planner → meaningful progress → preview → active walk | **UNVERIFIED** | Awaiting this round's owner result; prior accepted progress observation retained |
| 19:09–19:10 | Active walk during requested EN / DA / SV / NL / ES switches | **PASS** | Owner: “yes the walk still without restarting”. Confirms active-walk continuity for the requested exercise; does not independently certify every translated string/layout or each locale after cold restart |
| Pending | EN / DA / SV / NL / ES cold restart persistence and long labels | **UNVERIFIED** | DE pass does not establish the other five |
| Pending | Add / In my walk / Remove across Detail, Planner, Preview, Active and applicable Saved/Explore; duplicate prevention | **UNVERIFIED** | Awaiting owner result |
| 19:16–19:18 | Home one-tap / compact Back | **PASS** | Owner: “the back home is working”. Recheck after the targeted Explore fix is pending |
| 19:16–19:18 | Explore first tap on the global city-selection page | **FAIL** | Owner needed two taps; clarified this occurs on the first page with cities, not Lübeck City Hub. Local regression reproduced the first transition scrolling to the city heading rather than the top. Fix tested locally; physical retest pending |
| 19:16–19:18 | Active Walk → Add stop, EN and DE | **FAIL** | Owner reports selecting a place did nothing and list could not close. Local trace reproduces missing close affordance and rejected-selection feedback outside the picker. Closable sheet implemented; physical retest pending |
| Pending | Correct-place Read / Listen | **UNVERIFIED** | Prior owner acceptance preserved; new scenario evidence pending |
| Pending | Actual audio playback | **UNVERIFIED** | Navigation to Listen or asset metadata is insufficient |
| Pending | Actual AI answer | **UNVERIFIED** | Opening Ask is insufficient; prior Preview guide 500 is historical until this scenario runs |
| Pending | Saved-state restart persistence and Finish/private feedback | **UNVERIFIED** | Awaiting owner result; no storage clearing |
| Pending | Loading/error recovery | **UNVERIFIED** | Record actual trigger and recovered flow; no fake delay/failure injection |

### Defect intake

Only reproduced owner failures will receive code fixes. For each: screen/locale, steps, expected/actual, sanitized evidence, classification (UI/navigation, persistence, translation, native binary, content, backend/service, unknown), fix/test and physical retest result. Module absence above is a binary blocker, not a Metro cache defect. The following UI/navigation defects were traced and tested locally; neither is marked physically fixed yet. Live media HTTP 502 is reproduced at the remote delivery boundary (19:08 UTC); no local UI/backend change was made because its root cause is not established. Successful city/place fetches and fallbacks are not a repair of the media service.

No new screenshot path is claimed. Existing Web screenshots and prior owner observations stay separate. Diagnostic output is restricted to version/module/origin and whitelisted API paths/statuses; no raw GPS, tokens, private feedback or AI message content.

Editorial/media delivery stays #111/#74; founder feedback #53; analytics transport #61; dashboard #59; acquisition #60; Android/source-matched store acceptance #33/#112. None is silently expanded into this session. No commit, push, merge, upload, build, deploy, submission, configuration change or CMS publication.

### Targeted fixes — 2026-09-25, 19:24 UTC

- **UI/navigation — city-selection Explore (locale not supplied):** scroll down on the global city page → tap Explore once. Expected top; actual first transition targeted the measured city heading (`y=420` in the regression), with only the second tap invoking top. `mobile/src/app/index.tsx` now scrolls to `y=0` on the `section=cities` transition and removes the competing layout-measured anchor. City Hub, tab coordinator, Home press and compact Back implementations are unchanged.
- **UI/navigation — Active Walk Add stop (EN/DE):** tap Add stop → select an additional place. Expected visible selection outcome and a way to close; actual inline selector had no Close, and rejected additions wrote an off-screen parent message. `mobile/src/components/NativeWalkFlow.tsx` now uses its existing native modal for the place list and subsequent confirmation, with a fixed Close/rejection footer. Selection fitting the current budget swaps the same sheet to confirmation; no route mutation before confirmation. Visited/current stops are excluded; no time/deadline or duplicate safeguards bypassed. A rejected selection now explains that no eligible stop fits the remaining time. The owner's exact rejected candidate/budget was not captured, so a time-limit rejection on that particular device attempt is **not** claimed as proven.
- Regression evidence: **4 new cases failed before the fix (30 other tests passed)**: first Explore transition and EN/DE closable stop selection plus visible budget rejection. After fix: **61 focused tests passed / 4 files**, no unhandled errors, including native tab/chrome and active-walk confirmations. Test bridges are automated evidence, not native visual acceptance.
- Physical retest requested for the two reported failures, plus accepted Home/Back and one-copy confirmed membership. No app storage was cleared or route budget extended. No new device screenshots. The previous source digest above remains a historical preparation baseline; these four source/test files now differ from that manifest.

### Final local gate — 2026-09-25, 19:26 UTC

- `cd mobile && npm run test:run -- --maxWorkers=2`: **353 passed / 47 files**, no unhandled errors, 40.15 seconds.
- `cd mobile && npm run typecheck`: **PASS**.
- `cd mobile && npm run lint`: **PASS**, zero warnings.
- `git diff --check`: **PASS**. No Web/shared/backend code changed in this live QA fix, so their historical reconciliation counts are not presented as new runs. No builds or DB operations.
- Compared all 138 source-manifest entries with the preparation baseline: only `mobile/src/app/index.tsx`, `mobile/src/components/NativeWalkFlow.tsx`, `mobile/tests/home-presentation.test.tsx` and `mobile/tests/walk-flow.test.tsx` changed. Current digest of compact UTF-8 JSON path/hash entries in the baseline's sorted order: `d79d73eaf40a642b98bcd173727ac0ca54dbeafed278bc23975f1d1a7a225659`. Original manifest retained as historical evidence.
- All earlier local work remains unstaged: 82 modified tracked files, 10 tracked deletions; untracked work retained. This round adds no dependency, environment, signing, generated build or credential file. Reviewed this round's changes for accidental debug/fixture code: none in application code; test-only fixtures remain in tests. Sanitized diagnostics stay in `<local-only temporary artifact>`.
- Existing Metro still exposes the connected iPhone runtime at handoff (route `/`); no new Metro server, forced reload or app-storage reset. Physical retests requested; **UNVERIFIED** until the owner reports them. No automatic review request.

**Next single task:** owner retest of the EN/DE Add stop sheet (visible outcome, Close, confirm once) and one-tap Explore on city selection, checking accepted Home/Back remain intact. Then resume outstanding membership, correct-place Read/Listen, actual audio/AI, Saved restart and Finish scenarios. No physical PASS inferred from unit tests or a connected debugger.

## Owner-confirmed physical acceptance — 2026-09-25

The owner explicitly confirmed the following on the physical iPhone after the targeted fixes. These results supersede the pending retest status above; historical failures remain for traceability.

| Scenario | Status | Evidence |
| --- | --- | --- |
| Add stop sheet closes | **PASS** | Owner confirmation |
| Cancel leaves the walk unchanged | **PASS** | Owner confirmation |
| Confirm adds the selected stop exactly once | **PASS** | Owner confirmation |
| Rejected additions provide clear feedback | **PASS** | Owner confirmation |
| Selecting Lübeck opens Explore at the top on the first tap | **PASS** | Owner confirmation; recorded as supplied, without broadening to other navigation paths |

Current local branch/HEAD remain `fix/citywalk-native-device-acceptance` / `efe8cf62f408181f0f4ca922f32e53e712a982a2`. Last local source digest: `d79d73eaf40a642b98bcd173727ac0ca54dbeafed278bc23975f1d1a7a225659`. Earlier live session observed `com.citywalk.app.dev`, native build 1 and iOS 26.6.2; those are prior session observations, not newly supplied metadata for these confirmations. Exact retest time, device model, retest locale, native marketing version and EAS build ID were not supplied. No Android or release acceptance claimed. Accepted Add stop and navigation code remains unchanged in this media investigation.

## Managed-media follow-up — 2026-09-25, 19:44–19:50 UTC

[Read-only diagnosis, sanitized request IDs, boundary trace, classifications and exact retest steps](managed-media-diagnosis.md). Remote develop Preview still returns **502** for the approved city original/card/hero and exact-English Holstentor audio byte range. Published Holstentor fallback JPEG and transformed WebP card return **200**. German Holstentor detail has no matching audio attachment; summary collections intentionally omit audio. No playback success inferred.

The server's managed-object delivery exception is established; missing object, credentials, endpoint/configuration or reference error are **not distinguished** by the available production logs. Transformation alone cannot explain original/audio failures. Read-only Preview configuration/provider evidence is required before any correction. No code change or configuration/storage/publication action; accepted Add stop and navigation code preserved. Existing focused checks: **11 native tests / 3 files and 13 server tests / 3 files passed**. No unrelated gates repeated.

## Owner reconfirmation and current media recheck — 2026-09-26

Owner explicitly reconfirmed these physical **iPhone** results in the current request. This is owner evidence, not a new automated device run:

| Scenario | Status |
| --- | --- |
| Add stop sheet closes | **PASS — owner confirmed** |
| Cancel leaves the walk unchanged | **PASS — owner confirmed** |
| Confirm adds the selected stop exactly once | **PASS — owner confirmed** |
| Rejected additions provide clear feedback | **PASS — owner confirmed** |
| Selecting Lübeck opens Explore at the top on the first tap | **PASS — owner confirmed** |

Recording context: local branch `fix/citywalk-native-device-acceptance`, HEAD `efe8cf62f408181f0f4ca922f32e53e712a982a2`, plus existing staged/unstaged/untracked work. The owner supplied no new device model, OS, binary/build ID, exact test timestamp, locale or screenshot. Do not assign current source identity or historical native build observations to these retests without evidence. No Android or release acceptance. Accepted Add stop and navigation implementations were not edited.

**Current remote media results supersede the earlier 502 status for the tested assets:** at 20:08 UTC, approved city original/card/hero returned **200**, published Holstentor fallback original/card returned **200**, and exact-English Holstentor audio byte range returned **206** (1,024 bytes, matching Content-Range). Metadata returned **200**. German Holstentor still has no exact-German managed audio attachment.

The configured develop alias now resolves to READY **CLI deployment `<deployment ID retained locally>`**, created 2026-09-26 19:21:33.914 UTC. Its Git metadata references develop / `7e6abee18cb625eb81a40f889ad9bbdcac00d88b`; that does not establish the uploaded CLI source is byte-identical to Git or this working tree. Runtime logs independently show three managed-image 200s and the audio 206 at 20:08:42 UTC on this deployment.

See [current request evidence and boundary trace](managed-media-diagnosis.md). **Image rendering and actual audible playback on iPhone remain UNVERIFIED in this round.** No application-code fix is justified by the successful current delivery checks. Only QA documentation changed; no new tests/TypeScript/lint/build or DB diagnosis was required. No credentials/configuration/storage/publication changes, commit, push or deployment by the agent.

**Next single task:** iPhone media retest on the same Preview: Home city image and first-tap Lübeck navigation, correct Holstentor photo, audible English Listen/play/pause/resume, then German unavailable without English substitution. Preserve app storage; report errors and visible retry recovery if encountered.

## Physical audio follow-up — 2026-09-26

| Scenario | Status and evidence |
| --- | --- |
| Lübeck image renders | **PASS — owner confirmed** |
| Holstentor image renders | **PASS — owner confirmed** |
| Explore opens at top on first selection | **PASS — owner confirmed** |
| English Holstentor narration audible | **PASS — owner follow-up confirms audio works and identifies Silent mode as the earlier condition** |
| Pause/Resume controls respond | **PASS — owner reported controls; not standalone proof of sound** |
| New local fix: narration audible while Silent mode is ON | **UNVERIFIED — physical retest requested** |
| German unavailable / no English substitution | **UNVERIFIED — prior “no” is ambiguous; clarification requested** |
| Exact-German published Holstentor audio | **BLOCKED — fresh remote DE metadata has no audio attachment** |

[Full-file checks, Silent-mode cause, targeted fix and retest](managed-media-diagnosis.md). The same approved English MP3 returns complete **200 / 1,657,137 bytes**, tail range **206**, and decodes to a non-silent 102.53-second waveform. Separate owner evidence establishes hearing audio; neither HTTP nor waveform analysis proves device playback.

Local foreground audio-session fix uses installed expo-audio 57.0.5, prepares `playsInSilentMode: true` on Play, and keeps recording/background playback disabled. It preserves SDK-status-driven controls, guards released sources, and provides bounded opt-in development diagnostics. No current phone runtime was visible in the existing Metro debugger list, so no new binary/JS identity, output routing or player-time observation is claimed. Branch/HEAD unchanged, existing work preserved; no Android/release acceptance.

Validation: **40 focused tests / 6 files passed**, mobile TypeScript **PASS**, lint **PASS (zero warnings)**. Scoped diff check passes; whole-tree check flags unrelated pre-existing `.env.example:32` trailing whitespace, left untouched. No unrelated full suite, DB operation, build, deployment, config/content change, commit or push. Accepted images, navigation, Add stop and RTL were not rewritten.

## German audio-unavailable state — 2026-09-26

New **owner-confirmed physical iPhone** results supersede the earlier pending audio retests:

| Scenario | Result |
| --- | --- |
| English narration audible with Silent mode ON | **PASS — owner confirmed** |
| Pause | **PASS — owner confirmed** |
| Resume from the same position | **PASS — owner confirmed** |
| No English audio starts in the tested German flow | **PASS — owner confirmed; limited to that flow** |
| Switching back to English restores working playback | **PASS — owner confirmed** |
| German audio-unavailable messaging clear/visible | **FAIL — owner reported before this fix** |
| New no-attachment card and Listen/Read reveal behavior | **UNVERIFIED — pending physical confirmation** |

No new device model, OS version, binary/build ID, source-loaded identity, screenshot or exact physical test time was supplied. Local recording context: `fix/citywalk-native-device-acceptance`, HEAD `efe8cf62f408181f0f4ca922f32e53e712a982a2` plus existing local work. No Android or release acceptance.

The traced UI defect and minimal fix are documented in [managed-media diagnosis](managed-media-diagnosis.md). Missing-track messages previously required `focus=audio` but lacked the audio layout target used by Listen. Now the audio section always renders after metadata resolves: a real player for an exact attachment, otherwise a localized no-track card. German copy explicitly says no German guide exists. Read appears only for a nonblank story and scrolls to that same place's existing story. Existing playback-error Retry, content-language metadata, audio session/player, storage, images, navigation and Add stop implementations remain unchanged.

Validation: **50 mobile tests / 5 files passed**; **42 shared i18n tests / 2 files passed**; seven catalogs (six launch locales plus Arabic), **435 keys each / zero errors**. Mobile TypeScript **PASS**; lint **PASS / zero warnings**. Scoped whitespace checks pass. No build, deployment, publication, commit or push.

**Next single task:** physical confirmation of the German unavailable card: Deutsch → active Holstentor → Listen must reveal “Noch kein Audioguide auf Deutsch” and “Für diesen Ort ist derzeit kein Audioguide auf Deutsch verfügbar.” No player, spinner or Retry for a missing track. “Text lesen” must reveal Holstentor's story, keeping its actual content-language fallback intact. Switch back to English and recheck audible playback with Silent mode ON, Pause and Resume. The message fix remains pending until the owner confirms it.

## Native UI acceptance polish — 2026-09-27

Implemented targeted mobile presentation changes using four recent annotated/reference images present in Downloads. [Exact paths, numbered findings/fixes, changed files and eight-step iPhone checklist](native-ui-polish.md).

Tour start text/arrow now share a centered row; City Hub artwork fills a clipped responsive scene; city filters and Liste/Karte use opt-in compact controls; place cards retain a stable category-placeholder thumbnail and separate compact membership footer. German missing-audio labels read directly from shared translations so a stale context without the new fields cannot leave the card blank. Existing no-audio semantics/Read, audio player/session, navigation, Add stop and content/storage rules are preserved. Source hash comparison confirms Web and protected application files unchanged.

**Validation:** 95 affected mobile tests / 8 files **PASS**; mobile TypeScript **PASS**; lint **PASS / zero warnings**; scoped diff check **PASS**. All new physical visual checks remain **UNVERIFIED**. The latest references did not include a City Hub hero capture; its crop needs explicit owner review on device. No Android or release acceptance. No commit, push, build, deployment or CMS publication.

## Owner acceptance and overlay/audio-copy follow-up — 2026-09-27

The latest owner results supersede the pending checks above for these iPhone scenarios:

| Scenario | Result |
| --- | --- |
| English narration with Silent mode ON; Pause/Resume and return to English | **PASS — owner confirmed** |
| Tour starten interaction and arrow alignment | **PASS — owner confirmed** |
| Compact category filters and Liste/Karte switching | **PASS — owner confirmed** |
| Place-card layout and missing-photo placeholders | **PASS — owner confirmed** |
| Synchronized Add / In my walk / Remove | **PASS — owner confirmed** |
| Previously accepted navigation and Add stop behavior | **PASS — retained owner evidence** |
| German copy in supplied screenshot | **FAIL — raw translation keys; local fix pending device confirmation** |
| Home/City Hub composition in supplied annotated screenshots | **FAIL — separate heading and image; new overlays pending device confirmation** |

No additional device/build/OS metadata was supplied; no Android or release acceptance. Existing local work and accepted behavior are preserved.

[Full evidence, exact files, validation and three-step retest](audio-copy-overlay-heroes.md). Actual Metro-served i18n factories reproduced the raw keys before the fix and resolve all three messages in all seven locales afterward. Added explicit shared-package watching and restarted the single Metro session. Place Detail now has a compact shared-language notice with no redundant Read button. Home/City Hub now layer real text over an intentional crop of the existing approved illustration; other heroes are unchanged.

**Validation:** 95 affected mobile tests / 8 files **PASS**; 42 shared tests / 2 files **PASS**; seven catalogs × 435 keys, zero errors; mobile TypeScript and lint **PASS**. Scoped whitespace check **PASS**; unrelated pre-existing `.env.example:32` whitespace remains untouched. No commit, push, native/release build, deployment or publication.

**Next single task:** owner review of A) compact German notice, B) Home overlay, C) City Hub overlay. All three remain **UNVERIFIED** on device after this change. The prior Read-button retest is superseded: that redundant action has intentionally been removed from this notice.

## Full-width actions and inline membership — 2026-09-27

Implemented the owner's updated sizing direction locally on `fix/citywalk-native-device-acceptance`, preserving all prior local work. The previous text-sized/240-unit proposal does not apply.

- `mobile/src/components/WalkMembershipControl.tsx`: dense footer actions now stretch to their available container width instead of `alignSelf: "flex-start"`. Add and Remove share unchanged 44-unit minimum height, 8-unit vertical/12-unit horizontal padding and 12-unit radius; no fixed height/width cap. Included membership renders one Remove button with a decorative inline check, localized accessibility hint and selected state. The separate visible membership sentence is removed. Saved's read-only indicator remains noninteractive, now a check with its localized accessible label.
- `mobile/src/components/ui.tsx`: ordinary text actions stretch within their existing containers and wrap labels by default with font scaling retained. Existing 52-unit minimum height/radius/horizontal padding remain; vertical padding allows multiline growth. Compact quick-action tiles retain their prior sizing/truncation behavior. Category chips, List/Map, bottom navigation and icon-only controls were not edited.
- `mobile/src/components/ImageOverlayHero.tsx`: only the dark overlay opacity changed from 0.60 to 0.58 for slight brightening. Composition, crop, hierarchy and responsive layout are unchanged.
- Regression files: `mobile/tests/membership-presentation.test.tsx` (real button/control rendering with native bridges mocked), `mobile/tests/walk-membership.test.tsx`, `mobile/tests/membership-screens.test.tsx`. Coverage includes seven locales, EN→DE→EN sizing rules, matching Add/Remove dimensions, one inline row/one tap target, absent standalone sentence, accessibility, canonical membership, duplicate prevention, immediate cross-screen synchronization and saved-state independence. No shared translation keys were deleted or wording shortened.
- The complete mobile run also exposed two stale source assertions from previous work. Updated only `mobile/tests/native-city-experience.test.ts` to expect the existing overlay hero and `mobile/tests/native-card-followup.test.ts` to recognize attribution inside its existing non-null guard. No related product code changed.

Validation: **397 mobile tests passed / 52 files**, zero failures/unhandled errors (`npm run test:run -- --maxWorkers=2`, 79.09 seconds). This includes the **29 focused membership tests / 3 files** that passed earlier. Mobile TypeScript **PASS**, lint **PASS / zero warnings**, scoped tracked/untracked whitespace checks **PASS**. The full mobile suite was run because the ordinary text-button primitive is shared across screens. No Web/backend suites, migrations or builds were needed.

No membership/persistence/confirmation/navigation implementation changes. **Physical visual acceptance remains UNVERIFIED**, including actual native measurements at large accessibility text sizes. No Android device acceptance is inferred.

Owner retest: in Explore, compare the same place footer in EN→DE→EN; Add and Remove should fill the same width. Add once: expect a single **✓ Remove** button with no separate status sentence, and matching Detail state. Remove in Detail and verify Explore updates while favorite state stays independent. Check large text and Arabic row ordering. Hero review is limited to the slight brightness adjustment.

No commit, push, build, deployment or publication.

## Dynamic text and full-width filter follow-up — 2026-09-27

Owner-confirmed physical iPhone **PASS**: EN→DE→EN Add/Remove widths; inline check inside Remove; no standalone membership sentence/blank space; Remove then Add works. This supersedes the pending membership visual checks above. No new model/iOS/build metadata or Android acceptance was supplied.

Owner reports large-text clipping/tiny labels and rejects hero brightness. First physical reproduction setting is **Control Center → aA/Text Size → 110%, All Apps**, changed while CITYWALK remains running; it is not assumed to be maximum accessibility text or exactly runtime fontScale 1.1. No inspector target was connected during read-only probes, so actual fontScale/viewport remain unobserved.

[Detailed diagnosis, exact changed files/rules and physical retest](dynamic-text-and-controls.md). Actual auto-fit/line clamps were removed from action and tab labels. Responsive quick-action columns and stacked tour cards now react to the window fontScale. Category groups fill four equal segments normally and two columns when expanded; List/Map fills two equal halves. Native font scaling remains enabled. Bottom navigation grows in normal flow below the scroll viewport. Hero-wide darkening was removed; contrast now follows only the intrinsic text block. Membership/audio/navigation/storage behavior and shared translations are unchanged.

All **new** physical large-text/layout and brightness results remain **UNVERIFIED**. Code/mocked rendering checks are not native visual acceptance. No commit, push, build, deployment or publication.

Final validation: **422 mobile tests passed / 53 files**, zero failures/unhandled errors (`npm run test:run -- --maxWorkers=1`, 113.47 seconds). Mobile TypeScript **PASS**; lint **PASS / zero warnings**; scoped tracked/untracked whitespace checks **PASS**. The earlier full run had one 5-second planner-test timeout while checks ran concurrently; the final run uses one worker with unchanged test timeouts/planner code and includes the additional 110%-adjacent synthetic cases. No shared i18n changes, so shared i18n gates were not repeated.

## Owner text-size acceptance and empty-walk recovery — 2026-09-27

Owner-confirmed physical **iPhone PASS**, in English at **Control Center → Text Size → 110% → All Apps**: CTA labels complete; quick-action labels readable; tour title/layout readable; bottom labels readable without obscuring end content; category and List/Map controls fill the intended width; Home/City Hub brightness and text clarity accepted. These results supersede the pending English/layout/brightness checks above. **German at 110% and restoring the prior text size remain UNVERIFIED** because those questions were unanswered. No model, iOS version, installed binary version, runtime fontScale or source hash was supplied for these owner results. No Android/release acceptance inferred.

Owner reports **FAIL — a zero-place walk can start**. Local tracing reproduces the unguarded preview → active transition after the final membership is removed. [Diagnosis, changes, exact validation and physical checklist](empty-walk-rebuild.md). Empty-start protection and confirmed “Rebuild my walk” are implemented locally; physical confirmation remains **UNVERIFIED**. Accepted presentation, navigation, membership, audio and content rules are preserved. No commit, push, build, deployment or publication.

Validation for this change: **64 focused tests / 3 files PASS**, then **447 full mobile tests / 54 files PASS** and **62 shared tests / 4 files PASS**, zero failures/unhandled errors. Mobile TypeScript and lint **PASS**; changed shared adapter lint **PASS**. Seven shared catalogs × **438 keys**, zero errors. Scoped whitespace checks **PASS**; unrelated pre-existing `.env.example:32` trailing whitespace remains untouched. Physical empty-start/rebuild acceptance remains **UNVERIFIED**.

## Owner acceptance of start/rebuild; empty Save follow-up — 2026-09-27

Owner-confirmed physical **iPhone PASS**: zero-stop Start blocked; one valid stop starts; Preview Rebuild Cancel preserves session; Preview Rebuild Confirm returns to planner step 1; rebuilt Preview does not auto-start; Active Rebuild Cancel preserves progress/timer; Active Rebuild Confirm removes old progress; saved walks/favorites survive rebuilding; Finish and Take me back work; repeated Start taps do not restart the journey. These results supersede the pending empty-start/rebuild checks above. Device model, iOS/binary version and exact tested source hash were not newly supplied; no Android/release acceptance inferred.

Owner reports **FAIL — a zero-stop walk can still be saved**. [Local record-level reproduction, save eligibility fix and physical checklist](empty-walk-save.md). New Save protection remains **UNVERIFIED on iPhone** pending owner confirmation. Existing accepted audio, navigation, presentation, membership and planner behavior remain in scope for preservation. No commit, push, build, deployment or publication.

Empty-Save validation: **140 focused tests PASS**, then **468 full mobile tests / 55 files PASS**, **62 shared tests / 4 files PASS**. Mobile TypeScript, mobile lint and changed shared adapter lint **PASS**; **440 keys × 7 locales / zero i18n errors**. Scoped whitespace checks **PASS**. Physical Save acceptance remains pending owner confirmation. No commit, push, build, deployment or publication.

## Empty-walk correction round accepted on tested iPhone — 2026-09-27

Owner-confirmed **PASS** for all six save checks: zero-stop Save disabled with clear localized feedback; empty-save attempt creates no saved record; one-stop walk saves and survives app reopening; completed itinerary remains saveable; rejected empty save preserves a valid saved copy; other saved walks and favorites remain intact.

Together with the previously recorded Start/Rebuild/Finish/Take me back and repeat-Start passes, this **specific empty-walk correction round is ACCEPTED on the tested physical iPhone**. No new model, iOS version, binary/build identifier or tested source hash was provided. No Android acceptance or overall release readiness is inferred. Accepted Add stop/membership, navigation, audio/exact-language unavailable states and presentation remain preserved. German at 110% and restoring the prior text size remain **UNVERIFIED**; other unanswered physical checks are not promoted to PASS.

[Reviewed checkpoint, complete gates, exclusions and proposed commit grouping](reviewed-checkpoint.md). No remote issue closed or PR merged; no staging/commit/push/build/deployment/publication/submission.

Final integration validation for the unchanged product source: **868 Web/shared tests / 140 files**, **468 mobile tests / 55 files**, and **22 isolated DB integration tests / 5 files PASS**. The normal Web run's 22 DB skips were executed in that separate disposable-database gate. Root/mobile/shared TypeScript, root/mobile lint and **440 keys × 7 catalogs** pass. No assertion or timeout changes. Full diff whitespace check still flags the pre-existing `.env.example:32` trailing space, to remain outside the proposed commit; all other reviewed whitespace checks pass. Exact commands, reruns, source identity and commit/release limitations are in the checkpoint report.
