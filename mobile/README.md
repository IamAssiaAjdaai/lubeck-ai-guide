# CITYWALK Mobile

Expo + React Native traveler client for CITYWALK. Expo remains the mobile framework, but the default CITYWALK development workflow is **local-first on the MacBook**. Cloud EAS builds are not required for normal development or local release validation.

The Next.js / vinext application remains the backend, public web, and Admin runtime on Cloudflare.

## Local-first policy

Use the MacBook toolchains for normal native work:

- Expo SDK / Expo Router / Expo modules stay in the app.
- iOS builds use the locally installed Xcode toolchain.
- Android builds use the locally installed Android Studio / Android SDK toolchain.
- Generated `mobile/ios` and `mobile/android` directories are local build artifacts and remain gitignored.
- EAS Build is an optional fallback only. Do not require an EAS cloud build for ordinary CITYWALK development.
- EAS Update is not part of the current runtime.
- Store submission, production signing changes, and production release actions remain explicit manual steps.

## MacBook prerequisites

Install and configure:

- Node.js 22
- Xcode + Xcode Command Line Tools
- CocoaPods as required by the generated iOS project
- Android Studio + Android SDK / emulator
- a physical iPhone / Android device when doing real-device QA

From the repository root, run the read-only readiness check first:

```bash
npm run mobile:local-check
```

It checks Node/npm, Xcode, CocoaPods, Java/keytool, the Android SDK, and adb. It does not install software or change system settings. If you want machine-readable output for troubleshooting:

```bash
cd mobile
npm run local:check -- --json
```

Then install project dependencies and validate Expo:

```bash
npm ci
cd mobile
npm ci
npm run doctor
```

## First local development build

MapLibre React Native and the other native modules require a development build; Expo Go is not the CITYWALK development target.

Start the backend separately, then expose a LAN address reachable by the device. No server secret belongs in an `EXPO_PUBLIC_*` variable.

macOS / zsh example:

```bash
cd mobile

export EXPO_PUBLIC_CITYWALK_ENV=development
export EXPO_PUBLIC_CITYWALK_API_ORIGIN=http://192.168.1.20:3000

npm run ios -- --device
# or
npm run android -- --device
```

The first `expo run:ios` / `expo run:android` call generates the native project locally when it does not exist, compiles it with Xcode / the Android SDK, installs it, and starts Metro.

The same commands are available from the repository root:

```bash
npm run mobile:ios -- --device
npm run mobile:android -- --device
```

After the native binary is already installed, normal JavaScript / TypeScript iteration only needs Metro:

```bash
cd mobile
npm start
```

Development builds declare only the native transport exceptions needed to reach the LAN server: iOS local-network access and Android cleartext HTTP. Rebuild after changing native configuration. Preview and production builds do not include these development exceptions.

## Regenerate native projects

Expo Continuous Native Generation remains the source of truth. The generated native directories are intentionally not committed.

When native plugins/configuration change:

```bash
cd mobile
npm run prebuild
```

Use a clean prebuild only when intentionally regenerating native projects from scratch:

```bash
npx expo prebuild --clean
```

Do not put signing keys, provisioning profiles, keystores, or credentials in the repository.

## Local release smoke builds

A release-configuration build is useful before store packaging. It still runs entirely on the MacBook.

Preview builds must use an explicitly approved public HTTPS preview API origin:

```bash
cd mobile

export EXPO_PUBLIC_CITYWALK_ENV=preview
export EXPO_PUBLIC_CITYWALK_API_ORIGIN=https://<approved-cloudflare-preview-origin>

npx expo run:ios --configuration Release --device
# or
npx expo run:android --variant release --device
```

CITYWALK fails closed when a Preview API origin is missing, non-HTTPS, credential-bearing, or local/private.

These Expo CLI release builds are for local validation. They are not the store-submission step.

## Signed store artifacts

For an actual signed iOS archive or Android App Bundle, generate the native projects locally and use the native IDE signing flow:

1. Set the intended CITYWALK environment and approved API origin.
2. Run `npm run prebuild`.
3. iOS: open the generated Xcode workspace, select the approved signing team/profile, then Archive.
4. Android: open the generated Android project in Android Studio and generate a signed App Bundle using the approved upload key.
5. Keep all signing material outside Git.
6. Do not submit to App Store Connect or Google Play unless that release is explicitly approved.

Before any production store build, verify the current iOS `buildNumber` and Android `versionCode` against the store records. CITYWALK currently retains the existing EAS version metadata so we do not accidentally reset or duplicate a store build number while moving the day-to-day workflow local.

## EAS status

`mobile/eas.json` is retained as an **optional fallback / existing store metadata contract**, not as the default build path.

Important:

- do not trigger EAS cloud builds for routine development;
- do not change remote version state casually;
- do not submit from EAS without explicit release approval;
- `eas build --local` is also not the default because it still authenticates with Expo and can use Expo-managed project/credential state.

If we later fully migrate version/signing ownership away from EAS, first record the current App Store / Play build numbers, then move `appVersionSource` and signing state deliberately in a separate release-infrastructure change.

## Map configuration

The map defaults to the same HTTPS OpenFreeMap Liberty style as CITYWALK Web.

`EXPO_PUBLIC_CITYWALK_MAP_STYLE_URL` may select another approved HTTPS style at build time. It is public configuration and must never contain provider secrets.

## Validation

```bash
npm run test:run
npm run lint
npm run typecheck
npm run config:validate
npm run doctor
```

See `docs/agent/NATIVE_APP_SHELL.md` for the architecture and security boundaries.
