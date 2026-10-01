# Unlock Lübeck Phase 2 — sandbox implementation review

2026-09-28; local `feat/premium-luebeck`, base `cba060b4d54e545b6476e088d15d4b8599510c32`. This report supersedes the Phase 1 implementation-status statements in [README](README.md), while preserving that audit/history. No commit, push, native build, deployment, remote migration, environment change, Store configuration or customer charge performed. Disposable loopback database fixtures are automated evidence only. Neither iOS nor Android Store/device acceptance is claimed.

## A–B. Dependency and native integration

Pinned `expo-iap` **5.8.1**; installed Expo **57.0.25**, React Native **0.86.3**. The [Expo IAP setup guide](https://www.openiap.dev/docs/setup/expo) supports this Expo/RN baseline. The actual installed API types were used for product metadata, event listeners, ownership queries, account tokens and finishTransaction. This is source/type compatibility, not a successful native build. `expo-iap` was added to Expo plugins; no prebuild or generated native tree was run/added. Root verifier dependencies: Apple's official library **3.1.0**, Google auth library **11.1.0**. Both lockfiles retain Better Auth **1.7.2**. npm reports the Apple library's transitive `jsrsasign@11.1.5` as deprecated/unmaintained; an upstream dependency/security review remains required before production release. No custom cryptographic implementation substitutes for signed Store validation.

The old installed Development Client lacks this newly added native module until rebuilt. Runtime import is lazy and missing-module errors become unavailable state. The library's exported JavaScript diagnostic logger is silenced before use to avoid printing Store payloads. No edits to node_modules source. One billing connection/listener pair is shared across screens; duplicate taps are serialized. App launch, auth changes and foreground recovery query owned purchases without opening a purchase sheet. SDK receipt/token objects are kept only in process memory, never in persistent local storage or logs.

## C–F. Verification, ledger and ownership

Authenticated POST `/api/commerce/city-unlock/lubeck` accepts only `store` and `proof`; user identity comes from the server session and is checked against the account-switch header. Same-origin browser checks, a 32 KB JSON body cap, a 24 KB proof cap and a fail-closed per-account Redis verification limit apply. Client price/status/entitlement claims are not accepted. GET returns a fresh no-store entitlement read.

Sandbox server configuration is explicit; Production Vercel environments are refused. Only allowlisted CITYWALK sandbox users can obtain billing context or activate/use the new canonical sandbox grants. Legacy Stripe pass behavior remains separate. No test grant confers Production access.

Apple: official `SignedDataVerifier` verifies chain/signature, bundle and Sandbox environment using operator-provided Apple trust roots and online checks. Submitted evidence is then refreshed through the authenticated Sandbox App Store Server API, and the returned transaction is verified again. Exact product, Non-Consumable type, purchased ownership (not Family Sharing), quantity, original identity and account token are checked. Native purchase additionally checks AppTransaction's Sandbox environment and `com.citywalk.app` bundle. [Apple verification reference](https://apple.github.io/app-store-server-library-node/classes/SignedDataVerifier.html).

Google: server credentials query ProductPurchaseV2 for the fixed package `com.citywalk.app`; exact product, quantity one, test-payment context, PURCHASED state, non-refunded quantity and obfuscated account binding are required. Pending is not a grant. Both the native context and operator instructions leave Google purchases disabled until approved license-test setup. [Google ProductPurchaseV2](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.productsv2).

Account binding is a stable HMAC-derived UUID from server identity and a dedicated sandbox secret: Apple `appAccountToken`, Google `obfuscatedAccountId`. It reveals neither email nor raw account ID. Keep that secret stable: rotation requires a separately reviewed ownership-binding migration; do not rotate it casually. Client-supplied account tokens cannot override it. Binding mismatch or an existing order owned by another account gives explicit, localized ACCOUNT_CONFLICT and never transfers ownership.

The **existing ledger** is reused:

- provider `apple_sandbox` or `google_test`;
- order `providerPaymentIntentId` is SHA-256 of Apple originalTransactionId / Google purchaseToken, scoped by provider;
- existing unique provider/transaction constraint plus transaction-scoped PostgreSQL advisory lock prevents races across accounts;
- one paid order, feature grant `city:luebeck:premium`, and deduplicated verification event;
- sandbox product is inactive in the public commerce catalog; no parallel purchase ledger;
- a missing grant can be reconstructed for the same paid owner, but an existing revoked grant is never reactivated.

Migration `0015_majestic_lake.sql` relaxes price/currency/amount nullability **only with a compensating constraint**: either all three financial fields are known, or all are absent on the two sandbox native providers. No fake Store price, receipt-derived tax or invented EUR amount is persisted. Existing Stripe rows still require all financial fields. Admin formatting shows absent amount as `—`. The migration changes constraints, deletes no data, and creates no second ledger. Generated Drizzle snapshot/journal accompany it. It has only been applied to newly created disposable loopback test databases; remote application remains unverified and requires approval.

## G–I. Delivery, restore and revocation

Flow: current provider verification → account binding → transactional order/event/grant → Google acknowledgement when applicable → fresh authoritative access read → client finishTransaction. Native UI performs its own fresh access read before showing unlocked and again before a fresh Start. A failed delivery never finishes the Store transaction. If Google was acknowledged previously, the retry checks its current acknowledgement state and does not require a second successful ack. An ack response lost in transit is rechecked.

Restore never invokes purchase. It invokes platform restore/re-query, deduplicates evidence, verifies current ownership and delivers idempotently. Nothing-to-restore, unavailable/network failure, account conflict and revoked ownership have distinct handling. Before a new purchase attempt, existing Store ownership is queried first, recovering a charged but undelivered purchase. Duplicate taps/events share connection and in-flight delivery work.

Apple V2 endpoint `/api/commerce/native/notifications/apple` verifies outer notification and nested transaction signatures. Google endpoint `/api/commerce/native/notifications/google` verifies Google OIDC audience and verified service-account email, package, and current purchase with Google. Neither success notification can grant or resurrect ownership. Refund/revocation writes a terminal provider/transaction tombstone even if it arrives before the original delivery; the exact order's grant is revoked in the same transaction. Repeated and out-of-order old success events cannot reactivate it.

**External operation is still blocked/unverified.** No notification URL, Apple key/trust-root set, Google service account, Pub/Sub subscription or Store product was configured. Real notification delivery/retry, Store cancellation/refund and recovery after device loss have not been exercised. There is no unattended server acknowledgement outbox or scheduled missed-notification reconciliation: current recovery depends on Store replay/launch/resume/restore and configured notification delivery. Provider unavailability returns a retryable failure; no fabricated revocation/success. Refund reversal/new purchase after terminal revocation needs separate policy/testing. Keep real charging blocked until those operational gaps and Store evidence are accepted.

## J–K. Access and truthful copy

Free Explore, planning, Preview and existing sample tour stay available. Purchase/restore requires an account. Signing in returns to the same Preview and does not buy automatically; the owner must confirm purchase. No route regeneration or saved-walk/account lifecycle changes. A fresh premium Start requires online server access; an already active walk continues with its existing local data through temporary network loss. No permanent local `isPremium` or offline entitlement lease was added.

The paywall's five benefits (all six launch catalogs plus retained Arabic):

- Your day, planned around you
- Change plans without starting over
- Stories where available in your language
- Ask CITYWALK for local help during your walk
- Curated discoveries along the way

Title **Unlock Lübeck**, subtitle **Lübeck, made personal.**, CTA **Unlock Lübeck — {Store localized price}**, secondary **Restore purchases / Not now**. Existing content/language/service qualifications stay visible. Missing product metadata never displays a fallback €6.99. No claim of unlimited AI, complete audio, attraction/transport admission or full offline Premium. Arabic remains hidden in the launch selector. Conflict/revoked strings are shared i18n, with no new component dictionaries.

## L. App Store Connect sandbox operator checklist — not executed

1. Use the existing CITYWALK app with bundle `com.citywalk.app`. Verify team/app ownership and agreements without changing the bundle to `.dev`.
2. Create/verify **Non-Consumable** `com.citywalk.luebeck.premium`. Set the Germany target to €6.99; use Store localization/tax price metadata at runtime. Keep app/product unreleased and do not submit or enable customer sale.
3. Supply localized Store metadata below and the required review screenshot when an approved sandbox build exists. Review notes: “One-time CITYWALK city experience; account required for durable restoration; no admission or transport; stories depend on locale/content; sandbox tester flow starts from a planned Lübeck route.”
4. Create a dedicated App Store Connect sandbox tester, test storefront Germany, and use a physical iPhone with sandbox account setup. Never use a real purchase as a shortcut.
5. Generate/authorize App Store Server API access server-side. Configure Sandbox API key/issuer and authentic Apple PKI roots from Apple's official PKI source. Do not embed signing material in mobile or repository.
6. Configure V2 Sandbox notifications to the approved isolated Preview URL; perform Apple's signed TEST notification and actual refund/revocation acceptance.
7. Verify provisioning/signing and StoreKit capability using the correct App ID; the Expo IAP plugin handles the native integration. No Apple Pay entitlement is needed for this in-app product. Native build/signing acceptance remains pending.

| Locale | Product name | Description |
| --- | --- | --- |
| EN | Unlock Lübeck | A personal city walk, adaptable plans and stories where available in your language. |
| DE | Lübeck freischalten | Dein persönlicher Stadtspaziergang mit flexiblen Plänen und Geschichten, soweit in deiner Sprache verfügbar. |
| DA | Lås Lübeck op | Din personlige byvandring med fleksible planer og historier, hvor de findes på dit sprog. |
| SV | Lås upp Lübeck | Din personliga stadspromenad med flexibla planer och berättelser där de finns på ditt språk. |
| NL | Ontgrendel Lübeck | Je persoonlijke stadswandeling met flexibele plannen en verhalen waar beschikbaar in jouw taal. |
| ES | Desbloquear Lübeck | Tu paseo personal con planes flexibles e historias cuando estén disponibles en tu idioma. |

Descriptions are draft operator copy; apply Store field limits during setup without adding broader promises. Arabic compatibility is retained in-app, not a new launch storefront claim.

## M. Google Play sandbox preparation — not executed

Use `com.citywalk.app`, a one-time non-consumable `com.citywalk.luebeck.premium`, the same six localized metadata meanings and target pricing. Link the authorized service account to this app with the minimum purchase read/ack permissions. Configure test-track/license testers and use **test payment methods only**. Confirm the package/signature/product setup before enabling `CITYWALK_GOOGLE_TEST_PURCHASES=1`. Without verified tester enrollment, opening a Google Store sheet could offer real payment even though the backend would reject it; leave the flag off. Configure RTDN Pub/Sub authenticated push with a dedicated verified service-account email and exact endpoint audience. Exercise purchased/pending/cancelled/refunded/repeated-notification flows. No APK/AAB or track upload was performed; Android physical and billing acceptance are UNVERIFIED.

## N. Build/configuration gate

**NEW EAS BUILD REQUIRED: YES.** `billing-sandbox` is an internal development-client profile with `EXPO_PUBLIC_CITYWALK_ENV=preview`, `EXPO_PUBLIC_CITYWALK_BILLING=sandbox` and the opt-in gate enabled. App config selects **com.citywalk.app** for iOS and Android; existing `.dev` profile remains separate. No permanent build-profile backend origin was guessed or changed. Supply an explicitly approved isolated HTTPS `EXPO_PUBLIC_CITYWALK_API_ORIGIN` before configuration/build; sandbox config rejects a missing origin or embedded credentials. The profile intentionally does not inherit the existing develop Preview URL.

Server-only variables required on that isolated Preview (values never in this document):

- `CITYWALK_NATIVE_BILLING_MODE=sandbox`, `CITYWALK_NATIVE_ACCOUNT_SECRET` (stable independent secret, ≥32 characters), `CITYWALK_NATIVE_SANDBOX_USERS` (approved test accounts).
- Apple: `CITYWALK_APPLE_PRIVATE_KEY`, `CITYWALK_APPLE_KEY_ID`, `CITYWALK_APPLE_ISSUER_ID`, `CITYWALK_APPLE_ROOT_CERTIFICATES` (JSON array of base64 DER official Apple roots).
- Google later: `CITYWALK_GOOGLE_SERVICE_ACCOUNT`, `CITYWALK_GOOGLE_TEST_PURCHASES`, `CITYWALK_GOOGLE_PUSH_AUDIENCE`, `CITYWALK_GOOGLE_PUSH_EMAIL`.
- Existing isolated database, auth and Redis bindings must pass the usual identity/scope preflight. These were not pulled, modified or deployed in this task.

After separate review/approval: configure isolated backend → apply reviewed migration via approved deployment → verify auth/context/notification health → verify sandbox Store product/tester/signing → approve internal EAS build → `eas build --platform ios --profile billing-sandbox` from mobile. This command is a future operator step, not executed here. No TestFlight, public release, customer charging or automatic deployment is authorized.

**SAFE TO BUILD IOS SANDBOX CLIENT: NO at this handoff** until the approved isolated API origin, deployed verifier/migration, Apple sandbox credentials/product/tester and matching signing are verified. Source preparation is not those checks. Production charging remains blocked for all the above operational gaps, missing real refund/restore evidence, Android test acceptance, content promise review and dependency security review.

## O. Exact source inventory and preservation

See [the exact 60-path Phase 1 + Phase 2 inventory](phase-2-files.md). It includes native adapter/recovery/paywall tests and configuration, shared registry/catalogs, server verification/context/notification routes, existing ledger compatibility, migration/snapshot, database runners and this evidence. No source was staged. Held public-content cache files and the owner's root `tsconfig.json` match their initial hashes; stash remains unchanged. No private env, signing or generated native build files are in this change set.

Local dependency installation pruned extraneous root modules. The owner's pre-existing root `tsconfig.json` extends Expo; its contents were preserved, and an ignored `node_modules/expo` link to the existing mobile installation restored local resolution. Expo was **not** added to root package dependencies. The committed root config has no such Expo requirement. Both lockfiles preserve Better Auth 1.7.2; the pre-existing transitive Google auth library changes from 11.0.2 to the now-explicit server dependency 11.1.0. No other existing package version changes were found in the lockfile comparison.

No Store receipt, purchase token, raw provider error, account secret, signing key or authenticated URL was written to logs/docs. The secret-pattern scan identified only the repository's synthetic loopback PostgreSQL defaults in the isolated test runners. Normal Vite config/deprecation warnings remain; no test timeout was increased and no assertion was weakened to hide a failure.

## P–Q. Final automated validation

All results below are local; external Store calls are mocked in automated provider/SDK tests. They do not establish a successful signed sandbox purchase, notification delivery or physical UI acceptance.

| Exact command | Final result |
| --- | --- |
| `npm run test:run -- --maxWorkers=2` | **Exit 0**; **934 passed / 57 skipped**, **152 passed / 8 skipped files** (160 total), 392.25 s. The final complete command itself is green; no isolated rerun substitutes for it. |
| `npm --prefix mobile run test:run -- --maxWorkers=2` | **Exit 0**; **592 passed**, **64 files**, no skips, 134.51 s. |
| `node scripts/test-native-billing.mjs` | **Exit 0**; **10 passed / 1 file**, new disposable loopback DB, migrations applied/reapplied and cleaned up. |
| `node scripts/test-account-saved-walks.mjs` | **Exit 0**; **13 passed / 1 file** plus migration upgrade/rerun and preservation assertions. |
| `node scripts/test-account-lifecycle.mjs` | **Exit 0**; **12 passed / 1 file**, disposable local DB removed afterward. |
| `npx tsc --noEmit` | **Exit 0**, root. |
| `npm --prefix mobile run typecheck` | **Exit 0**. |
| `npm run lint` | **Exit 0**. |
| `npm --prefix mobile run lint` | **Exit 0**, zero warnings allowed. |
| `npm run i18n:check` | **Exit 0**, **531 keys × 7 locales**, zero errors. |
| `npm run db:generate` (after intended migration generation) | **Exit 0**, “No schema changes, nothing to migrate”; no second migration. |
| `git diff --check` | **Exit 0**. |

The full root suite's 57 skipped tests remain explicit opt-in integrations; this task separately executed the 35 relevant native-billing/saved-walk/lifecycle integration tests above. It did not claim the other skipped suites passed. Journal entries 0000–0014 are unchanged; only 0015 is appended.

Iteration evidence: the first bounded root command also exited 0 (928 passed / 57 skipped), before six additional provider/ack tests were included in the final run. The first full mobile command failed one suite at import because its React Native mock lacked `Platform` (530 tests passed in the other 63 files). Adding the missing mock export fixed the harness; the unchanged 60 walk-flow assertions passed, followed by a green 590-test full mobile run. Two late-pending-cancellation regressions then brought the final complete run to 592. No assertion removal or timeout increase. Initial local DB execution was blocked by the process sandbox; the same loopback-only runner passed with authorized local-network access, without changing its target.

Focused iterations (subsets, **not additional unique coverage**): server normalization/service/route/access 26; signed-notification orchestration 6; provider current-state/ack retry 5; native adapter/controller/gate/access 48; walk-flow 60. The final full commands include the subsequent regression additions.

## R–S. Acceptance gate and remaining charging blockers

**SAFE TO BUILD IOS SANDBOX CLIENT: NO** until the N-section operator prerequisites are verified and the owner approves a build. **Real charging: BLOCKED.** No App Store/Play Console setup, server credentials, approved isolated billing endpoint, ad-hoc signing/device enrollment or real Store transaction evidence was verified here. Notifications are implemented but not wired or operationally exercised. Background acknowledgement/outage reconciliation and refund reversal policy remain open; the SDK's transitive maintenance warning also needs release review.

After an approved deployment/build, owner acceptance must independently record: Store-localized price; no product fallback price; guest → auth → same Preview with no auto-purchase; explicit sandbox purchase → durable grant → explicit Start; cancellation; pending and later cancellation/completion; duplicate tap; forced delivery failure then launch/resume recovery without a second charge; restore on the same account; empty restore; wrong CITYWALK account conflict without transfer; signed refund/revocation denying a fresh Start; already active walk surviving temporary offline; free Explore/planner/Preview; Saved Walk and lifecycle regressions. Repeat separately on Android when its sandbox setup is approved. Never infer a physical PASS from these automated tests.
