# CITYWALK develop runtime candidate — 19 October 2026

Tracker: #395. Scope: Public Web required; Mobile Core backend compatibility required; native device acceptance not performed; Admin Web regression coverage only. This is a local audit and uncommitted safety patch, not a production release approval.

**GO for founder/engineer review of this local candidate. NO-GO for production release.** The target Vinext runtime passed local acceptance, but schema snapshot drift, legal approval and operational evidence remain open. No commit, push, merge, deployment, payment, cron, DNS, secret or Store action was performed. Production remains unchanged.

## Source and integration decisions

- Worktree: `citywalk-landing-runtime-rc`; branch: `codex/landing-runtime-rc`.
- Base, current HEAD and inspected `origin/develop`: `689cb46c1f252ffdd7875c71d2ba9024ca1b450b`.
- Inspected `origin/main`: `88191e77e55a489804c49bccccf6307b5876b41d`.
- Merge base: `9cc1f493c503b2e97dbd15297d7b8c86abeedd0a`; divergence 7 main-only / 904 develop-only commits. Remote refs were inspected locally, not refreshed or pushed.
- Read previous sibling worktree `docs/deployment/ORIGINAL-LANDING-395-INTEGRATION-AUDIT.md` and `ORIGINAL-LANDING-395-SOURCE-MANIFEST.json` before application edits, plus #395 and its scope comments, architecture/workflow instructions and installed Next route documentation.
- Previous main-based NO-GO remains valid. This candidate uses develop's entire existing runtime as its base; it does **not** establish that all 904 commits are approved for production. A release owner must assess that aggregate delta and migration compatibility.
- All 25 source-manifest entries still match SHA-256 exactly. LandingPreview, closing component, CSS, imagery and dependencies were not edited. Four browser widths were captured (320/390/768/1440). No overflow or broken images was observed; mobile and desktop screenshots were inspected. No archived localhost:3000 reference pixels were available, so exact screenshot equivalence to that historical rendering is unverified; source equivalence is verified.
- Other worktrees, `citywalk-preview-review/`, rejected Coming Soon files, prior local overrides and private legal configuration were not changed or read for this work.

Four main-only changed paths were reconciled by inspection:

| Path | Decision |
|---|---|
| `.github/workflows/cloudflare-prebuilt-artifact.yml` | Do not import or run optional hosted build. Local gates require no paid GitHub Actions. |
| `mobile/package.json` | Keep develop's newer Expo patch set (57.0.30 versus main 57.0.26); no downgrade. |
| `mobile/package-lock.json` | Keep lock paired with develop manifest; no dependency changes. |
| `vercel.json` | Develop already preserves `git.deploymentEnabled: false`. Do not import obsolete framework/install/build settings. |

## Active Worker evidence and limits

Authenticated **read-only** `cf workers deployments list --worker citywalk-production` confirmed deployment `45fd198d-aa36-4cab-aadc-c2230217d3a4`, created `2026-10-04T23:06:50.854787Z`, with version `4c18d94c-f9a8-4102-b887-145bc3ad499d` at **100% traffic**.

Read-only version metadata confirmed version 6, created `2026-10-04T23:06:48.557667Z`, compatibility date `2026-10-03`, `nodejs_compat`, and assets not-found behavior `none`. `checkActiveVersion()` compared the live version against the checked-in baseline successfully. Raw metadata and secret values were not saved or printed.

The 16 preserved bindings are ASSETS, BETTER_AUTH_SECRET, BETTER_AUTH_URL, CITYWALK_CONTENT_SOURCE, CITYWALK_DATABASE_RUNTIME, CITYWALK_EMAIL_FROM, CITYWALK_MEDIA_S3_ACCESS_KEY_ID, CITYWALK_MEDIA_S3_BUCKET, CITYWALK_MEDIA_S3_ENDPOINT, CITYWALK_MEDIA_S3_REGION, CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY, CITYWALK_MEDIA_STORAGE, DATABASE_URL, GROQ_API_KEY, HYPERDRIVE and RESEND_API_KEY. Hyperdrive identity and nonsecret configuration were compared in memory; secret presence/type is not proof of correctness.

The candidate's existing source config has six additional declarations relative to that live version: runtime environment, legal entity type, country, operator name, street and postal city. The baseline labels these reviewed additions; this audit does not grant legal publication approval or authorize their production configuration. No source config changed.

**No source-SHA provenance is established for the live version.** Matching bindings does not establish matching code, schema or behavior. The CLI Worker metadata did not expose complete zone routes/custom domains; authoritative active route/domain inventory remains **NOT VERIFIED**. Obtain that inventory before any production release. No production database or live API behavior was probed.

## Narrow local fixes

Develop initially exposed a Stripe Web checkout path and public guide generation. This contradicts the requested native-only purchase and disabled public-AI release policy.

- `/api/commerce/checkout` now immediately returns `503 WEB_CHECKOUT_DISABLED`, `Cache-Control: no-store`, without authentication/database/provider imports.
- `CommerceCheckoutButton` renders native-app purchase information without a purchase button, redirect, client state or analytics call. Existing caller props remain compatible. LandingPreview does not use this component.
- Stripe provider checkout creation always rejects, including synthetic test/live-key configurations. Historical Stripe webhook verification and reconciliation remain unchanged.
- Public guide POST returns 503 before body parsing or provider work. Eligibility returns false before content reads. The new policy is code-level disabled; an environment flag cannot enable it.
- Existing domain tests explicitly mock the policy on to preserve coverage of underlying guide behavior. Separate release-policy tests assert the actual closed policy.
- No rights, entitlements, account data, historical erasure jobs or existing migrations were removed. No dependency, production binding, route redirect or asset fallback changes were made.

Changed application/test files: `src/app/api/commerce/checkout/route.ts`, `src/components/commerce/CommerceCheckoutButton.tsx`, `src/lib/commerce/stripeProvider.server.ts`, `src/app/api/guide/route.ts`, `src/lib/guideEligibility.server.ts`, new `src/lib/publicReleasePolicy.ts` and `.test.tsx`; test-only mock changes in guide `route.test.ts`, `route.generic.test.ts`, `walk-context.test.ts`, `src/lib/guideEligibility.server.test.ts`, and `src/app/[locale]/lubeck/[slug]/page.test.tsx`.

## Runtime and privacy findings

- `/`, `/explore`, all five legal/support/deletion pages, robots, sitemap, city-content API and `/open/lubeck/synthetic` returned 200 in the isolated built Worker. There is no new wildcard redirect or SPA fallback.
- Anonymous account export and deletion returned 401; anonymous auth session returned null. Lifecycle integration verified account ownership/authorization, transactional deletion, export and durable provider-erasure jobs on a new disposable database.
- RevenueCat webhook returned 503 without configuration. Mocked unit coverage validates signatures and event handling; no real provider was contacted. Real delivery/retry acceptance and production RevenueCat secret configuration remain unverified.
- App association routes returned 503 when unconfigured and 200 with synthetic Apple team/fingerprint configuration. This tests shape/configuration handling, not real signing certificates or device universal/app-link behavior.
- Native billing remains on its existing sandbox/test design. Production subscriptions, real purchase verification, restore, refunds, renewals and device acceptance are not approved here. Do not bypass sandbox guards; in particular audit Apple sandbox environment identity for Cloudflare rather than relying solely on `VERCEL_ENV`.
- Source search across `src`, `packages`, `mobile`, `scripts` and Cloudflare config found no canceled 28-day/free-launch-policy identifiers or phrases. No #391 code was imported. This is a scoped source check, not an assertion about external store product configuration.
- `shared_walk_links` exists in schema and committed migration 0026, but no public sharing route/consumer was found in inspected source. Do not expose or activate it as part of this landing release.
- PostHog configuration was absent from the isolated build/runtime. Browser external requests were blocked and **zero external request attempts** were observed for the tested homepage. This does not certify consent when analytics is enabled: the develop consent setter still swallows failed storage writes, allowing a stale grant. Analytics activation is blocked pending the separately requested withdrawal-persistence fix and browser/cross-tab acceptance. Build-time analytics settings are not proven by Worker binding inspection.
- The Worker opens a database connection even for the homepage. Local tests used a fresh loopback database, never the existing development or production database. Database availability remains a homepage availability dependency.

## Legal publication gates — implementation facts, not legal signoff

Incomplete operator configuration displays a prelaunch warning and noindex on privacy/terms/imprint. Synthetic-complete configuration removes that warning. This is structural validation only, and pages still return 200; it is not an access-control barrier or proof of lawful publication. Support and deletion routes remain publicly accessible. The source support contact is `support@getcitywalk.com`; mailbox operation was not tested.

No real operator identity was accessed, printed or committed. The owner/legal reviewer must privately approve individual/company disclosures, applicable registration/tax/Wirtschafts-ID details, controller/contact disclosures, German-language clarity, actual purposes/legal bases/retention, processors/DPAs/transfers, consent/device storage, native-only commercial terms and cancellation/refund descriptions. No tax status, registration, retention period or legal fact was invented. Current operator schema does not itself establish applicability or completeness of these requirements.

Original approved marketing content remains intact, including conditional guide/native-app descriptions. Founder/legal review must reconcile claims with actual release capabilities; preserving the approved design is not a new promise of native availability.

External erasure still needs operational approval: current scheduler requires both Apple and RevenueCat configurations, has no source production cron, and provider-specific jobs must not be dropped or silently completed. Existing exponential retry/lease logic is covered locally; backlog state, active trigger inventory, monitoring alerts and real provider permissions were not inspected. Provider error strings stored by the existing worker require privacy review before exposing operational logs. Do not activate a cron or run the erasure processor with real credentials during candidate review.

## Actual validation

| Check | Result |
|---|---|
| Focused unit/component/API tests | **87 passed, 0 failed, 0 skipped**, 13 files |
| Complete root Vitest suite | **1,447 passed, 0 failed, 133 skipped**, 232 passed/19 skipped files; integration skips are not passes |
| Separate lifecycle integration | **25 passed, 0 failed, 0 skipped**, 4 files; newly created loopback DB migrated and removed |
| Built Vinext local runtime | **32 passed, 0 failed**, including four responsive widths, legal modes, API rejection and synthetic app links |
| ESLint | Pass; **0 errors, 8 existing warnings** |
| Next route type generation + root TypeScript | Pass |
| Cloudflare TypeScript | Pass |
| `npm run build:vinext` | Pass |
| Cloudflare bundle check | Pass: 9 required pages, 7 required API handlers; additional routes tested locally |
| Source/generated binding contract | Pass: 16 preserved, 6 baseline additions; restored original generated config after local acceptance |
| Authenticated active-version binding contract | Pass: 16 baseline bindings |
| Standard `npm run build` (Next, sanitized environment) | **Failed** during admin prerender: missing BETTER_AUTH_SECRET. Not the target Vinext build; no private config loaded to bypass it. |
| `npm run db:generate` | Command exited 0 but **gate FAILED**: generated duplicate shared_walk_links migration |
| `npm run db:migrate` | Pass on disposable lifecycle and runtime databases only, before generation of duplicate migration |
| `npm run db:verify` | **NOT RUN**: requires populated operational catalog; disposable databases intentionally unseeded. Production catalog unverified. |
| `git diff --check` | Pass |
| Remote Preview, native devices, live providers, production schema/content | **NOT TESTED** |

Initial test failures (9 guide + 1 landmark expectation) were from newly disabled AI conflicting with old always-on test expectations; domain tests were isolated explicitly and the final suite passes. Initial runtime harness used the wrong RevenueCat URL and received the expected 404; corrected to `/api/commerce/webhooks/revenuecat`, final run passes. Initial TypeScript fixture lacked required locale; corrected and final typecheck passes. These are local development results, not evidence of production incidents.

**Schema blocker:** migration 0026 already creates `shared_walk_links` with an object-shape CHECK. `db:generate` nevertheless generated a second CREATE TABLE because the snapshot chain does not represent that committed migration. The generated migration does not reproduce the CHECK either. Stop and reconcile migration snapshots in a separately reviewed change; do not apply the duplicate. Generated SQL/snapshot/journal are quarantined under `.citywalk/runtime-rc/schema-drift/`. Only this command's generated files were removed from the migration chain, and its journal edit was restored to the initially clean HEAD bytes. Existing migrations are unchanged.

Local evidence (ignored, not committed): `.citywalk/runtime-rc/` contains final test logs, build logs, `runtime-results.json`, `active-inventory.json`, `acceptance.mjs`, migration logs and `home-{320,390,768,1440}.png`. The acceptance harness replaces only generated build bindings temporarily, starts loopback Vite preview, blocks browser egress, creates/migrates a unique disposable database, then stops preview, drops only that database and restores generated config. It never starts a scheduled trigger or supplies provider credentials.

The build's embedded revision remains HEAD; it does not include uncommitted patch identity. The companion evidence manifest records changed-file hashes. Preserve these logs with the reviewed patch if the candidate is later committed.

## Isolated Preview and release/rollback plan

A nonproduction local Preview is demonstrably safe under the controls above. A remote Preview is feasible **only after separate authorization and configuration review**: unique Worker/domain, independent database + Hyperdrive, independent media storage, synthetic auth/operator data, no production service bindings, no cron, no live provider credentials, no analytics, no checkout, no public indexing of synthetic legal identity, and restricted access. Do not deploy the checked-in production config unchanged as a Preview. Remote Preview was not created.

Before production approval:

1. Resolve schema snapshot drift; inventory actual production migration state through a separately approved operator process, and prove backward/forward compatibility. Review all develop-vs-live runtime changes; live source SHA remains unknown.
2. Obtain authoritative zone route/custom-domain, Worker trigger and binding inventory; preserve API/auth/webhook/media/.well-known/open paths and origin. Record exact candidate artifact hash and frozen commit after founder review.
3. Obtain private legal/operator publication approval, privacy/consent approval and verified support operation. Keep analytics unconfigured until its persistence defect is fixed and tested.
4. Finish isolated remote Preview/manual founder acceptance including historical visual baseline, content/media, authentication callbacks and signed device app links. Run release-mode auth build/configuration validation; separately approve native billing design and sandbox devices before any paid launch.
5. Resolve provider erasure scheduling/alert/recovery ownership without losing pending jobs. Monitor 5xx/auth failures, database connectivity, webhook retries and erasure backlog with sanitized aggregate events; assign on-call and rehearse recovery in isolation.
6. Obtain explicit approval for production rollout. No paid CI prerequisite is introduced.

Rollback target is currently version `4c18d94c-f9a8-4102-b887-145bc3ad499d` at 100%. Before rollout, verify this artifact is still retained, its bindings/secrets remain compatible and the database supports both versions. Traffic rollback does not undo schema/data mutations, secret rotation or provider actions. If compatibility is not proven, rollout is NO-GO. After any separately approved rollout, failure of homepage/legal/API/auth checks or increased operational errors should trigger the approved traffic rollback and incident review. No rollback command was executed here.

**Handoff:** READY for local patch review; BLOCKED for production release; NOT TESTED for remote Preview, real native devices/provider operations and production catalog. Keep all changes local and uncommitted pending founder review.
