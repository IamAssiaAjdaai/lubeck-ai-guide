# CITYWALK Store Privacy & Data Safety Draft

Status: **DRAFT — DO NOT SUBMIT YET**

Release baseline reviewed: `develop` at `b91830f2c7181c318ea05e7fea6f1d4df6855f2b`.

This document translates the implementation-derived CITYWALK data inventory into a draft for:

- Apple App Store App Privacy;
- Google Play Data Safety.

It is a preparation artifact only. It does **not** authorize App Store Connect / Play Console submission, production analytics, RevenueCat/store activation, billing activation, or a production release.

Source of truth: `docs/legal/CITYWALK-DATA-INVENTORY.md`.

## 1. Stable public URLs

| Store field | Draft CITYWALK URL | Status |
| --- | --- | --- |
| Privacy Policy | https://getcitywalk.com/privacy | Implemented |
| Support | https://getcitywalk.com/support | Implemented |
| Account deletion | https://getcitywalk.com/account-deletion | Implemented |
| Apple User Privacy Choices | https://getcitywalk.com/privacy | Candidate; review immediately before submission |

The optional Apple Privacy Choices URL should point to the privacy page only if the exact release still links users to the implemented account deletion, data access/export and analytics-consent controls described there.

14 October deployment audit: “Implemented” in this table means code exists, not that the URL has passed production acceptance. `/privacy` returned 404 on the production domain during this audit. Operator identity, reviewed disclosures, actual production URL acceptance and exact release artifacts remain blockers; follow `docs/deployment/LEGAL-LAUNCH-READINESS.md` before submission.

## 2. Release facts that drive the declarations

Confirmed in the reviewed code:

- CITYWALK is guest-first; creating an account is optional for basic exploration.
- Account users can provide a display name and email address and receive a Better Auth user ID.
- Account-saved walks are retained server-side and linked to the account.
- A random native visitor UUID is stored locally for up to 180 days and is transmitted for AI allowance / continuity; the server retains a HMAC-derived identifier hash for rate limiting for up to 48 hours.
- Native precise location is used for nearby / Live Walk behavior and can be persisted locally in Live Walk state; the reviewed path does not intentionally transmit raw GPS coordinates off-device.
- AI Guide questions and limited recent conversation context are transmitted to CITYWALK and then Groq to service the request. CITYWALK does not persist prompt/answer content in PostgreSQL in the reviewed route. Production Groq retention remains unresolved.
- Native Marketing analytics is fail-closed. Marketing attribution is not persisted and native funnel events are not sent until explicit native analytics consent is granted.
- The reviewed native Marketing funnel sends validated city/campaign attribution and `walk_started` / `walk_completed` events with a fixed aggregate analytics identifier, not a CITYWALK user ID or raw GPS.
- RevenueCat is integrated in code but production purchase behavior remains conditional on store / RevenueCat configuration under #227.
- When RevenueCat is active, CITYWALK logs in authenticated purchasers with the immutable Better Auth user ID.
- No reviewed code requests ATT, reads IDFA, calls RevenueCat `collectDeviceIdentifiers()`, or integrates an advertising-ID attribution SDK.
- Microphone recording is disabled by the Expo audio configuration.
- Push notifications are disabled by the Expo widgets configuration.

## 3. Apple App Privacy draft

Apple's form must describe data collected by CITYWALK **and third-party partners**. Data that stays only on-device is not treated here as collected. Apple also has a service-request exception for data transmitted off-device but not retained beyond servicing the request; that exception must not be used for Groq until production provider retention is confirmed.

### 3.1 Draft data types

| Apple data type | Draft status | Linked to user? | Used for tracking? | Draft purpose(s) | CITYWALK basis |
| --- | --- | --- | --- | --- | --- |
| Contact Info → Name | **DECLARE** | Yes | No | App Functionality | Optional account profile display name |
| Contact Info → Email Address | **DECLARE** | Yes | No | App Functionality | Account login, verification, reset and deletion workflows |
| Identifiers → User ID | **DECLARE** | Yes | No | App Functionality | Better Auth account ID; also RevenueCat custom App User ID when native purchases are active |
| Identifiers → Device ID | **REVIEW BEFORE SUBMISSION** | Potentially | No | App Functionality / security | CITYWALK uses a random app-scoped native visitor UUID for guest AI allowance. It is not IDFA or a hardware identifier. Confirm Apple classification against the final privacy report. |
| Purchases → Purchase History | **CONDITIONAL ON #227 / REVENUECAT ACTIVATION** | Yes for signed-in users | No | App Functionality; Analytics if required by final RevenueCat setup | RevenueCat requires Purchase History disclosure when used; CITYWALK also reconciles store purchase/subscription state |
| Usage Data → Product Interaction | **DECLARE** | Yes | No | App Functionality; Analytics | Account-saved walks are retained server-side; consented native Marketing events also measure walk funnel interaction |
| User Content → Other User Content | **CONDITIONAL — VERIFY GROQ RETENTION** | Review | No | App Functionality | AI Guide questions and limited history leave the device; CITYWALK does not persist them in PostgreSQL, but provider retention is not yet fixed |
| Location → Precise Location | **DO NOT DECLARE AS COLLECTED on current reviewed path** | — | No | — | Location permission exists, but raw native GPS is used/persisted locally and is not intentionally transmitted off-device |
| Diagnostics → Crash Data / Performance Data | **DO NOT DECLARE on current reviewed native runtime** | — | No | — | No reviewed native crash/diagnostic analytics collection path |
| Customer Support | **REVIEW ONLY IF SUPPORT MOVES IN-APP / CONTROLLED WEBVIEW** | — | No | App Functionality | Current native Support destination opens the public support page rather than collecting a support message inside the native app |

### 3.2 Tracking answer

Draft: **No, CITYWALK does not use collected data for tracking as Apple defines it.**

Evidence in the reviewed release:

- no ATT integration;
- no IDFA access;
- no RevenueCat device-identifier collection helper;
- no advertising-ID attribution SDK;
- first-party Marketing analytics uses explicit CITYWALK consent and a fixed aggregate funnel identifier.

Re-open this answer if #227 or later Marketing work enables IDFA, deferred deep-link attribution, cross-company advertising measurement, data broker sharing, or any third-party SDK that combines CITYWALK data with other companies' app/site data.

### 3.3 Apple URLs

- Privacy Policy URL: `https://getcitywalk.com/privacy`
- Candidate User Privacy Choices URL: `https://getcitywalk.com/privacy`
- Support URL candidate: `https://getcitywalk.com/support`

Do not publish App Privacy answers until the final Xcode privacy report / merged third-party privacy manifests for the exact release build have been reviewed.

## 4. Google Play Data Safety draft

Google defines collection as data transmitted off-device, including data transmitted by SDKs. Data that remains only on-device is not collected for the Data Safety section. Ephemeral off-device processing still needs to be considered in the form even when it may qualify for Google's ephemeral-processing treatment.

### 4.1 Top-level draft answers

| Question | Draft answer | Condition |
| --- | --- | --- |
| Does the app collect or share required user data types? | **Yes** | Account, AI, saved-walk and analytics flows transmit data off-device |
| Is collected user data encrypted in transit? | **YES CANDIDATE — VERIFY EXACT RELEASE ENDPOINTS** | Production API/provider endpoints must all remain HTTPS/TLS |
| Can users request deletion? | **Yes** | In-app deletion + public account-deletion page are implemented |
| Does the app share user data? | **NO CANDIDATE / VERIFY PROVIDER ROLE** | Treat processors acting solely as service providers as collection, not sharing; re-check final DPAs/integrations |

### 4.2 Draft data types

| Google data type | Collected? | Required or optional? | Draft purpose(s) | Sharing draft | CITYWALK basis |
| --- | --- | --- | --- | --- | --- |
| Personal info → Name | Yes | Optional | Account management; App functionality | No candidate | Optional account profile |
| Personal info → Email address | Yes | Optional | Account management; App functionality; Fraud prevention/security | No candidate | Login, verification, reset/deletion lifecycle |
| Personal info → User IDs | Yes | Optional for account users | Account management; App functionality; Fraud prevention/security | No candidate | Better Auth user ID; account linkage |
| Device or other IDs | **Yes — conservative draft** | Automatic when guest AI identity is used | App functionality; Fraud prevention/security | No candidate | Random app-scoped native visitor UUID transmitted for AI allowance; derived identifier hash retained 48h |
| Financial info → Purchase history | **CONDITIONAL ON #227 / REVENUECAT ACTIVATION** | Required for users making native purchases | App functionality; Analytics | No candidate unless a non-service-provider integration is enabled | RevenueCat official guidance requires Purchase History when RevenueCat is used |
| App activity → App interactions | Yes | Mixed: saved-walk account functionality; Marketing analytics optional | App functionality; Personalization; Analytics; Advertising or marketing for consented campaign measurement | No candidate | Server-held saved walks + consented `walk_started` / `walk_completed` campaign funnel |
| App activity → Other user-generated content | Yes | Optional | App functionality; Personalization | No candidate | AI Guide question and limited conversation history are transmitted off-device |
| Location → Precise location | **No on current reviewed path** | User-controlled permission, but local-only | — | — | Native coordinates are not intentionally transmitted off-device |
| App info & performance → Crash logs / Diagnostics | **No on current reviewed native runtime** | — | — | — | No reviewed native crash/diagnostics collection path |
| User payment info | **No** | — | — | — | Store/payment provider collects payment instrument details directly; CITYWALK does not access card/bank details |

For AI Guide "Other user-generated content", finalize the ephemeral-processing answer only after Groq's production data-retention/training configuration is fixed.

### 4.3 Google security / deletion evidence

- Public deletion resource: `https://getcitywalk.com/account-deletion`
- In-app self-service deletion: implemented and tested
- Self-service server-held account export: implemented
- External RevenueCat erasure outbox: implemented
- Apple sign-in token revocation outbox: implemented
- Transport-encryption answer must be verified against the exact release endpoints before submission

## 5. What remains conditional before these answers become final

Do **not** copy this draft into App Store Connect or Play Console until all of the following are resolved against the exact release build:

1. #227 Store sandbox acceptance: Apple / Google / RevenueCat products, public SDK keys and sandbox purchase behavior.
2. Final RevenueCat production configuration and whether any attribution/device-identifier integration is enabled.
3. Final PostHog production project configuration and provider-side retention.
4. Native Marketing attribution maximum lifetime while consent remains granted.
5. Groq production retention/training configuration.
6. Exact release Xcode privacy report / third-party privacy manifests.
7. Exact Android merged manifest and permissions for the release artifact.
8. Final release bundle/package identifiers; the reviewed Expo config still uses development identifiers.
9. Final production server/log/backup/support retention decisions where they affect public disclosures.
10. Confirmation that every production processor remains a service provider for Google Data Safety "sharing" classification, or update the Sharing answers.

## 6. Current permissions / SDK facts to re-check in the release artifact

Reviewed Expo configuration currently includes:

- iOS Sign in with Apple entitlement;
- foreground location permission text;
- iOS background-location capability for active-walk behavior;
- Android foreground location from `expo-location`; Android background location is disabled;
- microphone recording disabled;
- push notifications disabled;
- `expo-iap`;
- `react-native-purchases` (RevenueCat);
- Better Auth + SecureStore;
- no reviewed ATT / IDFA code.

A permission existing in the binary does not by itself mean the corresponding data is "collected" for store privacy declarations. The final answers must reflect whether data leaves the device and how it is retained/used.

## 7. Submission rule

This file is a controlled draft, not legal advice and not a store submission record.

Before submission:

- diff this file against `CITYWALK-DATA-INVENTORY.md`;
- inspect the exact release artifact;
- verify third-party provider settings;
- resolve every **CONDITIONAL** / **REVIEW BEFORE SUBMISSION** item;
- then produce the final App Store Connect and Play Console answers from the same reviewed snapshot.

## 8. Official references reviewed

- Apple App Privacy:
  https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy
- Apple App Privacy data types / collection guidance:
  https://developer.apple.com/app-store/app-privacy-details/
- Apple privacy / ATT:
  https://developer.apple.com/app-store/user-privacy-and-data-use/
- Google Play Data Safety:
  https://support.google.com/googleplay/android-developer/answer/10787469
- RevenueCat Apple App Privacy:
  https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy
- RevenueCat Google Play Data Safety:
  https://www.revenuecat.com/docs/platform-resources/google-platform-resources/google-plays-data-safety
