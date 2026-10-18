# Lübeck legal readiness review — 18 October 2026

Baseline: current `origin/develop` `7b78a96fa2ae274f7710a0ba3f873e3fa35bdf7e`. Scope: #265, #109, #347, #187, #387. This is an engineering audit and draft for operator/counsel review. Public launch remains blocked. No production deployment, identity lookup/publication, payment transaction or provider configuration was performed.

## Product and surface classification

Mobile Core required: shared account deletion/export, permissions, disclosures and launch access for iOS and Android. Public Web required: stable legal/support/deletion URLs, footer and consent. Admin Web: existing operational permissions preserved; no new admin feature. iOS implementation inspected; Android implementation inspected; actual iOS and Android device acceptance both unverified. EN draft copy exists; German legal-language review is outstanding. Neither a successful build nor a code merge proves live legal URLs or store compliance.

## Findings and implemented draft changes

- `/privacy`, `/terms`, `/imprint`, `/support`, `/account-deletion`, footer links and native Legal & Support links already exist. Root landing uses these routes; guest browsing does not require accepting a paywall or signing in.
- Existing `LegalPage` only warned about incomplete identity and used `noindex`; it still rendered children, including optional representative/register/VAT fields. `noindex` is not a publication/access control. This change withholds the complete legal body until identity is structurally complete AND `CITYWALK_LEGAL_PUBLICATION_APPROVED=1`. Stable navigation and support remain visible. No preview query or client flag bypass exists. Approval defaults off; synthetic test identities only.
- Identity completeness alone is not legal clearance. `legal:check` now requires explicit publication approval. The public support email was already committed; no private name/address was inferred from GitHub or credentials.
- Terms remove the internal €4.99 recommended price as a purported public offer. Draft text distinguishes a separately approved launch-access window from subscription enrollment and automatic billing. This does not activate the separate #347 policy.
- Privacy draft adds map-resource/external-directions disclosures, the consent basis for optional analytics, honest expiry-versus-deletion language, support processing, the consequence of withholding account data, optional analytics and the absence of significant automated decisions in the reviewed Guide path.
- Imprint removes the unsupported factual assertion that every external link was checked when added. Legal responsibility remains for counsel to assess.

## Data inventory reconciliation

Read alongside `CITYWALK-DATA-INVENTORY.md` and `CITYWALK-STORE-PRIVACY-DRAFT.md`. Systems below are observed code paths; deployed provider regions/contracts/settings are not verified by source.

| Data/system | Observed purpose and lifecycle | Evidence | Owner / missing launch fact |
| --- | --- | --- | --- |
| Browser visitor/session UUID | Optional consented analytics; 180d/24h logical expiry, cleared on decline | `src/lib/visitorSession.ts`, `src/lib/analyticsConsent.ts`, `instrumentation-client.ts` | Operator: PostHog region, retention, DPA and consent/device QA |
| Native visitor UUID | Guest Guide allowance; 180d logical expiry | `mobile/src/lib/visitorIdentity.ts` | Product/privacy owner: device storage erasure acceptance |
| Better Auth/PostgreSQL | Account/profile, password hash, provider tokens, sessions; 7d session validity; verification 1h, reset/deletion 30m | `src/lib/auth/factory.server.ts`, `src/db/authSchema.ts` | Operator: expired-row cleanup and Neon backup retention/region |
| Device preferences/walk/history | Guest continuity; most no TTL, Guide history count bounded; current Live Walk point can persist locally | `mobile/src/lib/guideConversationStorage.ts`, `liveWalkStorage.ts` | Product/privacy owner: maximum lifetimes and device purge QA |
| Location/maps | Foreground walking and optional native background behavior; local current point, not an observed server GPS-trail table; map tiles/CDN requests can expose IP and tile area | `mobile/src/lib/backgroundWalk.ts`, map components and styles | Operator: exact tile/style/CDN providers, licenses, background permission/store declarations |
| Groq Guide | Question, six recent messages and verified context; no prompt/answer insertion in reviewed route; precise start/finish omitted from prompt | `src/app/api/guide/route.ts` | Operator: production retention/training settings, DPA, transfers, logging boundaries; pending security #348/#354 acceptance |
| Rate limits | Hashed identifiers, timestamp, scope; code deletes rows older than 48h opportunistically during requests | `src/lib/databaseRateLimit.server.ts` | Operations: scheduled cleanup if a hard maximum physical retention is promised; 48h is NOT a guaranteed deletion deadline on an idle service |
| Resend / support mailbox | Verification/reset/deletion messages; user-written support messages and attachments | `src/lib/auth/lifecycle/email.server.ts` | Operator: delivery/mailbox retention and subprocessors; test real delivery separately |
| Stripe / Apple / Google / RevenueCat | Customer/provider IDs, orders, subscriptions, verified entitlements; account deletion detaches orders/subscriptions instead of erasing them | `src/db/commerceSchema.ts`, `src/lib/commerce/*` | Merchant/operator: tax/receipt/retention/refund/withdrawal terms; paid activation remains deferred |
| Erasure outbox | RevenueCat erase and encrypted Apple revocation intent queued transactionally; retry worker separate | `src/lib/auth/lifecycle/deleteAccount.server.ts`, `externalAccountErasureWorker.server.ts` | Operations: worker scheduling, credentials, completed-job TTL and evidence of external completion |
| Media/object storage | Approved content and editorial provenance; not a traveler-upload service | `src/lib/media/*`, `src/db/schema.ts` | Editorial/operator: rights evidence per image/audio/locale, CDN provider and retention |
| Logs/backups | Infrastructure data independent of app deletion | `docs/deployment/LEGAL-LAUNCH-READINESS.md` | Operations: actual retention, access, restore/deletion replay and alerts |

Logical expiry in client code also does not prove bytes are physically removed from a device at that moment. No fixed provider retention or accounting period is invented here.

## Data rights and account deletion

`deleteAccount.server.ts` verifies current credentials or a fresh social session, locks eligibility, and deletes the traveler user in a transaction. Server-owned auth/traveler rows and entitlements cascade; orders/subscriptions retain provider linkage with user ID null. Editorial/staff retention references produce `RETENTION_REVIEW_REQUIRED`, requiring a support decision rather than silently deleting audit provenance. A one-time verified-email web flow supports deletion without keeping the app installed. Export code and native account controls provide server account JSON, excluding credentials/security internals and never-uploaded device data.

Native local purge applies only to the device executing it. Offline/disconnected devices, backup copies, vendor records and detached purchase records require separate handling. Queuing erasure is not proof of provider erasure. Account deletion does not cancel subscriptions/refund prior purchases. Verify the erasure worker, external failures/retries, export ownership, expired/replayed tokens and local purge in isolated HTTPS acceptance; no production test account was created for this review.

Operator must own a documented rights-request process: intake through support, proportionate identity verification, request log, access/rectification/restriction/objection/portability/erasure assessment, third-party notification when required and response deadlines under GDPR Art.12 (normally one month, justified extensions with notice). Do not ask for identity documents by default or store them unnecessarily. Confirm competent supervisory authority, DPO applicability/contact, exceptional retention and processor follow-through before publishing.

## Operator/counsel decisions blocking approval

1. Public-use legal entity/name, service address and direct contact approval. Confirm legal form/representative, applicable register/VAT/economic ID, regulated-service details, editorial responsibility and dispute-resolution obligations. Existing fields do not establish whether conditional legal duties apply. Do not publish personal tax numbers.
2. Confirm every purpose/legal basis, recipients/legal entities, hosting/database/mail/maps/media/AI/analytics/store regions, DPAs/subprocessors, actual third-country transfer mechanism and how safeguards can be obtained. Generic “safeguards apply” wording is insufficient final Art.13 information.
3. Approve concrete retention periods OR meaningful criteria for each category, including provider logs/backups, commerce, detached records, support and erasure jobs; implement cleanup where policy requires it. Assign operational owners and verify configuration.
4. Verify analytics consent withdrawal, device storage failures, exception-capture redaction and any server aggregate telemetry legal basis. #347 metrics may reuse consented events; missing metrics are unavailable, not estimated installs/completions. No review rewards or sentiment-conditioned prompts.
5. Review German/English consumer terms, withdrawal/cancellation/refund process and digital-content performance consent before any paid release. Assess current BGB §356a electronic withdrawal obligations and §312k where applicable; store policy alone does not waive mandatory rights. No donation/tax classification is assumed.
6. Confirm minimum age/child use policy, accessibility obligations, media/audio rights, exact locale coverage and AI transparency obligations for the actual release. No blanket liability waiver is added.
7. Complete TestFlight/Play Beta deletion/export/consent/location acceptance separately; prepare store declarations from actual build SDKs and production settings. Draft store answers are not submitted or certified.
8. Legal operator approves final text and runtime publication flag only after these blockers are resolved. Then verify candidate routes and exact deployment SHA, public URLs/store links, no partial identity exposure and rollback. Code default remains unpublished.

## Legal sources checked

- [DDG §5](https://www.gesetze-im-internet.de/ddg/__5.html): readily accessible identity/contact and applicable conditional details.
- [TDDDG §25](https://www.gesetze-im-internet.de/ttdsg/__25.html): informed consent for terminal storage/access, with necessary-service exceptions.
- [GDPR official regulation](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32016R0679): Arts.5,6,12–22,28,32,44ff. Owner/counsel must determine application to actual processing.
- [BGB](https://www.gesetze-im-internet.de/bgb/BJNR001950896.html): consumer/digital-product requirements for any future commerce activation.

No claim of legal compliance or launch readiness follows from this draft.
