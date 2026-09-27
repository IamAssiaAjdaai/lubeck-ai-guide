# CITYWALK native device acceptance

Audit date: 2026-09-24. Branch: `fix/citywalk-native-device-acceptance`.
Application baseline: `7e6abee18cb625eb81a40f889ad9bbdcac00d88b` (recovery merge), with the same tree as validated `43e1e28280aedcff55c311df2ac517dec27d74ed`.

This record separates source/unit evidence, host HTTP probes, native compilation, and actual device execution. Product behavior and dependencies are unchanged. This follow-up corrects the two beta EAS API origins and adds explicit source-upload exclusions; no commits, pushes, store submissions, or production payments were performed. Generated native projects are ignored CNG outputs.

## Acceptance matrix

No CITYWALK native launch has been established in this pass. All device capabilities below remain blocked, including cases covered by automated tests with mocked native bridges.

| Capability | iOS Simulator | iPhone | Android Emulator | Android Device |
| --- | --- | --- | --- | --- |
| Install/launch | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Home | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Planner | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Return-by | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Route preview | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Active walk | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| GPS allowed | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| GPS denied | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Map | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Audio | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| AI | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Saved | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Share | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| RTL | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Finish | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Restart persistence | BLOCKED | BLOCKED | BLOCKED | BLOCKED |

The same blocked status applies to city selection/Hub, interests, walking preference, start/end, loading/empty/errors, Skip/Shorten/Add stop/Take me back and their confirmation/cancellation, Assistant, Place Detail, login/account, Android back, keyboard, system bars, background/resume, GPS services disabled, and native share sheet/intent. No physical devices were connected. No simulator evidence is substituted for physical-device evidence.

## iOS toolchain

| Item | Observed |
| --- | --- |
| Host | Macmini7,1, Late 2014 Intel Mac mini |
| macOS | Monterey 12.7.6, build 21H1320 |
| Xcode | 14.2, build 14C18 |
| Selected tools | `/Applications/Xcode.app/Contents/Developer` |
| Simulator runtime | iOS 16.2 (20C52) only; no compatible runtime |
| Simulator definitions | iPhone 14 family, SE third generation, and iPads; no accepted run |
| CocoaPods | Not installed; system Ruby 2.6.10 |
| Expo / React Native / React | 57.0.25 / 0.86.3 / 19.2.3 |
| Generated deployment target | iOS 16.4, verified in Podfile and Xcode project |
| Local signing | Zero valid code-signing identities; no development team in generated project |
| Bundle identifier | `com.citywalk.app.dev` development; `com.citywalk.app` preview/store |
| Local app/build version | 1.0.0 / 1 |

**Exact blocker:** Xcode 14.2 is older than Expo 57's supported Xcode 26.4 toolchain, and iOS 16.2 is below the application's iOS 16.4 deployment target. The installed React Native helper's lower Xcode 16.1 guard does not supersede Expo's supported toolchain. Installing CocoaPods alone would not resolve this.

Use a supported newer Mac with macOS 26.2 or newer compatible with Xcode 26.4.1, select that Xcode's Developer directory, install an iOS runtime at least 16.4, and complete CocoaPods/native dependency installation. This Mac's officially supported maximum OS is Monterey; a normal Xcode update on this host cannot meet the requirement. Do not downgrade Expo/RN or the deployment target to bypass it. A cloud build does not make the installed iOS 16.2 simulator compatible.

Sources: [Expo SDK 57 requirements](https://docs.expo.dev/versions/v57.0.0/), [Apple Xcode system requirements](https://developer.apple.com/xcode/system-requirements), [Apple Mac mini identification and supported OS](https://support.apple.com/en-us/102852).

For physical iPhone acceptance, connect and trust a supported iPhone, enable Developer Mode, select an authorized Apple development team, register/provision the device for an internal build (or use TestFlight with the appropriate distribution signing), and record its model/OS/build. No iPhone was available in `xcrun xctrace list devices`.

## Android toolchain and emulator

| Item | Observed |
| --- | --- |
| Android Studio | 2026.1, build AI-261.26222.65.2614.16379836 |
| SDK | `~/Library/Android/sdk` |
| Platform / tools | API 36 rev 2; build-tools 36.0.0; platform-tools 37.0.1; Gradle also installed required build-tools 35.0.0 |
| Native tools | NDK 27.1.12297006; CMake 3.22.1 |
| Java | Eclipse Adoptium 17.0.20.1, x86_64 |
| Generated Gradle | Wrapper 9.3.1; Android Gradle Plugin 8.12.0 |
| App targets | minSdk 24; compileSdk/targetSdk 36 |
| App ID | `com.citywalk.app.dev` development; `com.citywalk.app` preview/store |
| Version | 1.0.0 / local versionCode 1 |
| Local signing | Generated standard debug keystore; local generated release stanza also uses debug signing, not a Play artifact |
| Created emulator | `medium_phone`, Google Play API 36 rev 7, x86_64; 1080×2400, density 420, 2048 MB RAM |
| Emulator binary | 37.1.11.0, build 15917651 |

Created with `android emulator create medium_phone`. The first `android emulator start medium_phone` attempt timed out after 300 seconds, with ADB still offline. Logs reported 1,987 MB available versus 5,120 MB required and software rendering under memory pressure. A logged `GLAsyncSwap` read-only-feature error is not sufficient to identify the boot failure's root cause. The surviving emulator process was explicitly stopped to avoid competing with Gradle. `emulator -accel-check` passes with Hypervisor.Framework (OS X 12.7); acceleration is available. No app startup crash has been observed because the app has not launched.

Host capacity is **8 GB RAM, 2 physical / 4 logical CPUs** (`sysctl`). Google's current [Mac requirements for Android Studio with the emulator](https://developer.android.com/studio/install#mac) specify 16 GB minimum RAM. The emulator logs force one virtual CPU because the host has fewer than six logical cores, even when two are requested. This supports an environment/performance limitation, not an identified CITYWALK defect. A supported machine with sufficient RAM or a physical Android device is the appropriate acceptance environment if these boot attempts cannot complete.

Native generation passed using `npx expo prebuild --no-install --platform android` and the equivalent iOS command. Neither changed package manifests. Android build command:

```sh
ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew :app:assembleDebug \
  -PreactNativeArchitectures=x86_64 --max-workers=2 --console=plain
```

**Android native build passed**, exit 0: `BUILD SUCCESSFUL in 1h 22m 42s`. Compilation included MapLibre, Worklets, Reanimated, Expo Modules Core, React Native Screens and all 74 application native-binding steps. Dependency deprecation warnings did not fail the build. Gradle/Kotlin daemons were stopped afterward to release memory.

Preserved artifact: `/tmp/citywalk-native-acceptance-x86_64-debug.apk` (110,493,477 bytes), SHA-256 `9a697911361d76e9ba87a9cbf0b37c96b5f6f37d83c54b3f2b2a7a8a1a520a45`. APK metadata confirms `com.citywalk.app.dev`, version 1.0.0/code 1, minSdk 24, target/compile SDK 36. This debug development-client APK targets x86_64; it is not an ARM physical-device or Google Play AAB artifact.

### Android execution attempts and final blocker

1. Initial windowed CLI boot: 300-second timeout, ADB offline, with Gradle competing for resources. Stopped the emulator before finishing the build.
2. After all builds/tests finished and build daemons stopped, `android emulator start --cold --headless medium_phone`: ADB online, but the CLI again timed out after 300 seconds. Continued observing: package manager ready at 294 seconds, activity manager ready at 386 seconds, screen enabled at 421 seconds. The device still showed the Google boot animation; screenshot inspected at `/tmp/cw-native-android-boot.png`. This was not an app screenshot or an accepted native launch.
3. Started the same AVD directly with `-no-window -no-snapshot -no-boot-anim -cores 2 -memory 2048 -gpu swiftshader`. Android **did report `sys.boot_completed=1`**. Observed OS: Android 16/API 36, model `sdk_gphone64_x86_64`. The emulator still forced one virtual CPU. Booting Android is not equivalent to running CITYWALK.
4. Started Metro using an environment override for the verified restored-develop Preview and ran `android run --apks=/tmp/citywalk-native-acceptance-x86_64-debug.apk --device=emulator-5554`. APK transfer completed, but installation failed with `Failure calling service package: Broken pipe (32)`. Android CLI's installer helper also recorded `ClassNotFoundException: com.android.cli.installer.device.DeviceInstaller`. The layout tool could not install its instrumentation APK. An attempted lower-resolution display setting failed because the window service disappeared; no successful display override is claimed.
5. Crash logs show `DeadSystemException: The system died` in Android Settings, SystemUI, Nexus Launcher, local transport and the media provider. These are Android system failures, not CITYWALK exceptions. After the package service recovered, retried standard `adb install --no-streaming -r` without the CLI helper or automatic permission grants. Transfer succeeded, but installation exceeded 300 seconds. A final `pm path com.citywalk.app.dev` returned exit 224 and the same package-service broken pipe, so installation could not be confirmed.

**Final result: native execution BLOCKED by an unstable emulator/system-service environment.** No CITYWALK launch, startup-crash check, or traveler flow passed. No application code was changed to compensate. The physical-device check still showed no attached Android or iPhone. Task-owned emulator and Metro processes were stopped; APK, AVD, logs and exports are retained. Retest on a host meeting the native toolchain requirements or a connected physical device (the preserved x86_64 APK is for an x86_64 emulator; a physical ARM device needs its corresponding build).

## Service and media checks

Before this follow-up, the configured `store-beta` API origin was `https://lubeck-ai-guide-git-beta-store-iamassiaajdaais-projects.vercel.app`. These are host HTTP probes, not native acceptance:

- City index and Lübeck detail: HTTP 200; the latter returns 25 real places.
- Native place endpoint `/api/content/cities/lubeck/places/holstentor?locale=en`: HTTP 404 HTML, reproduced twice. The endpoint exists in this branch; the configured beta deployment must serve the restored API before accepting place-detail behavior. No mock endpoint was substituted.
- A current alternative was verified through GitHub/Vercel: deployment `dpl_Eu3ZX1dF3LDMHXuYgPe2ahnDGbKu`, READY, non-production, commit `7e6abee18cb625eb81a40f889ad9bbdcac00d88b`, alias `https://lubeck-ai-guide-git-develop-iamassiaajdaais-projects.vercel.app`. Both city index and Holstentor detail return HTTP 200 JSON without authentication redirects; detail includes `city`, `place` and `verifiedSources`. Initially tested as a local development override, this origin is now set in both beta EAS profiles by the follow-up below. Host HTTP probes do not establish native execution.
- Holstentor image `/api/media/85d981bb-a87d-41a1-9673-63ac36d628b9`: HTTP 200, `image/jpeg`, 2,120,834 bytes.
- Holstentor English audio `/api/media/2267a6df-01d8-4cf9-a4ed-9e3a19631640`: HTTP 200, `audio/mpeg`, 1,657,137 bytes. DTO duration: 102.53 seconds.
- The earlier S3 502 did **not** reproduce for these two samples. This does not establish every media object or native playback/rendering. No storage/provider/config fault can be inferred from successful samples.
- Map style `https://tiles.openfreemap.org/styles/liberty`: default Python request returned 403; a subsequent request with an explicit diagnostic user agent returned 200. This is mixed host network/request evidence, not proof of a MapLibre integration failure or of complete tile rendering. Provider unchanged. Native tiles, markers, polyline, location, active stop, interaction and usable itinerary fallback remain untested.
- Guide eligibility for Lübeck/Holstentor: HTTP 200, `eligible: true`. Eligibility alone does not establish AI provider/rate-limit availability.
- Live non-production AI question, “When was the Holstentor built?”: HTTP 200, answered 1464–1478 and returned a verified Museum Holstentor source/chunk. The earlier AI-unavailable failure did not reproduce. This does not independently verify the deployed Upstash configuration, allowance exhaustion, contextual trip adaptation, “I'm tired”, or provider-unavailable handling; those native scenarios remain blocked. The beta response lacks the current branch's allowance metadata and the place route is missing, so deployment parity must be checked before treating it as current-backend acceptance.

### Restored develop Preview: separate current-backend results

The current deployment above behaves differently from the old stable beta origin:

- Holstentor detail returns HTTP 200 with one verified source. Its image `/landmarks/holstentor.jpg` returns HTTP 200, `image/jpeg`, 2,502,963 bytes; this is the existing published fallback asset, not a newly substituted test image.
- The real approved audio URL `/api/media/0a553f78-c231-457c-a021-3b3211431cdc` returned by the DTO returns **HTTP 502**, `Media delivery is temporarily unavailable.` The response comes from the application's media API proxy when object-store delivery throws. The deployed production-mode handler deliberately logs no underlying storage exception, so the available runtime logs do not distinguish missing/invalid storage configuration, credentials, connectivity or an upstream provider error. This is not a native audio-decoder diagnosis. Do not claim the S3 issue resolved or bypass it with fake media.
- The same real place question returns **HTTP 500**, `AI Guide is temporarily unavailable.` Runtime logs identify missing `UPSTASH_REDIS_REST_URL` and Redis initialization without URL/token, followed by `ERR_INVALID_URL` for `/pipeline`. Configure the isolated Preview Upstash URL/token through approved environment management and redeploy before live AI acceptance. No rate limiter, allowance or provider failure was bypassed.

Successful probes of the older beta deployment must not be used to clear these current-preview blockers.

## Native behavior and accessibility scope

- Audio uses Expo Audio with play/pause/resume/replay/error handling in source. Real playback, navigation lifecycle, and background/foreground acceptance remain blocked. Background/lock-screen audio is **out of current configured scope**: background playback/recording are disabled and no lock-screen control activation is implemented.
- Saved places, saved V2 walks and active journeys use local AsyncStorage. Legacy trips remain supported. Save/view/remove/navigation/restart must be exercised on both platforms; **no account cloud-sync claim** is made.
- Finish sharing currently sends text through React Native Share; native sheet/intent execution is untested.
- Accessibility remains blocked on both platforms: tap targets, text scaling, VoiceOver/TalkBack labels and selection state, contrast, Arabic RTL, long German strings, keyboard and safe-area/system-bar layout require real native inspection. Source props or DOM mocks are not acceptance evidence.

## Language coverage

Web has **27** configured locales: de, da, nl, sv, en, fr, fi, no, pl, it, es, pt, cs, el, hu, ro, sk, sl, hr, bg, et, lv, lt, ga, mt, tr, ar.

Native has **3**: English, German and Arabic. Shared `traveler-core` V2 walk copy/category labels cover those three; other web V2 locales fall back to English. Native shell localization remains its own three-language infrastructure, not a unified 27-language catalog. The remaining 24 web locales are absent from native. None of EN/DE/AR has passed this native-device matrix. Do not label multilingual acceptance complete.

## Store configuration and signing

Existing Expo project is `assixacity/citywalk-mobile`, project ID `ce652902-908a-4e73-8c2c-9ee5aafbfd53`. EAS CLI authentication works. `store-beta` uses store distribution, the preview environment, automatic remote build-number increments, and Android AAB output. Android submission configuration names the internal track and draft release; no submission was run. iOS submission configuration has no configured App Store Connect app ID.

CITYWALK icon/splash artwork exists and was visually inspected. Source app version is 1.0.0; remote build numbering is enabled, so local generated build number 1 is not evidence of the next store build number. Existing September EAS builds use older commit `56f3b313`, not this restored baseline, and cannot prove acceptance of this branch.

iOS generated permissions include a specific foreground-location message, plugin defaults for always-location/motion/Face ID, and development-only local-network/Bonjour configuration. No microphone permission or background audio/location modes are configured. The merged Android debug manifest confirms foreground coarse/fine location, Internet, audio-settings and vibration permissions; development overlay permission and legacy storage permissions capped at API 32 are present. Transitive declarations also include network/Wi-Fi state, multicast, biometrics/fingerprint, wake lock and the app's internal dynamic-receiver permission. No background-location or recording permission is declared. Review final signed-manifest/privacy disclosures before distribution; privacy-manifest aggregation is configured, but no signed IPA was inspected.

**Legal URL audit:** `/en/privacy` and `/en/terms` returned streamed HTTP 200 responses containing `NEXT_HTTP_ERROR_FALLBACK;404` rather than legal documents. No corresponding legal page routes were found in this tree. Valid published privacy/legal URLs and store metadata still need confirmation; status 200 alone is not a pass.

The initial source-transfer approval blocker was resolved by explicit user approval on 2026-09-24, limited to Expo EAS. Android source uploads have now succeeded from `/tmp/citywalk-native-store-build`, containing the restored baseline plus reviewed EAS configuration changes and no environment files. iOS stopped at remote signing setup before upload; EAS requires interactive credential configuration. No store submission is authorized.

TestFlight readiness remains blocked by a current signed build/App Store Connect setup, legal metadata, and real iPhone acceptance. Google Play readiness remains blocked by a current signed AAB/internal-test setup, legal metadata and real Android acceptance. No credentials were invented, signing checks bypassed, or public publication attempted.

## Automated validation

The following checks were **rerun in the initial acceptance pass**, sequentially after Android compilation. The subsequent configuration-only follow-up rerun is recorded below. Automated results do not substitute for the device matrix.

| Check | Fresh result |
| --- | --- |
| Full web/shared | 818 passed: 802 web + 16 shared; 138 passing files; 22 DB-gated tests / 5 files skipped in normal run |
| Dedicated DB integration | 22 passed: CMS 5, content 6, media 7, commerce 3, knowledge 1 |
| Full mobile | 185 passed, 33 files, zero skips/unhandled errors; includes 9 DOM interaction tests with mocked native bridges |
| Web/mobile TypeScript and lint | Passed |
| Web production build | Passed |
| Expo Doctor | **20/21**, exit 1: native-tooling check reports absent CocoaPods (recommended 1.15.2+). The generated iOS project makes this check relevant; the earlier managed-tree baseline's 21/21 is not the current result |
| iOS/Android Hermes exports | Both passed, exit 0; exported to `/tmp/citywalk-native-acceptance-export`; these are JavaScript bundles, not native installable builds |
| Android native debug build | Passed, exit 0; x86_64 APK above |
| iOS native build | BLOCKED by Xcode/runtime incompatibility and absent CocoaPods; prebuild passed, native compilation was not claimed |

Commands: root `npm run test:run -- --maxWorkers=1`; the five dedicated `*:test:integration` scripts; mobile `npm run test:run -- --maxWorkers=1`; root `npx tsc --noEmit`; mobile `npm run typecheck`; root/mobile `npm run lint`; root `npm run build`; mobile `npm run doctor`; mobile `npx expo export --platform all --max-workers 1 --output-dir /tmp/citywalk-native-acceptance-export`. No additional tests were excluded, no test timeout was raised, and no native-tooling check was disabled. Fresh result exit codes and timings are in `/tmp/cw-native-validation-results.json`.

Fresh bundle credential review: both Hermes bundles were scanned against two configured server-secret values and recognizable Groq/OpenAI/AWS credential patterns; **zero matches**. No secret values were printed or copied into this report. Native/shared runtime source contains no server SDK or server-only module imports. This is a bounded secret scan and source audit, not evidence of live AI device execution.

Post-integration `npm run db:verify` passed: the catalog remained at 2 cities / 44 places, matching the baseline.

## Evidence and commit boundary

Local evidence logs are under `/tmp/cw-native-*`; generated `mobile/ios`, `mobile/android`, dependency directories, emulator/system-image files, Gradle caches, environment files and raw logs must not be force-added. Intended repository changes are this QA README, root `.easignore`, `mobile/eas.json` (both beta origins), and its existing configuration test expectations. Generated native projects and `.env.local` remain ignored. Runtime application code remains identical to `43e1e28`; no dependencies, fixtures, debug code or credentials were added.

These configuration/documentation changes remain subject to the final rerun and review below; they are an **incomplete acceptance record**, not native/store sign-off. No commit or push was performed.

## Ticket #33 Store Beta gate

**NO.** [Ticket #33](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/33) requires TestFlight and Google Play internal/closed builds and real-device GPS/audio/AI/RTL/navigation/V2-flow evidence. Concrete blockers:

- No current TestFlight or submitted Play internal-test build; Android cloud builds have been requested, iOS store credentials need interactive setup, and store distribution/account metadata remains unverified.
- No physical devices attached, no accepted native traveler flow, incompatible iOS Xcode/runtime and missing CocoaPods, and Android package/window service failures preventing confirmed installation.
- Current Preview AI fails because Upstash URL/token configuration is absent; its real S3-backed audio request returns 502. Native map rendering is unverified.
- The old beta API is stale (native place-detail endpoint returns 404). Both beta EAS profiles now target the restored develop Preview; its Upstash and S3 dependencies still block acceptance.
- No verified functioning privacy/legal URLs or completed store metadata audit.


## EAS source-upload follow-up — 2026-09-24

The user explicitly authorized uploading repository source/non-secret configuration to Expo EAS only. No store submission or public release was authorized. No new Expo project was created.

### Reviewed upload and environment

- Account/project: `assixacity/citywalk-mobile`, project ID `ce652902-908a-4e73-8c2c-9ee5aafbfd53`.
- EAS `build:inspect --platform android --profile store-beta --stage archive` produced the exact pre-upload source copy. The first inspection included Git metadata; root `.easignore` now explicitly excludes it and all environment files, dependencies, generated native projects, build caches and private signing files.
- Final reviewed copy: **741 files / 36,171,017 bytes** uncompressed; EAS uploaded **30.4 MB** compressed for each Android request. Contains mobile, shared traveler-core, repository web/backend source, tests, migrations, public assets, package locks and non-secret configuration/docs. Server source is uploaded as source, not bundled/imported into the native runtime.
- No `.env*` (including `.env.example`), `.git`, `node_modules`, generated iOS/Android projects, credential files or private keys occur in the reviewed copy. No links escape the archive.
- Bounded credential scan: zero recognizable private-key/provider-token patterns; zero matches for the configured non-example local secret. Public localhost PostgreSQL example text in README/CI was identified as a committed example, not an external database credential. No credential value appears in this QA report.
- EAS project **and account** Preview environments both return “No variables found”. Only the profile's public environment name and API origin are injected. Optional `EXPO_PUBLIC_CITYWALK_MAP_STYLE_URL` is a public style URL (default OpenFreeMap), not a provider credential.
- Database/auth signing secret, AI provider keys, Upstash URL/token, S3 credentials and Stripe secrets belong exclusively to the separate backend environment. None was transferred into mobile EAS variables.
- Public Expo config resolves version `1.0.0`, scheme `citywalk`, runtime app-version policy, both identifiers `com.citywalk.app`, existing project/owner, and no development HTTP plugin.
- Security manifest and scan evidence: `/tmp/cw-eas-reviewed-manifest.json`, `/tmp/cw-eas-reviewed-security.json`; inspected copy `/tmp/cw-eas-source-reviewed`. These local evidence files are not repository additions.

### Backend used by both beta profiles

`https://lubeck-ai-guide-git-develop-iamassiaajdaais-projects.vercel.app`

This alias currently serves restored commit `7e6abee` (deployment `dpl_Eu3ZX1dF3LDMHXuYgPe2ahnDGbKu`), unlike the obsolete beta-store alias. It is an isolated non-production Preview, not localhost. No unnecessary backend redeployment was performed. The alias follows future develop deployments; record the serving deployment when doing physical QA.

Fresh probes: city index and native Holstentor detail return 200 JSON; `/api/auth/get-session` with native Origin `citywalk://` returns 200/null without redirection. Native auth uses this API origin and `citywalk://account`; backend source trusts `citywalk://`/`citywalk://*` and uses the Better Auth Expo plugin. This proves anonymous connectivity/configuration only; login, callback delivery and account persistence still require native acceptance.

Current Preview approved image responds 200; real approved S3-backed audio returns 502; real AI returns 500 with missing Upstash configuration established in runtime logs. Full native map rendering and Stripe sandbox/store acceptance remain unverified. Existing map retry/fallback, audio error and guide-failure paths are preserved; source/tests are not physical failure-mode evidence.

### iOS signing action

The non-interactive `store-beta` request selected remote credentials and incremented remote build number **5 → 6**, then stopped: “Credentials are not set up. Run this command again in interactive mode.” No iOS build ID/IPA was created by that attempt. Certificate validation, store provisioning, Apple team and App Store Connect app existence are not confirmed. Remote build number 6 is an attempted allocation, not a completed artifact.

User action through official EAS: from `/tmp/citywalk-native-store-build/mobile`, run `npx eas-cli credentials:configure-build --platform ios --profile store-beta` and complete Apple login/2FA/team selection locally if requested. Do not send passwords, codes, UDIDs or private signing files through chat. Resume the build after this succeeds. TestFlight remains the preferred physical iPhone path after a signed artifact and separately authorized submission. If an ad-hoc device build becomes appropriate, use `eas device:create` and its official registration URL.

### Android cloud requests

| Artifact | Profile | EAS build ID | Version / code | Current result |
| --- | --- | --- | --- | --- |
| Signed Play AAB | `store-beta` | `5ce0780e-9676-43c9-b46a-7127a4a7b621` | 1.0.0 / 3 | Source uploaded; queued at 2026-09-24 15:34 UTC |
| Installable internal APK | `preview` | `716afbcd-4052-4b8a-b075-797048769c90` | 1.0.0 / 3 | Source uploaded; queued at 2026-09-24 15:36 UTC |

Both use `com.citywalk.app`, the existing remote EAS Android keystore, Preview environment and the reviewed source. The APK profile's internal distribution selects APK output; no x86_64-only override or generated local Android project was uploaded. Final ARM64 contents and signature must be inspected in the completed artifact before claiming physical-device compatibility. Google Play service-account credentials were not required to request the AAB; Play upload/submission remains separately authorized work.

Build dashboards: [AAB](https://expo.dev/accounts/assixacity/projects/citywalk-mobile/builds/5ce0780e-9676-43c9-b46a-7127a4a7b621), [APK](https://expo.dev/accounts/assixacity/projects/citywalk-mobile/builds/716afbcd-4052-4b8a-b075-797048769c90). These are build records, not evidence of installed apps.

### Validation after EAS configuration changes

All requested automated gates were rerun after changing the beta origins (2026-09-24):

| Check | Exact final result |
| --- | --- |
| Full web/shared | **818 passed**, 138 files; **22 DB-gated tests / 5 files skipped** in normal run; exit 0 |
| Dedicated DB suites | **22 passed**: CMS 5, content 6, media 7, commerce 3, knowledge 1; all exit 0 |
| Full mobile | **185 passed**, 33 files, zero skipped/unhandled errors; exit 0 |
| Web / mobile TypeScript | Both passed, exit 0 |
| Web / mobile lint | Both passed, exit 0 |
| Production web build | Passed, exit 0 |
| Expo public Preview config | Passed, exit 0; identifiers/scheme/project and absence of development HTTP plugin inspected |
| Expo Doctor, original local checkout | **20/21**, exit 1, solely absent CocoaPods after local native generation |
| Expo Doctor, clean managed EAS checkout | **21/21**, exit 0; same source/config uploaded, with generated native projects excluded |
| Post-integration database verification | Passed, 2 cities / 44 places |
| Diff whitespace check | Passed |

Result/command evidence: `/tmp/cw-eas-validation-results.json`, `/tmp/cw-eas-*.log`, `/tmp/cw-eas-public-config.json`. The clean managed result does not repair or override the host's unsupported Xcode/CocoaPods environment. No check was disabled to obtain it.

The previous successful Hermes exports and local x86_64 native compilation are retained as earlier evidence, **not rerun**: neither runtime source nor dependencies/native code changed. New cloud builds provide the requested release/native artifact validation when they finish. No DB schema change occurred, so migrations/generation were not repeated for an API-origin/ignore-file change.

### Physical QA handoff

After a completed APK is inspected, download it from the linked EAS build and install on a connected ARM64 Android device; record model, Android version, app version/code and artifact hash. Confirm GPS allow/deny, full map tiles, audio/error handling, share sheet, restart persistence, account and EN/DE/AR RTL through the full traveler flow. Do not treat a successful APK compilation as completion of these checks.

For iPhone, finish official EAS signing setup, produce and inspect the IPA, then obtain separate approval for TestFlight submission/distribution. No iPhone registration is required for TestFlight. An internal ad-hoc path requires official EAS device registration and provisioning. Record real-device OS/build and the same flow, background/foreground, permissions, audio and persistence evidence. Resolve Preview Upstash and S3/audio before claiming those live capabilities accepted.

### Final handoff status — 2026-09-24 15:44 UTC

Both Android builds remain **IN_QUEUE**, with no build logs/artifact, queue position or ETA returned by EAS. No APK/AAB was downloaded or inspected, and ARM64/signature verification remains pending. Leave these existing builds running; do not create duplicate requests. iOS remains blocked at interactive signing setup, with no build ID/IPA and no confirmed App Store Connect app/team/provisioning.

Fresh full gates are recorded above. Changes are limited to `.easignore`, `mobile/eas.json`, `mobile/tests/app-config.test.ts`, and this QA README. No staged changes, secrets, environment files, generated projects or build artifacts are in the intended change set. Runtime code and dependencies are unchanged from the recovered baseline. The config/docs change is reviewable for a later commit, but native/store acceptance is **not complete**. No commit, push, store submission or public publication was performed.
