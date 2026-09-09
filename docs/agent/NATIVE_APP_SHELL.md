# CW-18 Native App Shell ADR

Status: proposed implementation, awaiting independent review
Decision date: 2026-09-09

## Decision

CITYWALK uses two client runtimes over one trusted backend:

- the existing Next.js application remains the public web, Admin, API, server, database, CMS, AI/RAG, media, auth, commerce, and entitlement runtime;
- `mobile/` is a standalone Expo + React Native traveler application using Expo Router;
- mobile consumes the same published content and authenticated API boundaries as web;
- server-side publication, entitlement, source, media, and locale rules are not duplicated in the app.

The repository is deliberately not converted into an npm workspace in CW-18. A standalone nested package gives Expo its SDK-pinned React Native dependency graph while leaving Vercel's root install and build unchanged. Shared packages can be introduced when two clients have a stable, genuinely shared contract; doing that now would add Metro/workspace and release coupling without enough reuse to justify it.

## Why the Capacitor hosted-origin prototype was rejected

The reviewed Capacitor approach loaded the deployed website as the primary application UI. It proved a low-risk wrapper was possible, but it did not establish a native traveler experience, native navigation ownership, or a durable basis for background media and store-native purchases. It also coupled every core screen to hosted WebView availability.

The prototype remains preserved in the named `cw18-capacitor-prototype-review` git stash and is not part of this implementation.

## Why Expo + React Native

Expo SDK 57 supplies a current React Native 0.86/New Architecture foundation, development builds for custom native code, file-based Expo Router navigation, config plugins, foreground location, secure storage, and cloud iOS builds. React Native lets CITYWALK adopt platform interaction patterns rather than translating DOM/CSS or embedding the site.

Expo Go is not the production development strategy. MapLibre React Native contains custom native code, so CITYWALK uses `expo-dev-client` and EAS development builds.

## What is shared

The following remain single, server-owned systems:

- public city/place content APIs and publication/revision rules;
- PostgreSQL, Drizzle schema, CMS, and media/object storage;
- Better Auth users and server session validation;
- verified AI/RAG knowledge and attribution;
- products, payments, and entitlement state;
- private/premium media authorization;
- server-side analytics and trust boundaries.

Mobile owns a small typed DTO/parser layer for the public API response. It treats all network payloads as untrusted and does not import server/database modules into the native bundle.

## What is native UI

Home, city discovery, place detail, account entry, map, GPS controls, and future audio/tour surfaces are React Native screens/components under `mobile/src`. They are not WebViews and do not attempt pixel-for-pixel web CSS reuse. The initial design tokens mirror CITYWALK's semantic palette, spacing, radius, typography, buttons, cards, and screen container.

The initial proof supports English, German, and Arabic. The API keeps its existing authored/fallback locale metadata; native text direction follows the actual resolved content locale while application chrome follows the selected UI locale.

## Backend and environment strategy

`mobile/src/lib/api` centralizes the API origin, typed contracts, runtime validation, public requests, authenticated cookie forwarding, and relative media URL resolution.

- development permits HTTP or HTTPS and defaults to `http://localhost:3000`;
- physical-device development sets `EXPO_PUBLIC_CITYWALK_API_ORIGIN` to a reachable LAN/HTTPS development endpoint;
- the dynamic Expo config enables iOS local-network ATS access and Android
  cleartext traffic only for development builds;
- preview requires an HTTPS `*.vercel.app` origin;
- production requires a non-local HTTPS origin;
- there is no user-facing or remotely supplied runtime origin switch.

`EXPO_PUBLIC_` values contain only non-secret build configuration. Database, auth, media, AI, and commerce secrets remain in Next.js/Vercel.

## Authentication

The existing Better Auth backend remains authoritative. The server adds the official `@better-auth/expo` plugin and explicitly trusts the `citywalk://` callback scheme. The plugin's `exp://` origin is development-only; production application callbacks remain scoped to CITYWALK. The native client uses the official Expo client plugin with `expo-secure-store`; cookies/session cache are managed by the integration rather than raw tokens written by CITYWALK.

Authenticated API requests obtain the Better Auth cookie from the integration and forward it to the existing HTTPS backend. Email sign-up/sign-in and `citywalk://account` callback architecture are present, but every content screen remains guest-first. Staff RBAC remains unrelated and is never copied into the traveler client.

## Navigation and deep links

Expo Router owns a generic native route tree:

```text
/
/city/[citySlug]
/city/[citySlug]/place/[placeSlug]
/account
```

Route identity validation is generic and rejects malformed slugs. Lübeck is only the current live API result; no shared navigation or component assumes it is the only city. The `citywalk` scheme provides deep-link callbacks and future universal-link routing.

## Map and GPS

The proof uses MapLibre React Native with the same OpenFreeMap Liberty style
already configured as the Web map default. It is not MapLibre's demo-tile
service. The production map provider/style and its operating terms must be
reconfirmed before Store Beta; no provider credential is invented in CW-18.
MapLibre's config plugin requires a development build and provides native maps
on iOS and Android. Published API coordinates create place markers.

`expo-location` requests foreground permission only after the visitor presses the location control, then performs one current-position request. Denied, unavailable, and failure states leave the map and place list usable. No background permission, continuous trail, location persistence, account attachment, commerce property, or raw-coordinate analytics exists.

## Commerce boundary

The native client can authenticate to existing generic entitlement-aware APIs, but native purchase initiation is explicitly unavailable until #108. CW-18 does not reuse Stripe Checkout as an App Store/Play purchase flow.

The future provider boundary is:

```text
web -> Stripe
ios -> Apple in-app purchase provider
android -> Google Play Billing provider
        -> shared server entitlement engine
```

Product, receipt validation, and entitlement decisions remain server-owned.

## Audio and future background behavior

CW-18 does not implement persistent tour audio (#64). Expo/React Native permits a future `expo-audio`-based player with background playback configuration and platform lock-screen/media controls. That work must preserve exact-locale and approved-media rules and should be added only with explicit iOS/Android background-mode review.

## EAS strategy

`mobile/eas.json` defines:

- `development`: internal development client;
- `preview`: internal installable build;
- `production`: future store artifact with remote versioning.

Typical commands from `mobile/` are:

```bash
npx eas-cli build --platform android --profile development
npx eas-cli build --platform ios --profile development
npx eas-cli build --platform all --profile preview
npx eas-cli build --platform all --profile production
```

The public API origin must be supplied as the appropriate EAS build environment variable. No signing credentials, Expo project owner/project ID, Apple team ID, Google service key, or store account is committed. Windows/iPhone development uses an EAS cloud iOS development build; a real iPhone build still requires an Expo project, an Apple Developer Program team, registered device provisioning, and an authenticated EAS build.

## Future implications

- Expand native UI translation coverage from the proven EN/DE/AR foundation to the full supported locale set.
- Add native audio/background and download/offline boundaries in dedicated tickets.
- Add store purchase providers and verified receipt processing in #108.
- Decide whether stable cross-client DTO schemas justify a small shared package after the mobile API surface grows.
- Add EAS project identity, owned bundle IDs, signing, universal links, privacy manifests, and store metadata before #33 beta distribution.
