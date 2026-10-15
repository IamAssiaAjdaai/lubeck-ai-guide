# CITYWALK — App-first Shareable Walks (stacked review)

This work is stacked onto **Draft PR #373**, not directly onto `develop`. No production deployment or database migration is included.

## Intended share journey

1. An authenticated sender completes a mobile (or web) walk. **Share** creates a backend `POST /api/shared-walks` record and checks anonymous `GET /api/shared-walks/:id` before exposing a link.
2. The stable invitation is `https://getcitywalk.com/shared-walk/:uuid`. It carries only an opaque ID, not a route, identity, visit history, GPS or auth credentials.
3. iOS Universal Links / Android verified App Links open `mobile/src/app/shared-walk/[id].tsx` when CITYWALK is installed and the live domain association is configured.
4. The native screen reads the guest route without cookies or login, shows the exact ordered published stops, and verifies server data again before creating a **native preview**. It doesn't run the personalized itinerary planner.
5. If there's an existing current walk in that city, the user must explicitly confirm before replacement. A concurrent edit blocks replacement, and a revoked/stale link does not change stored walks.
6. If the app isn't installed, the HTTPS URL stays usable in a browser as a route summary with **Open CITYWALK** and official App Store / Google Play links (only when configured). Starting the walk takes place inside the mobile app.

The native sender retains the original planned order in local walk storage, including stops skipped during progress. When a route is intentionally adapted, the tracked share order is updated.

## Before real users can install from an invite

- Release the native apps to their intended distribution channels; verify official URLs in `EXPO_PUBLIC_IOS_APP_STORE_URL` and `EXPO_PUBLIC_ANDROID_PLAY_STORE_URL`. **Never invent listing IDs**.
- Host the web app and shared-walk API on the approved `getcitywalk.com` domain.
- Configure `CITYWALK_APPLE_TEAM_ID` to serve a valid `/.well-known/apple-app-site-association`.
- Configure `CITYWALK_ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS` from actual app signing keys to serve `/.well-known/assetlinks.json`.
- Build and reinstall **preview/production** iOS/Android app binaries after the intent filters / associated domains change. Development `com.citywalk.app.dev` intentionally doesn't claim production Universal Links; use `citywalk://shared-walk/:uuid` for scheme testing instead.
- No automatic deferred deep link across store installation is promised: after installing, users reopen the original shared HTTPS link.

## Local verification

```bash
npm ci
npm run test:run -- src/lib/nativeAppHandoff.test.ts src/lib/nativeAppAssociation.server.test.ts src/components/walk/FinishWalkScreen.test.tsx
npm run lint
npm --prefix mobile ci
npm --prefix mobile run test:run -- tests/sharedWalk.test.ts tests/app-links-config.test.ts
npm --prefix mobile run typecheck
npm --prefix mobile run lint
```

Native link handling requires a freshly built native preview binary to test the associated domain. API sharing also requires a real **non-production HTTPS** backend with an isolated QA database and test accounts. Never use production Neon / Cloudflare credentials for these tests.

The original 14 passing web/database tests were executed on **PR #373's previous commit**. They do not validate this app-first branch; the new tests must be executed separately.
