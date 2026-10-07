# CITYWALK Data Inventory & Retention Matrix

**Status:** implementation-derived launch document  
**Audit date:** 2026-10-07  
**Repository baseline:** `develop` at `6bd9ce2f343edab681edc13332a5c975d8dcadac`  
**Parent launch ticket:** #109

This document describes data flows that are visible in the CITYWALK codebase. It is the source input for the public privacy notice, data-rights operations, App Store App Privacy answers, and Google Play Data Safety answers.

It is deliberately conservative:

- it does **not** invent provider retention periods, tax/accounting periods, backup periods, or legal obligations;
- it distinguishes device-only data from server data;
- it distinguishes configured/optional integrations from always-on product behavior;
- an item marked **OPEN** is a launch decision or operational policy that is not defined by the repository today.

## 1. High-confidence retention values encoded in CITYWALK

| Data | Retention encoded in code | Source |
| --- | --- | --- |
| Web anonymous visitor UUID | 180 days maximum in browser `localStorage` | `src/lib/visitorSession.ts` |
| Web visitor session UUID | 24 hours maximum; normally shorter because it uses `sessionStorage` | `src/lib/visitorSession.ts` |
| Native anonymous visitor UUID | 180 days maximum in AsyncStorage | `mobile/src/lib/visitorIdentity.ts` |
| Better Auth session | 7 days, with 24-hour update age | `src/lib/auth/factory.server.ts` |
| Email verification token | 1 hour | `src/lib/auth/factory.server.ts` |
| Password-reset token | 30 minutes | `src/lib/auth/factory.server.ts` |
| Public web account-deletion token | 30 minutes | `src/lib/auth/lifecycle/webDeletionRequest.server.ts` |
| PostgreSQL rate-limit events | 48 hours maximum; old rows are deleted during rate-limit transactions | `src/lib/databaseRateLimit.server.ts` |
| AI Guide request history sent to the model | At most the last 6 accepted messages in one request, each truncated to 2,000 characters | `src/app/api/guide/route.ts` |
| Native persisted AI Guide conversation | At most 20 completed user/assistant turns per city/place; no time TTL | `mobile/src/lib/guideConversationStorage.ts` |

Everything else below either follows a user/account lifecycle or still needs an operator/provider retention decision.

## 2. Data inventory

| Category | Examples actually implemented | Stored / processed where | Purpose | Retention / deletion behavior |
| --- | --- | --- | --- | --- |
| Anonymous web identity | Random `visitorId`, random `sessionId` | Browser localStorage/sessionStorage; optionally registered with PostHog | Guest continuity and pseudonymous product analytics | Visitor 180d; session 24h. Not derived from email, IP, fingerprint or GPS. |
| Anonymous native identity | Random visitor UUID | Native AsyncStorage; sent as AI allowance identity | Guest AI allowance and continuity | 180d. Cleared by the native account-deletion local purge on the device where deletion completes. |
| Account profile | User ID, display name, email, email-verification state, optional image | PostgreSQL Better Auth tables | Account creation, login and profile | User row is hard-deleted when self-service deletion succeeds, subject to retention-review blockers. |
| Authentication/session data | Session token, expiry, IP address, user agent | PostgreSQL Better Auth `session` table | Authentication and account security | Session expiry is 7d. Sessions cascade on user deletion. |
| Native auth client state | Better Auth Expo auth cookie/session cache | Native Expo SecureStore via `@better-auth/expo` | Keep the native app authenticated between requests | Better Auth Expo manages the device-side auth cache. After a successful server account deletion, CITYWALK runs device-local traveler cleanup and then best-effort `nativeAuthClient.signOut()`; the lifecycle code relies on the Expo integration to clear its SecureStore auth cookies/session cache. No separate CITYWALK device TTL is encoded; the server session policy remains 7d. |
| Credential/social account data | Provider account ID, provider ID, password hash, OAuth access/refresh/ID tokens and token expiry/scope fields | PostgreSQL Better Auth `account` table | Credential auth, Google/Apple sign-in and account linking | Cascades on user deletion. Apple token revocation is queued before the account row is deleted when a usable token exists. |
| Verification/lifecycle proofs | Email verification, reset-password and web-deletion verification records/tokens | PostgreSQL `verification` table | Email verification, password reset, secure web deletion | Email verify 1h; reset 30m; web deletion 30m. Account-owned reset/deletion verification rows are removed during account deletion. |
| Traveler server profile | Preferred locale | PostgreSQL `traveler_profiles` | Account preferences | Cascades on user deletion. |
| Guest-to-account linkage | User ID + anonymous visitor/session identifiers | PostgreSQL `traveler_guest_links` | Link a guest journey to a signed-in account | Cascades on user deletion. |
| Account saved walks | City, route, route fingerprint and timestamps | PostgreSQL `account_saved_walks` | Cross-session/account saved walks | Cascades on user deletion. No independent TTL is defined. |
| Device-local saved/product state | Saved places, active/current walk, local trips, local feedback, traveler style, guide history | Native AsyncStorage and web local/session storage depending on feature | Guest-first product continuity and personalization | Most records have no time TTL. Users can remove individual items; native account deletion purges CITYWALK traveler prefixes, guide history, local trips, live-walk state, user-scoped traveler style and the native visitor ID. A web deletion cannot erase storage on a disconnected device. |
| Live Walk location state | Current/last published point, stop/finish coordinates, route/proximity state | Native AsyncStorage `citywalk:live-walk:v1` plus in-memory location APIs | Live Walk progress, proximity and Live Activity behavior | No time TTL in storage code; cleared with Live Walk cleanup or native account-deletion local purge. |
| Browser location | Latitude, longitude, accuracy, timestamp | Browser memory while location feature is active | Nearby/current-location features | No PostgreSQL persistence in the reviewed web location path. Browser watch stops when the feature unmounts/stops. |
| Native foreground location | Latitude/longitude from foreground location adapter | In memory; selected Live Walk state can persist locally as described above | Nearby/Live Walk features | Not intentionally attached to analytics. |
| AI Guide input | Question, limited recent conversation history, city/place context, verified knowledge and privacy-minimized walk/tour context | CITYWALK server request, then Groq model API | Answer a requested AI Guide question | CITYWALK does not write prompt/answer content to PostgreSQL in the reviewed route. Groq provider retention is **OPEN** and must be confirmed from the production provider configuration/terms. |
| AI Guide local history | Completed user/assistant messages and source metadata | Native AsyncStorage, per city/place | Conversation continuity | Maximum 20 completed turns; no time TTL. Purged by native account-deletion local cleanup. |
| AI/security rate limits | HMAC/SHA-derived identifier hashes for IP/user/visitor identities + timestamp/scope | PostgreSQL `rate_limit_events` | Abuse prevention and daily AI allowance | 48h maximum in CITYWALK database code. Raw identity is not stored in this table. |
| PostHog analytics identity | Pseudonymous CITYWALK visitor/session UUIDs | Browser storage and PostHog when configured **and explicitly allowed** | Product/journey analytics | Browser UUID TTLs are 180d/24h after consent. Declining/withdrawing consent clears the CITYWALK analytics UUIDs. PostHog event retention is not defined in this repo and is **OPEN**. |
| PostHog events | Examples: `city_opened`, `place_viewed`, Marketing `landing_view` / `build_walk_clicked`, native-attributed `walk_started` / `walk_completed`, aggregate `entitlement_granted`; client exception capture is enabled in PostHog initialization | Browser PostHog SDK and server-side PostHog capture when `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and host are configured | Product analytics and funnel measurement | Provider/project retention is **OPEN**. The native funnel uses a fixed aggregate `distinct_id` (`citywalk-marketing-funnel`) and sends city + campaign attribution only; raw GPS, account email, CITYWALK user ID and auth tokens are not intentionally added to the reviewed event contracts. |
| Marketing attribution | UTM source/medium/campaign/content, landing variant, city | URL/query; PostHog event properties when configured; native AsyncStorage after app handoff; first-party `/api/analytics/marketing-funnel` forwarding for matching-city native walk events | Acquisition attribution and attributed walk-funnel measurement | Native attribution is persisted only after explicit native analytics consent. Declining analytics, or changing a previous choice to declined, clears the native attribution and blocks native funnel forwarding. No time TTL is defined while consent remains granted. The first-party funnel endpoint does not persist the payload in CITYWALK PostgreSQL; it forwards validated fields to PostHog when configured. **OPEN:** define the maximum attribution lifetime before production analytics is finalized. |
| Commerce customer mapping | User ID ↔ Stripe/native provider customer ID | PostgreSQL `commerce_customers` | Reconcile purchases | Cascades on user deletion. |
| Orders | Product, provider IDs, checkout/payment IDs, status, amount/currency and payment/refund timestamps | PostgreSQL `commerce_orders` | Purchase evidence/reconciliation | Survives account deletion with `user_id = NULL`. No app-level retention period is defined. **OPEN:** accounting/legal retention policy before real-money activation. |
| Subscriptions | Provider subscription/product IDs, store/environment, original transaction ID, status, period end and renewal state | PostgreSQL `commerce_subscriptions` | Subscription lifecycle reconciliation | Survives account deletion with `user_id = NULL`. No app-level retention period is defined. |
| Entitlements | User, product/scope, source order/subscription, grant/expiry/revocation state | PostgreSQL `commerce_entitlements` | Server-authoritative paid access | Cascades on user deletion. |
| Provider event deduplication | Provider event ID/type/outcome | PostgreSQL `commerce_provider_events` | Webhook idempotency/audit | No app-level TTL is defined. It does not store a CITYWALK user ID directly. |
| RevenueCat | Immutable Better Auth user ID after login, product/subscription lifecycle data | RevenueCat + CITYWALK commerce reconciliation | Native purchase/subscription integration | Customer erasure is queued after account deletion. Store cancellation/refund is separate. Provider retention after erasure is governed by RevenueCat/store policy. |
| Apple purchase/sign-in data | Store transaction identifiers; Apple social-auth tokens when used | Apple/RevenueCat/CITYWALK auth or commerce records | Sign in and native purchases | Apple sign-in token revocation is queued on deletion when a token exists. Store purchase records are separate from account deletion. |
| Google purchase/sign-in data | Store/provider identifiers and Google account/provider ID/tokens when used | Google/RevenueCat/CITYWALK auth or commerce records | Sign in and native purchases | CITYWALK account rows cascade on deletion; store purchase records are separate. |
| Transactional email | Recipient email + verification/reset/deletion email body and secure link | Resend | Account verification, password reset and account deletion confirmation | CITYWALK does not define Resend provider retention in code. **OPEN:** confirm production provider retention/DPA settings. |
| Support email | User-supplied email address/content/attachments if they email support | Support mailbox/provider; no CITYWALK support-ticket database exists in the reviewed code | Customer support | No repo-defined retention. **OPEN:** mailbox/support retention policy. |
| External erasure outbox | Provider, immutable provider target, retry attempts/timestamps, last error; Apple token stored only as encrypted envelope | PostgreSQL `external_account_erasure_jobs` | Durable Apple/RevenueCat erasure retries | Jobs persist through user deletion. No cleanup TTL for completed jobs is defined. **OPEN:** completed-job retention/cleanup policy. |
| CMS/editorial staff data | Staff membership, role/city access and plain-text actor IDs on content/workflow/media records | PostgreSQL CMS tables | Admin authorization, publishing audit and content provenance | Staff/audit references can block self-service deletion and require retention review. No fixed TTL is defined. |
| Media rights/provenance | Original filename, creator/rights holder/attribution/evidence fields, staff actor IDs; S3 object metadata | PostgreSQL + configured S3-compatible object storage | Content delivery and rights compliance | Controlled by media lifecycle/archive behavior, not a fixed privacy TTL. Traveler uploads are not part of the reviewed product path. |
| Operational logs | Server/Cloudflare/provider request/error logs; lifecycle code intentionally avoids logging recipient/token details | Hosting/provider systems | Security, debugging, operations | **OPEN:** production log retention is infrastructure configuration, not defined in repository code. |
| Database backups | Copies of PostgreSQL data | Production database/backup infrastructure | Disaster recovery | **OPEN:** no backup retention schedule is encoded in the repo. |
| Walk feedback | Rating/fit/tags currently saved locally on native device | Native AsyncStorage | Product feedback shown/stored on device | No server feedback database in the reviewed implementation. Purged by native account-deletion prefix cleanup. |
| Marketing/social CMS content | Campaign/page/social drafts and publication state, staff actor IDs | PostgreSQL Marketing CMS | Acquisition content workflow | Primarily business/editorial data. Staff actor identifiers follow the staff/audit retention-review boundary. |

### Current processor exclusions

- **Upstash is not a current runtime processor on this baseline.** CITYWALK rate limiting is PostgreSQL-backed, and the current root dependencies, `.env.example`, and `cloudflare.config.ts` contain no Upstash dependency or binding. Reintroducing Upstash would require a new inventory review.

## 3. Location privacy boundary

The reviewed code supports precise foreground coordinates for walking features, but the privacy boundary is explicit:

- browser location is held in component state for the location feature;
- native Live Walk can persist a recent point locally on the device;
- CITYWALK analytics helpers report location **status**, not raw coordinates;
- the AI Guide intentionally withholds precise start/finish coordinates and deadline timestamps from the language-model prompt;
- no reviewed PostHog event contract intentionally includes raw latitude/longitude or a GPS trail;
- the native Marketing funnel contains event name, city and campaign attribution only, not location coordinates.

Any future raw-route upload, server location history, geofencing analytics or background location collection requires a new inventory review and store-declaration update.

## 4. AI processing boundary

For a Guide request the server may send Groq:

- the current user question (maximum 500 characters);
- up to the last 6 accepted user/assistant messages, each truncated to 2,000 characters;
- current city/place identity;
- retrieved verified CITYWALK knowledge;
- validated tour/walk context that excludes precise start/finish coordinates.

The reviewed route does **not** insert the question, prompt or model answer into PostgreSQL. Mobile clients can persist completed conversation history locally for continuity.

**OPEN before store/legal finalization:** confirm the production Groq account's data-retention/training settings and record the applicable processor/transfer terms.

## 5. Analytics state and consent

The repository now contains an active **optional** PostHog integration:

- `instrumentation-client.ts` calls `posthog.init(...)` when both public PostHog environment values are configured;
- it enables `capture_exceptions: true` while automatic interaction capture, automatic pageview/pageleave capture and session recording are disabled;
- `VisitorJourneyTracker` captures city/place journey events;
- published Marketing pages capture landing and CTA events;
- Marketing-attributed native walks can send `walk_started` / `walk_completed` to the first-party `/api/analytics/marketing-funnel` endpoint;
- that endpoint forwards validated city/campaign attribution to PostHog with the fixed aggregate `distinct_id` `citywalk-marketing-funnel` and does not write the payload to CITYWALK PostgreSQL;
- verified entitlement grants can emit an aggregate server-side PostHog event;
- the browser registers CITYWALK pseudonymous visitor/session IDs;
- first-party CITYWALK consent gates browser SDK initialization, analytics UUID creation and browser client capture; PostHog's own opt-out state remains a secondary SDK safeguard.

This means the older statement that "the current public web code does not activate PostHog analytics" is no longer an accurate description of the code after the multi-city Marketing renderer landed.

**Implemented browser gate:** browser PostHog analytics is fail-closed until the user explicitly chooses “Allow analytics”. Declining or withdrawing the choice prevents further browser client capture and clears CITYWALK's analytics visitor/session IDs. The consent decision itself is stored locally so CITYWALK can remember the user's choice.

**Implemented native gate:** native Marketing analytics is also fail-closed. When the native analytics choice is unset or denied, CITYWALK does not persist Marketing attribution and does not send `walk_started` / `walk_completed` funnel requests. The Legal & Support screen exposes explicit Allow / Decline controls. Declining after a previous grant clears the native Marketing attribution. Browser and native choices are stored locally in their own runtime/device context; CITYWALK does not assume that a browser choice automatically transfers to the app.

Still confirm the production PostHog project's provider-side retention and final operational configuration before launch.

## 6. Account deletion mapping

Current server behavior:

- deletes the Better Auth user;
- cascades auth accounts/sessions and user-owned traveler records;
- cascades commerce customer mappings and entitlements;
- keeps orders/subscriptions detached with `user_id = NULL`;
- removes account-owned reset/deletion verification rows;
- queues RevenueCat customer erasure;
- queues Apple sign-in token revocation when a token exists;
- blocks self-service deletion when staff/editorial audit retention needs review.

Current native post-delete cleanup removes:

- `citywalk:native:v2:*` traveler state;
- persisted Guide history;
- local trips;
- Live Walk state;
- user-scoped traveler style;
- the native anonymous visitor identity;
- Better Auth Expo auth cookie/session cache through best-effort native sign-out after the server deletion has committed.

Not automatically cleared by the reviewed native deletion purge:

- Marketing attribution (`citywalk:marketing-attribution:v1`), which is device-local and not account-scoped.

A public web deletion cannot erase data that exists only in an offline/disconnected browser or app installation.

## 7. Retention items that still require an operator decision

Before production launch, explicitly configure/document:

1. PostHog project event retention and final production project configuration.
2. Native Marketing attribution maximum lifetime while consent remains granted. Decline/withdraw cleanup is implemented.
3. Production server/Cloudflare log retention.
4. PostgreSQL backup retention and deletion propagation.
5. Resend retention/DPA settings.
6. Support mailbox/ticket retention.
7. Commerce order/subscription/provider-event retention required for accounting, tax, disputes and reconciliation.
8. Completed external-erasure-job cleanup.
9. Groq production data-retention/training settings.
10. Any provider-specific deletion delay or legal hold that must be disclosed.

These decisions must be reflected back into this inventory and the public privacy notice. Do not fill them with generic durations.

## 8. Data-rights status

| Right / operation | Current implementation status |
| --- | --- |
| Account deletion in app | Implemented and tested |
| Public web deletion request | Implemented and tested |
| Local native traveler cleanup after deletion | Implemented |
| RevenueCat erasure retry | Implemented in durable outbox |
| Apple sign-in token revocation | Implemented in durable outbox |
| Access/privacy request contact | Public Support + privacy email path exists |
| Machine-readable/user-download data export | Implemented for signed-in native accounts as a JSON export of server-held account/profile/auth-provider/session metadata, guest links, saved walks and account-linked commerce records. Security secrets and device-only state are excluded. |
| Internal operator procedure for access/export requests | **OPEN** for requests that exceed the self-service export, including device-only state the server never received and retained staff/editorial audit references that require review. |
| Rectification | Display-name/password/profile controls exist; email-change flow remains limited |
| Analytics consent management | First-party controls implemented for browser and native analytics; both paths are fail-closed before consent, and native decline clears stored Marketing attribution |

The self-service export intentionally excludes password hashes, OAuth access/refresh/ID tokens, session tokens and internal security/audit records. It also cannot include traveler state that exists only on a user's device and was never uploaded to CITYWALK. Users can use the Support/privacy contact path for broader access questions or records that require operator review.

## 9. Store-declaration source-of-truth rule

A controlled pre-submission mapping lives at `docs/legal/CITYWALK-STORE-PRIVACY-DRAFT.md`. It is deliberately marked **DRAFT — DO NOT SUBMIT YET** and must be regenerated/reviewed when the exact release artifact or production provider configuration changes.

App Store App Privacy and Google Play Data Safety answers must be produced from this inventory **after** the production configuration is fixed.

Do not infer that an optional SDK is collecting data merely because it is installed, and do not declare it absent if production configuration activates it. Before preparing final store answers, confirm:

- whether PostHog production env values are set, provider retention is configured, and consent gating covers both browser analytics and the native first-party Marketing funnel in the exact release;
- whether Apple/Google social sign-in is enabled;
- whether RevenueCat products/purchases are enabled;
- which location permissions are present in the exact release build;
- Groq/Resend/Cloudflare/Stripe/RevenueCat provider settings;
- final support/log/backup retention policies.

## 10. Maintenance rule

Any PR that adds one of the following must update this document in the same launch cycle:

- a new analytics event carrying a new data category;
- server-side location persistence;
- a new AI/model provider;
- a new login/payment/email/support provider;
- feedback/upload forms;
- account-linked history/profile fields;
- new retention/deletion behavior;
- a new Store permission or background capability.
