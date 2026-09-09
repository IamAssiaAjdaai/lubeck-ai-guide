# CITYWALK Mobile

Expo + React Native traveler client for CITYWALK. The existing Next.js application remains the backend, public web, and Admin runtime.

## Local development

Use a development build; MapLibre React Native is not available in Expo Go.

```powershell
npm install
$env:EXPO_PUBLIC_CITYWALK_ENV="development"
$env:EXPO_PUBLIC_CITYWALK_API_ORIGIN="http://192.168.1.20:3000"
npm start
```

Use a LAN address reachable by the device and start the root Next.js application separately. No server secret belongs in the Expo environment.

Development builds declare only the native transport exceptions needed to reach
that LAN server: iOS local-network access and Android cleartext HTTP. Rebuild the
development client after changing native configuration. Preview and production
builds do not include these exceptions and require HTTPS API origins.

The map defaults to the same HTTPS OpenFreeMap Liberty style as CITYWALK Web.
`EXPO_PUBLIC_CITYWALK_MAP_STYLE_URL` may select another approved HTTPS style at
build time; it is public configuration and must never contain provider secrets.

## Validation

```bash
npm run test:run
npm run lint
npm run typecheck
npm run config:validate
npx expo-doctor
```

## EAS builds

Set the public API origin in the appropriate EAS environment, authenticate with an approved Expo account, then run:

```bash
npx eas-cli build --platform android --profile development
npx eas-cli build --platform ios --profile development
npx eas-cli build --platform all --profile preview
```

The iOS development build uses EAS cloud signing and device provisioning. Production bundle identifiers and store credentials remain provisional/unconfigured in CW-18.

See `docs/agent/NATIVE_APP_SHELL.md` for the architecture and security boundaries.
