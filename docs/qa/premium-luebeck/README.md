# Unlock Lübeck — Phase 1 audit (historical)

**Current status:** [Phase 3C](phase-3c-preflight.md) reviews the local Premium checkpoint. Source and isolated DB validation pass; exact-branch Premium Preview bindings are missing, so push and iOS build remain blocked. See [Phase 3B](phase-3b-db-validation.md) for migration/integration evidence. Statements below describe the historical Phase 1 checkpoint.

2026-09-28. Branch `feat/premium-luebeck`, base `cba060b4d54e545b6476e088d15d4b8599510c32` (develop after PR #144).

**Not a working Store purchase integration or a launch-ready paywall.** This phase implements a development-only paywall, a tested purchase/restore controller contract, canonical identity and server entitlement reads. Real adapters, verification writes, transaction recovery, acknowledgement and Store revocation are blocked pending the work below. No account was charged; no Store products, grants or transactions were created. No build, deployment, environment change, migration, content publication, commit or push.

Mobile Core: required on iOS and Android. Public Web: preserve existing behavior, no new checkout. Admin Web: existing commerce infrastructure audited; no new screens. Physical acceptance of this feature on either platform is UNVERIFIED. Previous iPhone acceptance does not establish acceptance of this feature.

## A–B. Audit and architecture decision

| Existing boundary | Finding / reuse |
| --- | --- |
| `src/db/commerceSchema.ts` | Existing products, prices, grants, orders, customers, provider events and entitlements. Entitlements already support active/revoked/expired and nullable expiry. No second ledger or migration added. |
| `src/lib/commerce/entitlements.server.ts` | Database predicate checks server user, scope, active status and expiry. Reused unchanged. |
| `cityPassConfig.ts`, `cityPassAccess.server.ts` | Existing web product `lubeck-digital-guide-pass-72h` is a **72-hour** city pass, not the new permanent entitlement. Existing purchasers retain existing capability access. A canonical city-unlock grant now also satisfies the existing protected Guide/audio access helper. Legacy access never becomes a permanent grant. |
| Stripe checkout/webhook | Existing event/order uniqueness and entitlement/revocation machinery is useful infrastructure. It is not an Apple/Google verifier. No native Stripe checkout enabled or linked. |
| Guide allowance | Server already resolves session and access. Free demonstration and paid allowance remain bounded (currently 3 / 20 per day), with rate limits and knowledge eligibility. No unlimited-AI promise. |
| Premium media route | Existing authenticated `/api/commerce/media/[assetKey]` requires approved, published, same-city eligible premium media and access. Public audio is a separate path. |
| Native audio | Existing exact-locale public selection and truthful missing/error states preserved. Native premium attachment discovery and authenticated playback are **not connected by this phase**; required before advertising full audio coverage. |
| Native commerce | Existing `getNativePurchaseAvailability` remains unavailable. No RevenueCat, StoreKit/Play adapter or Store verification dependency exists. `expo-store-review` requests reviews; it is not billing. |
| Planning/execution | Planner and adaptations are shared local domain operations. Only the personalized Preview → Start call receives the opt-in gate. No server premium route-mutation endpoint exists to protect. Existing active sessions continue. |
| Editorial tours | Existing `historic-center-walk` is classified as a free sample in shared policy. Other tours remain unclassified; no invented premium categories or CMS changes. Future per-tour access metadata requires editorial review. |
| Analytics | Native code defines location properties but has no verified event transport. Unlock event names are defined, not delivered. |

Chosen future stack: direct Apple/Google verification feeding the existing CITYWALK ledger, with an `expo-iap` client adapter. RevenueCat is not introduced. The installed baseline is Expo 57.0.25 / React Native 0.86.3. The library's current setup guide identifies SDK 57 / RN 0.86 as a supported baseline; **no installed-library or device compatibility claim** follows from that documentation. See [Expo IAP guidance](https://docs.expo.dev/guides/in-app-purchases/) and [OpenIAP Expo setup](https://www.openiap.dev/docs/setup/expo).

Why billing stays unavailable: merely obtaining a client purchase result is not safe ownership evidence. The existing ledger still needs a reviewed native transaction-to-account binding, verified Store events and reconciliation. This source cannot be made commercially ready by flipping an environment variable.

## C–G. Product, boundary and copy

**Unlock Lübeck** — **Lübeck, made personal.** One-time, non-consumable city ownership. €6.99 is the operator's target launch price, never the runtime price authority or part of the identity.

Free: onboarding, city selection/Hub, Explore/map/place list/details, available summaries/photos, filters, favorites, account/profile, account-backed Saved Walks, planner/preferences, route generation, Preview/stops/time/distance/return-time/map. Existing public audio and the editorial sample remain available. No new gate before Preview.

Intended paid experience: guided personalized execution and its existing Skip/Shorten/Add/Rebuild/Take me back operations; eligible exact-language storytelling; the existing bounded premium Ask allowance; only real curated discoveries. This phase does not manufacture audio, editorial content, new adaptive intelligence or a paid content catalog.

Entry point: `city/[citySlug]/walk` → `NativeWalkFlow.start` → `CityUnlockGate`, after valid-stop checks and before the serialized Start write. The gate is **off by default and always off in release builds**. Local development can opt in using `EXPO_PUBLIC_CITYWALK_UNLOCK_PREVIEW=1` with `__DEV__`; no environment file was changed. Without opt-in, accepted behavior is unchanged. With opt-in, server-owned access continues Start; absence/error opens the sheet. Dismissal resolves false without altering the plan. Storage revalidates the route after authorization, including a last-stop removal race.

The new HTTP route exists only in this local source. No existing remote Preview was updated or tested for this feature. An older backend without the route will produce the sheet's access-unavailable state, not ownership. Automated handler tests are not a live HTTP deployment result.

The sheet reuses the existing image-overlay hero and scrollable native Screen; it has no fixed text height, font-scaling override or clipped CTA. Sign-in/create-account preserves the mounted Start intent and uses the existing return-to-walk account entry. Successful verified state offers a fresh server-checked “Start this experience” action. Account-scoped snapshots prevent another account's owned state being presented. A city-home ownership badge is deferred until the Store-backed ownership lifecycle is operational; no decorative fake-owned badge is shown.

| Copy | English | German |
| --- | --- | --- |
| Title | Unlock Lübeck | Lübeck freischalten |
| Positioning | Lübeck, made personal. | Lübeck, ganz persönlich. |
| Purchase CTA | Unlock Lübeck — {price} | Lübeck freischalten — {price} |
| Ownership | One purchase. Full CITYWALK access for Lübeck. | Einmal kaufen. Voller CITYWALK-Zugang für Lübeck. |
| Restore / dismiss | Restore purchases / Not now | Käufe wiederherstellen / Nicht jetzt |

The catalogs are authoritative for exact rendered wording. Benefits describe route planning, changing plans, stories, local answers and discoveries. A visible availability qualification explains content/language dependence. DA/SV/NL/ES and retained AR contain the same keys; Arabic remains hidden from the launch selector. Price is accepted only from matching Store metadata with a nonempty localized price. Missing metadata has no fallback numeric purchase price.

UI keys interpolate `{city}` using the existing localized city-name layer; no city/place content is embedded in the shared UI catalogs. This preserves the existing i18n separation invariant and Arabic city-name presentation.

## H–J. Product and ownership security

| Item | Value |
| --- | --- |
| Existing application city slug | `lubeck` (unchanged) |
| Canonical entitlement | `city:luebeck:premium` |
| Ledger representation | `scopeType=feature`, `scopeKey=city:luebeck:premium` |
| Apple product | `com.citywalk.luebeck.premium`, Non-Consumable |
| Google product | `com.citywalk.luebeck.premium`, one-time non-consumable |
| Store package/bundle | `com.citywalk.app` (existing development profile uses `com.citywalk.app.dev`) |
| Price | Store-localized metadata; operator target €6.99 |

No price change changes ownership identity. Registry allows additional explicitly configured cities later without implementing bundles/subscriptions now.

Store ownership is the authority for a transaction; CITYWALK server associates verified ownership with the authenticated traveler. Guests may explore, plan and view the sheet. The current ledger requires a user FK, so purchase/restore requires sign-in. No guest purchase or automatic later transfer is attempted. A future Apple server-issued appAccountToken / Google obfuscated account identifier must bind a purchase to its initiating CITYWALK account without exposing raw account data to analytics. A different signed-in account restoring the same purchase must receive a recoverable account-conflict outcome, never silently take ownership. Reinstall recovers through Store ownership plus server verification under the original associated account.

Implemented read endpoint: `GET /api/commerce/city-unlock/[citySlug]`, private/no-store. Session user is authoritative. `X-Citywalk-Account` is only a mismatch/race guard, not an identity credential. Unknown products return 404; account mismatch 401; service failure 503. Client rechecks account before/after reading and validates city/entitlement/boolean shape. No local ownership persistence, navigation parameter or `premium=true` can grant server access. `POST` always returns safe 503 `STORE_VERIFICATION_UNAVAILABLE`; it cannot grant an entitlement.

Before a real verifier is enabled, require all of:

1. Authenticated session, strict bounded input, trusted product/app/environment allowlists; separate sandbox and Production credentials/events.
2. Apple signed-transaction verification and current ownership/revocation; Google server purchase-token lookup, correct package/product, PURCHASED status and account association. Do not trust client amount, Store status, product claims or user ID.
3. Transaction identity unique across **accounts**, not just unique grants per user. Use provider/environment-qualified native identifiers mapped to existing order uniqueness; Google purchase token rather than order ID. Define protected token retention for reconciliation, never log it. Existing order `priceId`, amount/currency and grant creation need an explicit native provisioning strategy; do not invent monetary records from client price labels.
4. Transactional, replay-safe order/event/entitlement writes. Same owner replay returns the same result; other-owner replay conflicts. No permanent grant for pending/cancelled/refunded transactions. Replayed older success cannot resurrect newer revocation.
5. Acknowledgement/finish only after durable verified delivery. Reliable retry/outbox/reconciliation for failure between grant and acknowledgement. No consumption of the one-time product.

These server write paths are **not implemented** by the controller's mocked ports. [Google's security guidance](https://developer.android.com/google/play/billing/security) requires server validation, correct pending handling and acknowledgement; its recommended token identity informs the design above.

## K–N. States, restore, offline and revocation

Implemented controller states: `store_product_loading`, `store_product_unavailable`, `ready`, `purchase_started`, `purchase_pending`, `purchase_cancelled`, `purchase_failed`, `verification_pending`, `verification_failed`, `entitlement_activating`, `unlocked`, `already_owned`, `restore_started`, `restore_success`, `nothing_to_restore`, `restore_failed`, plus `account_required` and `access_unavailable`.

Controller tests use injected test-only adapters. Runtime adapter is unavailable and cannot return a synthetic success. An in-flight lock suppresses duplicate taps. Pending purchase remains pending on metadata retry. Results after disposal/account change are ignored. Verification success alone does not display Unlocked: a fresh authoritative access check must also succeed. Pending Store updates across app termination need a real transaction listener/re-query coordinator before rollout.

Restore never invokes purchase. It queries ownership, deduplicates proof inputs, verifies each, and rechecks server access. Empty ownership differs from network/verification failure. Repeated restore after success does not make another request. Runtime restore remains unavailable, not a false “nothing to restore” result. No sandbox restore/reinstall/account-conflict acceptance is claimed.

Offline policy in this phase: **no cached entitlement evidence is trusted (TTL 0)**. Fresh gated Start requires an online server check. An already-active local walk continues from existing traveler state through temporary network loss; no mid-walk interruption was added. Reinstall cannot unlock from a boolean. Public cached content is unchanged; no claim of downloaded offline premium audio. Future smoother offline fresh-start access requires a server-signed, account/city/origin-bound lease with a reviewed finite expiry and revocation tradeoff. That is a launch decision, not an implemented lease.

Existing Stripe revocation does not cover native Stores. Apple App Store Server Notifications V2 and Google real-time notifications plus periodic ownership/voided-purchase reconciliation must revoke the same order/grant idempotently. Authenticate notifications, resolve referenced transactions server-side, tolerate duplication/out-of-order delivery and invalidate future fresh-start/lease access. Test refund → revoke → restart → denied; no permanent unrevokable native grant. [Apple notification documentation](https://developer.apple.com/documentation/appstoreservernotifications). Native revocation and its operational monitoring are launch blockers.

## O. Analytics

Shared constants define all eleven requested `city_unlock_*` events: paywall_viewed, dismissed, purchase_started/cancelled/failed/verified, entitlement_activated, restore_started/success/empty/failed. They are **not sent**. Proposed metadata allowlist: `city_slug`, `entry_point`, `store`, `product_id`; exclude receipts/tokens/payment or Store-account data, precise location and message content.

Funnel: Explore → planner started → Preview reached → Start tapped → paywall viewed → purchase started → verified/durably activated. Dismissal and restore are separate outcomes, not purchase conversions. Transport/consent/ingestion verification remains required; no conversion metrics are available from this phase.

## P. Files in this phase

- `packages/traveler-core/src/cityUnlock.ts`, `src/index.ts`: canonical registry, states/events and existing editorial sample classification.
- `packages/i18n/src/locales/{en,de,da,sv,nl,es,ar}.json`: shared paywall copy.
- `src/lib/commerce/cityUnlock.server.ts`: canonical entitlement read.
- `src/lib/commerce/cityPassAccess.server.ts`: compatible access to existing protected capabilities.
- `src/app/api/commerce/city-unlock/[citySlug]/route.ts`: authenticated account-bound read; disabled write contract.
- `mobile/src/lib/cityUnlock.ts`, `cityUnlockAccess.ts`: controller, disabled adapter, opt-in guard and authenticated access read.
- `mobile/src/components/CityUnlockGate.tsx`: native translated sheet and account entry.
- `mobile/src/components/NativeWalkFlow.tsx`, `mobile/src/app/city/[citySlug]/walk.tsx`: optional Start authorization only.
- `mobile/tests/city-unlock.test.ts`, `city-unlock-access.test.ts`, `city-unlock-gate.test.tsx`, `walk-flow.test.tsx`: contracts/render/Start regressions.
- `src/lib/commerce/cityUnlock.server.test.ts`, `cityUnlock-compatibility.server.test.ts`, `src/app/api/commerce/city-unlock/[citySlug]/route.test.ts`: server read, legacy compatibility and forged-write rejection.
- This README: scope, evidence and remaining implementation/operator work.

Pre-existing changes to `mobile/src/lib/publicContentCache.ts`, `mobile/tests/public-content-cache.test.ts`, root `tsconfig.json` and untracked `.expo/` are not premium implementation. Preserve them and the held stash. No manifests, lockfiles, database schema, credentials or signing/configuration files changed in this phase.

## Q. Validation

Tests exercise native bridges through mocks; they cannot establish Store purchase, audio playback, device visual quality, restore or refunds.

- `npm --prefix mobile run test:run -- --maxWorkers=2`: **571 passed / 63 files**, zero skips/failures. Includes account/lifecycle/Saved Walk, navigation, Start/Save/Rebuild, membership, media and new unlock regressions.
- Iteration: initial TypeScript union narrowing and test-only native-image bridge import were corrected. The initial mobile full run had 569 passed / one timeout; the isolated walk-flow rerun passed all 60 tests without assertion or timeout changes. The final bounded-worker full run above passes.
- Root's first full run found the existing rule against embedding city names in UI catalogs (903 passed / one failed / 47 skipped). Fixed by interpolating `{city}` through existing localized content, not weakening the rule. Final root rerun is recorded below.
- `npm run test:run -- --maxWorkers=4` on final source: **903 passed / 47 skipped / 1 timeout**, 148 passed files / 7 skipped files / 1 failed file. The timeout was the unchanged Admin translation-matrix test. `npm run test:run -- 'src/app/admin/(protected)/operations/operationsPages.test.tsx' --maxWorkers=1` then passed **3/3 tests, 1 file**, with no intervening source, assertion or timeout changes. Thus all 904 non-skipped root cases have passing final-source evidence across the full run and focused rerun; **the full command itself did not exit green**. Root/mobile suites and static checks were concurrent during the timeout; that observation is not proof of a code defect or its absence. Recheck normal CI before merge. Existing Vite config-loader/tsconfig-paths warnings remain unchanged.
- `npx tsc --noEmit`: **PASS** (root).
- `npm run mobile:typecheck`: **PASS**.
- `npm run lint` and `npm run mobile:lint`: **PASS**, no reported lint errors/warnings.
- `npm run i18n:check`: **529 keys × 7 locales, zero errors**.
- `git diff --check`: **PASS**.
- No database write/schema change was introduced; configured opt-in DB integration suites stay skipped in normal root tests. No DB integration, migration or build was run in this phase.
- No Store acceptance follows from mocked `purchase`/`verify`/`restore` ports. Runtime uses only the unavailable adapter.

Final scope review: 25 premium implementation/test/documentation paths (12 modified, 13 new), all unstaged. No credential-pattern findings in this scope; manual review found no private configuration, receipt logging, generated outputs or dependency/schema changes. Pre-existing three modified source files retain their recorded hashes, and the held stash still points to `b2473ba631870126c7406f0f8a11900926ef2c69`. Both Better Auth lockfile baselines remain 1.7.2. No ignored environment/signing file was edited.

## R–U. Dependencies, build and operator setup

New native dependencies: **none installed in this phase**. New EAS build required for current JS-only unavailable-store prototype: **NO**. Required for the future `expo-iap` adapter: **YES**, for both platforms; Metro cannot add its native module. Pin a compatible package only when implementing that adapter, inspect native/config diff and build internally with explicit approval. No `prebuild`, EAS build or Store console operation was run.

The current development profile uses the `.dev` application identifier, while Preview/Store profiles use `com.citywalk.app`. A new sandbox billing build must deliberately match the Store listing's bundle/package and the isolated sandbox backend. Do not assume the installed `.dev` client can query the production-identifier product. Existing EAS profiles and their backend origins remain unchanged; they are not proof of a safe sandbox commerce deployment.

Future Apple operator steps (not executed):

1. Confirm existing `com.citywalk.app` app/bundle, agreements and sandbox capability; create `com.citywalk.luebeck.premium` as Non-Consumable with approved localized title/description. Select €6.99 equivalent launch pricing and intended availability; do not enable customer rollout yet.
2. Prepare actual paywall/review screenshots, concise benefits/content-language qualifications, privacy/terms links, and review instructions: guest planning → Preview → Start → account → sandbox purchase/restore. Explain no transport/attraction admission and no subscription.
3. Set up sandbox testers and isolated server verification credentials/notification endpoint only through approved configuration work. Provide review account and a real nonempty route; never put credentials in this document.
4. Finish server verification/reconciliation and build the adapter before testing. App Store numerical listing/review URL remains unrelated to this purchase ID.

Future Google operator steps (not executed):

1. In the `com.citywalk.app` listing create matching one-time product, non-consumable purchase option and approved six-language metadata. Configure launch pricing and eligible regions, not subscriptions/consumption.
2. Prepare internal testing track, license testers and source-matched ARM64 build; install through the supported Play test path. A sideload-only UI test does not establish Play Billing acceptance.
3. Configure least-privilege server verification access and authenticated notification/reconciliation infrastructure under separate approved work. Ensure durable acknowledgement retries.
4. Supply purchase/recovery/restore screenshots, content availability and legal/privacy disclosures. Keep real customer rollout disabled until the safety checklist passes.

## V–W. Device and platform acceptance checklists

All entries below are **UNVERIFIED/BLOCKED**, not inherited from earlier feature acceptance.

On iPhone, first inspect the development-only sheet without Store billing:

1. Explore, map, place, planner, full Preview and account Saved Walk remain free. Empty Start stays disabled.
2. Start a valid Lübeck Preview → Unlock sheet. Not now/back returns to identical stops/settings; repeated Start cannot restart a journey. Last-stop removal during authorization cannot start an empty walk.
3. Guest Create account/Sign in returns to the same route and purchase intent without buying automatically. Switch accounts while waiting: no stale owned badge or success.
4. EN/DE/NL at normal, 110% and practical larger text; all benefits wrap, bottom Restore/Not now reachable, localized price spoken once, VoiceOver labels, safe areas. Repeat retained Arabic RTL in development without exposing it in launch selector.
5. Offline/unavailable Store/server: clear retry/dismiss state, no hardcoded price or false Unlocked. Existing active walk can continue offline, Finish and Take me back intact.

After the real adapter/server work and an approved sandbox build, on iPhone:

6. Fetch real product/price; purchase success/cancel/pending/failure/verification failure/already-owned; grant only after verification. Duplicate taps/events/retries produce one ownership record.
7. Kill/relaunch during pending verification and after Store success before delivery; recover through Store transactions without recharging. Reinstall/restore success, no purchases, network failure, different CITYWALK account conflict.
8. Entitled Start returns naturally to original Preview route. Server premium Guide/audio enforce ownership and exact language; revoked/account-switched users cannot borrow access. Approved content coverage is real, not inferred from metadata.
9. Sandbox refund/revocation plus replayed older success, offline/online reconciliation, price change without repurchase, accessibility and ownership indicator across Home/Hub/Start. Record real observations and evidence.

On Android, repeat the same device scenarios **independently**, plus Play test purchase/pending-payment handling, backend acknowledgement and acknowledgement retry, no consumption, activity recreation/back behavior, Play ownership re-query, refund/voided-purchase reconciliation, source-matched ARM64 installation and localized price. Do not claim Android acceptance from iOS tests.

## X–Y. Launch blockers and product risks

**Real charging: BLOCKED.** Store products/configuration, native adapter, authoritative transaction verification/durable ledger writes, cross-account transaction uniqueness, acknowledgement/recovery, notifications/revocation, isolated sandbox backend, purchase/restore/refund/device evidence, ownership badge, premium-audio discovery/playback, legal/privacy disclosures, production commerce verification and analytics ingestion remain outstanding. The release build intentionally cannot enable this prototype gate. No activation/grant source exists here.

Risks to resolve before rollout:

- A hard Start paywall without a working purchase/restore path strands a traveler after planning. Hence this safe phase is opt-in development only.
- Existing travelers/legacy pass holders must not unexpectedly lose previously accepted access. A legacy pass is not permanent ownership; define rollout/grandfathering explicitly before changing release gating.
- “Full access” must not imply unlimited Ask usage, all-language audio, attraction tickets or content not yet published. Keep limits/content qualifications visible and revise Store promises to actual coverage.
- Local adaptive execution is not DRM: a modified client can bypass a local Start gate. Server AI/private media remain protected. Do not claim the client gate secures all offline algorithm use.
- Starting a fresh walk offline is blocked in this phase; decide a bounded signed lease before promising seamless offline premium starts. Never interrupt safety-oriented Take me back during an active walk.
- Account requirements preserve ownership safely with the current ledger but add conversion friction. Keep discovery/Preview free and explain association without forcing registration on app launch.
- Account deletion with commerce history remains governed by existing retention guards; do not silently delete or transfer purchase ownership.
- A paid curated catalog/concierge quality cannot be delivered by adding empty categories. Editorial coverage and service availability need separate acceptance.
