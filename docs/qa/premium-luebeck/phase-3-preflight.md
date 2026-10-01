# Unlock Lübeck — Phase 3 security preflight (historical)

Follow-up: [Phase 3A](phase-3a-google-gate.md) implements the server gate and records current validation. The original finding and stop decision below are retained as historical evidence.

2026-09-28. Branch `feat/premium-luebeck`; HEAD `cba060b4d54e545b6476e088d15d4b8599510c32` plus the existing uncommitted Phase 1/2 implementation.

**STOPPED at the requested source/security review gate. SAFE TO BUILD IOS SANDBOX CLIENT: NO.** No implementation was staged, committed, pushed or deployed. No environment, Store configuration, database, credentials or entitlement was changed. No EAS build was run. Production and develop were untouched.

## Proven blocker: Google enablement is not enforced at delivery

`src/lib/commerce/native/config.server.ts:35` reports Google availability only when configuration exists and `CITYWALK_GOOGLE_TEST_PURCHASES === "1"`. However, `src/lib/commerce/native/service.server.ts:8–12` checks only the sandbox/tester gate before calling the provider and durable entitlement delivery. The Google provider checks sandbox mode and credentials, but not this enablement flag.

An allowlisted user with a valid, correctly bound Google test purchase could therefore reach server delivery even when the context endpoint reports Google disabled. This is an enablement-boundary defect, not evidence of forged receipt acceptance, a Production purchase, or an actual unauthorized entitlement in the database. Missing Android Console setup alone is not the blocker for iOS; this server inconsistency is.

An isolated synthetic-port regression set the flag to `0`, confirmed `sandboxContext(...).stores.google === false`, and expected `verifyAndDeliver` to reject `UNAVAILABLE` before provider or ledger work. It instead resolved `{ delivered: true, active: true }`.

- Command: `npm run test:run -- src/lib/commerce/native/phase3-review.local.test.ts --maxWorkers=1`
- Result: **1 failed test / 1 failed file**, exit 1. No real provider, database or network operation was performed by the test.
- The temporary test was removed after the review; its reproduction and output remain outside the repository. No failing scratch test was added to the feature.

Required next correction: enforce store enablement server-side before purchase verification/delivery, with regressions for absent/disabled Google flags, absent configuration, explicitly enabled Google and unaffected Apple behavior. Review revocation-only notification handling separately so disabling new purchases does not accidentally prevent revocation of existing grants. Do not proceed to commit/infrastructure until that correction is reviewed and validated.

## Dependency review

Read-only `npm audit --omit=dev --json` was run from both root and mobile. The initial sandbox network attempt could not obtain advisories; the authorized network retry returned the results below. No install, upgrade or audit fix was performed.

| Scope | Moderate entries | High | Critical |
| --- | ---: | ---: | ---: |
| Root | 4 | 0 | 0 |
| Mobile | 15 | 0 | 0 |

These counts include dependent-package/metavulnerability entries, not that many independent exploits. Root findings follow the Drizzle tooling/esbuild development-server chain ([GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)). Mobile findings include malformed URI decoding denial of service ([GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr)) and UUID buffer-writing bounds ([GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)), with inherited Expo/tooling dependency chains. Exploitability in CITYWALK needs separate applicability analysis; no automatic dependency changes are justified by these counts alone.

No advisory was returned for the reviewed `expo-iap` 5.8.1, Apple server library 3.1.0, Google auth library 11.1.0 or Apple library's `jsrsasign` 11.1.5 dependency in these audits. The earlier jsrsasign deprecation warning remains a maintenance concern, not proof of a known exploitable issue. npm auditing does not certify CocoaPods/Gradle dependencies or native runtime behavior. Reviewed upstream sources: [Apple library security](https://github.com/apple/app-store-server-library-node/security), [OpenIAP security](https://github.com/hyodotdev/openiap/security).

Both lockfiles retain Better Auth **1.7.2**. The existing root Google auth dependency moves from transitive 11.0.2 to direct 11.1.0 as part of Phase 2; no broad existing mobile version upgrade was found. Native OpenIAP versions are pinned by the installed expo-iap package. No dependency changes were made during this review.

## Other reviewed boundaries

- Apple uses the official signed-data verifier, configured trust roots, online verification, the Sandbox server API, and exact bundle/product/account binding. Current transaction ownership is fetched again rather than trusting client state. No live Apple transaction or credential acceptance was tested.
- Native transaction identities are hashed and provider/environment-qualified; raw proofs are not stored by the inspected ledger. Transaction locks, existing unique indexes and same-owner replay handling prevent duplicate grants. Other-owner replay conflicts. Revocation before delivery is recorded, and an older success cannot revive a revoked grant.
- Delivery is durable before Google acknowledgement or native finish. Restore/resume provides retry; an unattended acknowledgement outbox and missed-notification reconciliation remain launch limitations.
- Application logging does not intentionally emit proofs. JavaScript Expo IAP console callbacks are disabled; native debug logging exists independently. The inspected native logger sanitizes structured receipt/token fields, but some native errors use localized error descriptions. This review does not claim a physical native-log capture or prove every upstream error is secret-free.
- Fresh gated Start requires server access; active local walks continue. No local premium boolean is used as entitlement authority.

## Migration review

`drizzle/0015_majestic_lake.sql` relaxes NOT NULL on `commerce_orders.price_id`, `currency` and `amount_total`, then adds `commerce_orders_financial_evidence`. All three must remain present except for explicitly qualified native sandbox/test orders, where all three may be absent. It does not delete or rewrite existing rows and leaves Saved Walks untouched. It is **not strictly additive-only**: it changes existing constraints while adding a compensating check.

Existing provider/payment-intent uniqueness, event uniqueness and entitlement uniqueness remain in place. Normal repeat migration execution relies on the Drizzle journal; running the raw ADD CONSTRAINT statement twice is not intrinsically idempotent. Previous Phase 2 disposable-database validation is historical evidence; no migration was run in this review.

## Requested readiness report

| Item | Result |
| --- | --- |
| A. Dependency/security review | **BLOCKED** by demonstrated Google enablement bypass; audit counts above |
| B. Local commit SHA | No new commit; staging held at review gate |
| C. Exact migrations | `0015_majestic_lake.sql`, snapshot and journal; reviewed, not executed |
| D. Preview DB isolation | Not reverified in this round; infrastructure stage not entered |
| E. Billing env readiness | Unverified; no secret/configuration inspection or changes |
| F. Apple product configuration readiness | Unverified; App Store Connect preflight not entered |
| G. Commercial prerequisites | Unverified; no agreement/banking/tax/tester approval inferred |
| H. Apple verification readiness | Source reviewed; live credentials/Store evidence unverified |
| I. Notification readiness | Source reviewed; remote HTTPS and Store configuration unverified |
| J. Preview deployment | Not attempted |
| K. Billing API smoke | Not run remotely; synthetic local negative regression failed |
| L. EAS billing-sandbox | Source uses `com.citywalk.app` and expo-iap; signing/exact deployed origin unverified; no build |
| M. Production untouched | **YES** |
| N. Safe to build iOS sandbox client | **NO** |

Phase 2's full-suite results remain historical; they did not cover the disabled-Google case above. Full suites, TypeScript and lint were not rerun for this documentation-only review. The final documentation diff check passed. Held cache changes, root TypeScript configuration and stash were preserved; the index remains empty. No physical iOS/Android purchase acceptance or real charging readiness is claimed.
