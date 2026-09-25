# CITYWALK Web → Native visual parity

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

No screenshot implies a pass until the same state is captured and reviewed on both native platforms. Missing evidence is recorded as MISMATCH (unverified), not an acceptable difference. The local Xcode/runtime limitations from the native acceptance report still apply until rechecked.

| Screen | Web | iOS | Android | Match status | Exact mismatch / missing evidence |
| --- | --- | --- | --- | --- | --- |
| Global Home | [Web](screenshots/web/home-390.png) | Not captured | Not captured | MISMATCH — unverified | No native capture; layout difference cannot yet be measured. |
| Available city cards | [Web](screenshots/web/home-390.png) | Not captured | Not captured | MISMATCH — unverified | No native capture; layout difference cannot yet be measured. |
| Lübeck City Hub | [Web](screenshots/web/city-hub-390.png) | Not captured | Not captured | MISMATCH — unverified | No native capture; layout difference cannot yet be measured. |
| Suggested now | [Web](screenshots/web/city-hub-390.png) | Not captured | Not captured | MISMATCH — unverified | No native capture; layout difference cannot yet be measured. |
| Build My Walk — time | [Web](screenshots/web/planner-time-390.png) | Not captured | Not captured | MISMATCH — unverified | No native capture; layout difference cannot yet be measured. |
| Build My Walk — interests/walking/start/end | [Web](screenshots/web/planner-interests-390.png) | Not captured | Not captured | MISMATCH — unverified | No native capture; layout difference cannot yet be measured. |
| Building your CITYWALK loading | Pending genuine capture | Not captured | Not captured | MISMATCH — unverified | No native capture; layout difference cannot yet be measured. |
| Route Preview | [Web](screenshots/web/preview-390.png) | Not captured | Not captured | MISMATCH — unverified | No native capture; layout difference cannot yet be measured. |
| Active Walk | [Web](screenshots/web/active-390.png) | Not captured | Not captured | MISMATCH — unverified | No native capture; layout difference cannot yet be measured. |
| Assistant/adaptive route | [Web](screenshots/web/assistant-390.png) | Not captured | Not captured | MISMATCH — unverified | Web reference is the guide sheet; native guide/adaptation captures remain missing. |
| Explore + map | [Web](screenshots/web/explore-map-390.png) | Not captured | Not captured | MISMATCH — unverified | No native capture; layout difference cannot yet be measured. |
| Place Detail | [Web](screenshots/web/place-detail-390.png) | Not captured | Not captured | MISMATCH — unverified | No native capture; layout difference cannot yet be measured. |
| Saved | [Web](screenshots/web/saved-390.png) | Not captured | Not captured | MISMATCH — unverified | No native capture; layout difference cannot yet be measured. |
| Finish | [Web](screenshots/web/finish-390.png) | Not captured | Not captured | MISMATCH — unverified | No native capture; layout difference cannot yet be measured. |
| Error state | Pending genuine capture | Not captured | Not captured | MISMATCH — unverified | No native capture; layout difference cannot yet be measured. |
| Empty/no-route state | [Web](screenshots/web/empty-trips-390.png) | Not captured | Not captured | MISMATCH — unverified | Web reference is empty Trips; no-route and both native captures remain missing. |


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

Read-only requests used the current develop Preview at `https://lubeck-ai-guide-git-develop-iamassiaajdaais-projects.vercel.app`.

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
| iOS Hermes bundle export | **PASS**, final output `/tmp/cw-visual-bundle-export-final` |
| Android Hermes bundle export | **PASS**, same output directory |
| Web/full DB suites | Not rerun for this native presentation pass: Web/shared/backend source unchanged. Historical 818 Web/shared and 22 DB tests are not claimed as fresh results. |
| Diff hygiene | `git diff --check` passed; changed/untracked paths and text reviewed for secret patterns, private env files and build artifacts; none found in the proposed source changes. |

One earlier full mobile run hit a 5-second English walk-flow timeout while the host was busy (184 passed, 1 timed out). Subsequent complete runs passed without raising timeouts or changing test behavior. The final count includes three new image-delivery tests. Existing EN/DE/AR flow tests continue to cover planning, saving, starting, guarded route changes and persistence with native bridges mocked.

Bundle exports are JavaScript/assets checks, not signed native builds, install/launch checks or screenshot acceptance. Logs and exports stay under `/tmp`; ignored `mobile/ios`, `mobile/android`, local env/config caches and build outputs must not be staged.

### Native evidence blockers and required acceptance

- iPhone: user confirmed a device is available, but `xcrun xctrace list devices` and a separate USB inventory still detect **no connected physical iPhone**. The pending device question asks for a connected, unlocked/trusted phone and whether a CITYWALK development client is installed. TestFlight Build 7 cannot show these local UI changes.
- iOS simulator: Xcode **14.2**, only iOS **16.2** runtimes on this Mac. The current Expo 57 / React Native 0.86 application requires the newer supported toolchain (Xcode 26.4+ / iOS deployment target 16.4). The local simulator cannot run this app. CocoaPods is also unavailable. No package downgrades or blind upgrades were performed.
- Android: no attached device in `adb devices`. Previous acceptance recorded emulator package/window service failures on this host; no working Android native session exists for this revision.
- Upstash, S3-backed media/audio failures, full native map rendering and Stripe sandbox acceptance remain external/unverified. No fake services, screenshots, success states, credentials or production bypasses were introduced.
- Native screenshots for **every matrix row** remain missing. Therefore every screen remains **MISMATCH — unverified** and none is called complete. Native small-phone, standard-iPhone, large-Android and tablet layouts, EN/DE/Arabic RTL, font scaling, keyboard, VoiceOver/TalkBack, real GPS/audio/map/sharing, login and background/restart persistence still require connected native execution.

**Not ready for a new TestFlight / Google Play build.** Connect a supported development client, load this working tree through Metro, capture/review all matrix states on iOS and Android, resolve actual mismatches, then obtain the user's explicit build approval. No new store version is authorized by this report.


### Screenshot provenance and limitations

All committed-candidate images in `screenshots/web/` are genuine browser captures of the develop Preview, not React Native renders, emulators, generated mockups or device evidence. Main reference viewport: 390×844. Home references also cover 320×740, 430×932 and 768×1024. English and German Home references are included; Arabic RTL is captured separately. There are **19 Web screenshots**, providing references for 14 of the current 16 screen rows plus size/locale variants (empty Trips is only a partial reference for the no-route row). Planner step 3 has a separate [start/end image](screenshots/web/planner-start-end-390.png).

The Web active-walk reference shows a real map fallback. The discovery-map reference shows markers/controls over a blank basemap; this is not successful full map rendering. Web loading was too brief to capture reliably; a route-build error was not induced. Those Web reference rows remain pending, without injected delays or mocked service responses. During browser automation, coordinate clicks on below-fold preview controls reached the fixed bottom navigation; the actual button handlers were then activated through their DOM controls to capture Saved/Active/Finish. This observation is not claimed as a Web fix or native equivalence.

Source/assets fingerprint after automated validation: SHA-256 `3006d62a476838b7d8e70cad877bb92443986598787165bd5a3f4361c80d922c` (sorted paths and contents of `mobile/src` and `mobile/assets`). No source edits followed this validation; subsequent changes are QA documentation/screenshots only.


## Internal EAS QA build round — 2026-09-25

The user authorized **internal release builds only**, from the uncommitted visual revision, with no UI changes before screenshot review. This supersedes the previous development-client-only preview path. No commit, push, TestFlight/Store Connect submission, Google Play submission or public publication is authorized/performed.

### Frozen source and build settings

- Working branch: `fix/citywalk-native-device-acceptance`; source baseline HEAD remains `7e6abee` with the uncommitted V2 presentation changes included.
- Audited EAS archive generated with `eas build:inspect --platform android --profile preview --stage archive --output /tmp/citywalk-v2-internal-qa-source`.
- Snapshot: **770 files, 38,210,262 bytes** before compression; sorted path/content SHA-256 **`599c076b8f7509f864fa8c79606c4b02b250ae109a1e920b29aed6062274ca72`**. This is a source manifest fingerprint, not the compressed upload checksum.
- All mobile/shared files in the snapshot were compared byte-for-byte with the working tree. Native source/assets fingerprint remains **`3006d62a476838b7d8e70cad877bb92443986598787165bd5a3f4361c80d922c`**. No UI edits were made in this build round.
- `.easignore` excludes secret environment files, signing files, Git metadata, dependency directories, generated local iOS/Android projects and build outputs. The archive audit found none of these and no credential-pattern hits. Temporary dependency symlinks support local CLI inspection and are excluded from uploads.
- Existing `preview` profile is now explicit: `distribution: internal`, `developmentClient: false`, `environment: preview`, automatic remote build numbers, Android `buildType: apk`, iOS `buildConfiguration: Release`. Release JavaScript/assets are embedded; this is not a Metro development client. Bundle/package identifier: **`com.citywalk.app`**; app version **1.0.0**.
- Only the profile configuration and its existing configuration test were changed in this round. Configuration tests: **13 passed / 1 file**. Earlier full visual-revision validation (188 mobile / 16 shared tests, TS/lint/exports) still applies to unchanged application code.
- Both platform requests use the same frozen directory with `EAS_NO_VCS=1`. Corrected requests use the canonical `EAS_PROJECT_ROOT=/private/tmp/citywalk-v2-internal-qa-source` and `/private/tmp/citywalk-v2-internal-qa-source/mobile` working directory (see packaging correction below). No Git commit is needed or made. Platform-specific remote version numbers/signing differ by design.
- Existing project: `@assixacity/citywalk-mobile` (`ce652902-908a-4e73-8c2c-9ee5aafbfd53`). Its project visibility remains `hidden`. Internal-build download privacy was changed from `PUBLIC` to **`PRIVATE`** and re-read from EAS, so authorized Expo sign-in is required. This is the [official EAS internal-distribution access setting](https://docs.expo.dev/build/internal-distribution/).

### Backend preflight

Both profiles use only `https://lubeck-ai-guide-git-develop-iamassiaajdaais-projects.vercel.app`. No localhost, LAN origin or stale beta-store origin is used. EAS reported no Plain text/Sensitive variables in the Preview environment; the profile injects the public environment name and origin.

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

Official iPhone registration workflow: [Register the iPhone in Safari](https://expo.dev/register-device/af9b0dda-dce3-4586-b73d-d20dcf732e5e). Follow the EAS/Apple profile instructions; manual UDID copying is unnecessary. EAS already lists one enabled iPhone registered on September 23; the owner confirmed registration and that this is the review device. Apple login succeeded through the existing local Keychain/session, and the existing distribution certificate is reused. No password or private key was copied into source or this report.

Capture English first after installing the **new internal release artifact**, then representative German/Arabic RTL screens. Record device model/OS, build ID/version, installation/launch result and original PNG filenames. Capture all 16 rows above; include both planner preference and start/end screens, assistant conversation and adaptation confirmation. For fast loading, capture a native screen recording frame without adding fake delays; capture real error/empty states and note the trigger. Do not alter UI during this first review. Review each image against Web and record the exact observed mismatch before proposing final polish.

No native installation or screenshot is established in this round yet. Existing screenshots are Web only. Build completion, if successful, will not by itself change any parity status to MATCH.


### Internal build requests and current blockers

| Platform | Build ID / install page | Profile | Identifier / version | Current result |
| --- | --- | --- | --- | --- |
| iOS | [1e7f02cb-26c7-4cce-9df8-ff515042e8ac](https://expo.dev/accounts/assixacity/projects/citywalk-mobile/builds/1e7f02cb-26c7-4cce-9df8-ff515042e8ac) | `preview`, internal Release | `com.citywalk.app`, **1.0.0 (8)** | **FAILED before dependency installation**: EAS project-root path mismatch; no IPA. Ad-hoc profile is active and includes the confirmed review iPhone. |
| iOS replacement | [e18db018-1716-4886-aede-aa3919bc6b95 — install](https://expo.dev/accounts/assixacity/projects/citywalk-mobile/builds/e18db018-1716-4886-aede-aa3919bc6b95) | `preview`, internal Release | `com.citywalk.app`, **1.0.0 (9)** | **FINISHED**. IPA downloaded and inspected; registered review iPhone is included in ad-hoc provisioning. Physical installation/launch and screenshots await owner/device evidence. |
| Android | **No build ID / no new APK** | `preview`, internal APK | `com.citywalk.app`, 1.0.0; code **4 allocated but not built** | EAS rejected scheduling because the account's monthly Android Free-plan quota is exhausted. EAS reports reset **October 1, 2026**. |

Android source upload succeeded before the quota rejection; no build job was created. A fresh build-list check still shows the previous September 24 APK as the latest preview build. It does **not** contain this V2 revision and must not be used for visual acceptance. No x86_64-only setting exists in this clean managed snapshot; the requested APK uses Expo's normal device ABIs, including ARM64, but physical compatibility cannot be verified without a new compiled artifact. No billing upgrade, quota bypass or account switch was performed. The owner chose to upgrade independently and requested a retry afterward. A fresh read still reports the Free plan; no new Android request will be made until capacity is available.

The iOS request created a new active ad-hoc provisioning profile using the existing distribution certificate. EAS confirms the registered iPhone is provisioned. The owner confirmed this is the current review iPhone. There is no App Store Connect/TestFlight submission.


### iOS packaging correction

The first iOS internal request (`1e7f02cb-26c7-4cce-9df8-ff515042e8ac`, build 8) failed before installing dependencies. Its cloud job used `projectRootDirectory: ../../private/tmp/citywalk-v2-internal-qa-source/mobile` and could not find `package.json`. This was caused by mixing the macOS `/tmp` alias with the process's canonical `/private/tmp` working directory in the build command—not an application/signing failure. The uploaded source itself was intact.

Retry uses **`EAS_PROJECT_ROOT=/private/tmp/citywalk-v2-internal-qa-source`** with the canonical `/private/tmp/citywalk-v2-internal-qa-source/mobile` working directory. The CLI path calculation is verified to produce exactly **`mobile`**. No source files, dependencies or UI changed. Remote credentials are frozen during the non-interactive retry; the active ad-hoc profile already contains the owner-confirmed iPhone. The retry intentionally increments the remote build number again; failed build 8 is not an install artifact.

Replacement build `e18db018-1716-4886-aede-aa3919bc6b95` (1.0.0, build 9) confirms `projectRootDirectory: mobile` in its actual cloud job. It passed `READ_PACKAGE_JSON`, dependency installation, Expo Doctor, prebuild, installation of 116 CocoaPods, Xcode project configuration, embedded JavaScript bundling and native release compilation. EAS reports **FINISHED**. This verifies that the missing-package error is resolved; physical-device acceptance remains a separate check.

### Successful iOS artifact verification

The replacement IPA was downloaded to `/tmp`, outside the repository, and its actual package metadata inspected:

- `CFBundleIdentifier`: **`com.citywalk.app`**; version **1.0.0**, build **9**.
- Native target: **iPhoneOS**, minimum iOS **16.4**; not an iOS simulator artifact.
- Embedded ad-hoc profile contains **one device**, matching the owner-confirmed enabled iPhone. `get-task-allow` is **false**; profile expires September 23, 2027. Device identifiers and signing material are omitted from this report.
- `Payload/CITYWALK.app/main.jsbundle` is embedded and contains the expected develop Preview HTTPS origin. No development-client framework was found; the `preview` build also explicitly sets `developmentClient: false` and Release configuration.
- IPA size: **19,578,936 bytes**. Package inspection is not a claim of successful on-device installation or runtime behavior.

Open the replacement build's **install** link above in Safari on the registered iPhone, authenticate to the private Expo project and install. The owner has been asked to confirm installation and launch. A fresh `xcrun xctrace list devices` still detects no connected physical iPhone, so this Mac cannot capture native evidence yet.

Current screenshot coverage remains **19 Web / 0 iOS / 0 Android**; **0/16** required native screen rows are verified on either platform. No observed visual mismatches can yet be classified; matrix rows remain **MISMATCH — unverified** because evidence is missing. iOS visual review can now begin after installation, but final visual-polish approval remains pending native captures and Android build capacity. The media 502 and other documented external limitations remain unchanged. No commit, push or store submission was performed.

## Five-issue native follow-up — 2026-09-25

Branch: `fix/citywalk-native-device-acceptance`. This round changes the local implementation after internal iOS build **9**; that existing IPA does **not** contain these fixes. No new EAS build, TestFlight build, store submission, commit or push was requested or performed. Web V2 screens, styles, backend and dependencies are unchanged.

### Reported bugs and findings

`FIXED` below means implemented with automated regression coverage, **not native visual acceptance**. The specific wrong-place report remains open rather than assigning it a speculative root cause.

| Bug | Status | Cause, change and remaining evidence |
| --- | --- | --- |
| Meaningful route-building loading | **FIXED — native capture pending** | The native indicator always highlighted the first stage, while route calculation ran as one synchronous call. Hydration also reused the building view even though it was only reading saved state. The same shared planner now exposes actual work boundaries; native yields a rendering frame between them and shows completed/current/upcoming states in EN/DE/AR. No percentages, minimum duration or decorative timer. Hydration uses the localized general loading message. Content-fetch skeletons are not falsely described as route calculation. |
| Duplicate Places / Orte heading | **FIXED — native capture pending** | Both `SectionTitle` and `WalkChoices.label` rendered a heading. The filter group keeps its accessible label and hides its second visible heading. Place data and filtering remain intact. Rendered EN/DE/AR tests assert one heading and both test places remain present. |
| Active bottom tab does not return to top | **FIXED — native capture pending** | The custom bottom bar only called `router.navigate`. A focus-scoped scroll coordinator now uses actual ScrollView/FlatList refs. Root reselection scrolls to zero; nested reselection uses Expo Router `dismissTo` and consumes the scroll request when the root gains focus. Different tabs still navigate normally. No timer, route-counter parameter or wholesale history reset. Home, Explore, Trips, Saved and Profile are covered. |
| Listen / Read opens Schiffergesellschaft | **STILL FAILING — reported device symptom not reproduced or closed** | No hardcoded Schiffergesellschaft fallback was found. Existing action links already carried the current stop slug, cache keys include city/place/locale, and detail/guide screens reject mismatched response identities. Fresh Preview requests for Holstentor, Marienkirche and Schiffergesellschaft each returned their own identity. Confirmed adjacent defects: Read ignored `focus=story`; Listen used an offset relative to the wrong container; City Hub Ask selected the first API place without user selection. Those are fixed. Actions now explicitly push their exact place, local detail/audio state is keyed by identity, and a missing current stop cannot silently promote another place. Regression coverage proves Holstentor/Marienkirche bindings before/after confirmed Skip, correct detail story/audio/Ask, and rejection of a mismatched Schiffergesellschaft payload. This does **not** prove the original on-device misrouting cause; exact reproduction/screenshots are still required. |
| Arabic RTL layout | **FIXED in layout code — visual acceptance still pending** | Mixed content-language alignment and layout direction, an artwork layer occupying the text area, inherited scroll-content direction and narrow compact-button content contributed to inconsistent composition. Scroll containers, header and bottom navigation explicitly receive the app direction; row order follows that direction once, without manually reversing arrays. The CITYWALK wordmark stays LTR inside the RTL header. Latin city names retain their writing direction but align to the app's start edge. Hero text reserves space above the artwork. Arabic line spacing/letter spacing and flexible card text containers avoid squeezed glyphs. Compact labels and bottom tabs fit long translations. Native screenshots are required to judge actual line breaking, mirroring and spacing. |

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
| Final iOS/Android Hermes export | **PASS on both platforms**; one iOS Hermes bundle (4.4 MB) and one Android Hermes bundle (4.6 MB), with assets/metadata, under `/tmp/cw-five-fixes-bundles-final`. Local exports only, not native signed builds or installation tests. |
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
