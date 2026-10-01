# Phase 3C — Reviewed commit and Premium Preview/build preflight

2026-09-28. Branch `feat/premium-luebeck`. Source baseline includes Phase 1/2, the Phase 3A server Google gate and Phase 3B isolated migration/DB validation. No EAS build or real charging is authorized. No Production/develop configuration or held work is changed.

## Final source/security review

No new source blocker found in the reviewed paths. The corrected Google policy is enforced at context/provider/service/ledger/notification boundaries; explicit test flag, configured service identity and non-production deployment semantics are required. Google remains a separate acceptance track.

Apple verification uses the official library with trusted roots, signature and current transaction verification, exact `com.citywalk.app` / `com.citywalk.luebeck.premium`, Sandbox, non-consumable purchase, quantity and server-bound account token checks. No client premium flag grants access. Hashes of provider transaction identities, provider/environment-qualified uniqueness and transactional locks protect delivery/replay; cross-account claims conflict. Revocation tombstones prevent older success from restoring ownership. Raw proofs are transient and are not persisted to the application ledger.

Google acknowledgement and native finish follow durable verified delivery. Restore/resume reuses server verification and fresh account-bound access. No persisted `isPremium` authority exists. Migration 0015 is unchanged from the isolated upgrade/rerun-tested SQL.

Application code does not log receipts/tokens, and the Expo IAP JS logger is disabled before initialization. The SDK's native Debug logger remains independent: it sanitizes structured receipt/token fields and masks explicit receipt/JWS results, but error descriptions still require real-device log acceptance. Do not claim complete native log verification from JS tests. Deferred Google notifications require retry/reconciliation before re-enabling; unattended acknowledgement/missed-notification reconciliation and live Store acceptance remain launch limitations.

### Dependency audit

Fresh `npm audit --omit=dev --json` at root/mobile: **0 high, 0 critical**; **4 root moderate**, **15 mobile moderate** entries. Counts include dependent-package chains, not independent vulnerabilities. Underlying findings are [esbuild dev-server exposure](https://github.com/advisories/GHSA-67mh-4wv8-2f99), [malformed URI decoding DoS](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), and [UUID buffer bounds](https://github.com/advisories/GHSA-w5hq-g745-h8pq). No new advisory identified against the added billing packages in these audits. Potential malformed-link denial of service needs applicability tracking; no billing entitlement bypass is established by these advisory results. npm audit does not cover all native dependencies.

`expo-iap` remains pinned to 5.8.1, Apple server library 3.1.0 and Google auth 11.1.0. Better Auth remains 1.7.2 in both lockfiles. No opportunistic upgrade occurred. jsrsasign maintenance/deprecation concern remains documented in Phase 3.

## Commit scope and validation

Only premium implementation, required manifest/lock changes, migration 0015, catalogs, tests and this QA directory belong to this checkpoint. Held cache code/tests, root tsconfig modification, `.expo`, private env/signing material and stash remain excluded. The migration snapshot/journal are required schema source, not build artifacts. The saved-walk DB runner adjustment locates migration 0014 by name so its existing regression remains correct after adding 0015.

Phase 3B validated **189 focused/integration tests, zero skipped**, including original 17 billing DB cases, plus root TypeScript/lint. Phase 2 historical full suites: 934 root/shared passed (57 skipped), 592 mobile passed. These are distinct results, not a newly rerun full suite. The 67-path selective index excludes held cache/root-tsconfig work. An isolated `git archive` of the index, with the unchanged installed dependencies linked in, was used for fresh validation. No private env files were copied. Both shared workspace package sources match the index.

| Staged-source check | Result |
| --- | --- |
| `npm run test:run -- src/lib/commerce src/app/api/commerce --exclude '**/*.integration.test.ts' --maxWorkers=2` | **133 passed / 20 files**, zero skipped |
| Mobile `npm run test:run -- tests/app-config.test.ts tests/city-unlock-access.test.ts tests/city-unlock-gate.test.tsx tests/city-unlock.test.ts tests/native-billing.test.ts tests/walk-flow.test.tsx` | **129 passed / 6 files**, zero skipped |
| Mobile `npm run typecheck` | PASS |
| Root/mobile `npm run lint` | PASS |
| `npm run i18n:check` | **531 keys × 7 locales, zero errors** |
| `git diff --cached --check` | PASS |

Root TypeScript's first clean-copy run reported missing generated Next.js `PageProps`/`LayoutProps`. `next typegen` then generated route declarations in the temporary validation directory only; no application build or repository source change. The final `./node_modules/.bin/tsc --noEmit --incremental false` rerun **passed (exit 0)**. Existing Vite configuration/punycode warnings remain; no unhandled test errors. The added-line credential scan found only the deliberate loopback-only disposable-test default; no private connection strings or signing material. Required migration snapshot/journal and manifest/lock dependencies are included. The existing isolated DB result is reused because application/schema files remain unchanged; this task does not claim a new remote migration or Store acceptance.

## Preview safety stop

Read-only Git check: remote `feat/premium-luebeck` is absent. Existing linked Vercel project is `lubeck-ai-guide`. Authenticated CLI `vercel env ls preview feat/premium-luebeck` reports **no exact-branch variables**. No feature branch was created remotely, no settings were changed, and no push occurred.

| Required exact-branch binding | Result |
| --- | --- |
| `DATABASE_URL` | MISSING; dedicated Premium resource identity/isolation unverified |
| `BETTER_AUTH_SECRET` | MISSING |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | MISSING |
| `CITYWALK_NATIVE_BILLING_MODE=sandbox` | MISSING |
| `CITYWALK_NATIVE_ACCOUNT_SECRET` | MISSING |
| `CITYWALK_NATIVE_SANDBOX_USERS` | MISSING; must identify synthetic test accounts only |
| `CITYWALK_APPLE_PRIVATE_KEY`, `CITYWALK_APPLE_KEY_ID`, `CITYWALK_APPLE_ISSUER_ID`, `CITYWALK_APPLE_ROOT_CERTIFICATES` | MISSING |
| `CITYWALK_GOOGLE_TEST_PURCHASES=0` | No exact override; source default is disabled |

The general environment metadata lists a shared `DATABASE_URL` record scoped to Production, Preview and Development. Without a dedicated Premium override, pushing is unsafe. No generic fixed `BETTER_AUTH_URL` was observed; the existing fixed value is scoped to develop. Missing exact overrides must not be replaced with assumptions about shared Preview records. No existing lifecycle/develop database is repurposed. No secret/env pull or database connection was needed to establish this stop condition. Better Auth supports dynamic `VERCEL_URL`/`VERCEL_BRANCH_URL` when no fixed `BETTER_AUTH_URL` applies; effective feature configuration is not yet accepted.

Before push, operator must supply an approved dedicated disposable Premium PostgreSQL resource with no real accounts/payments, establish exact-branch Preview bindings, verify actual resource separation and writable migration rights, and verify auth/rate-limit compatibility. If Vercel requires the branch to exist first, use a separately reviewed branch-registration/deployment-block flow; **do not push this implementation merely to create the branch**. Never change shared Production/develop env records. No Premium deployment URL/SHA, remote migration or remote security-smoke PASS exists yet.

## App Store operator preparation (not executed)

App: CITYWALK. Bundle: `com.citywalk.app`. Product: `com.citywalk.luebeck.premium`. Type: **Non-Consumable**. Reference name: **CITYWALK Lübeck Unlock**. Germany target price: **€6.99**. Runtime UI must use Store-localized price, not a hardcoded target.

Proposed Store metadata (display names ≤30 characters, descriptions ≤45):

| Locale | Display name | Description |
| --- | --- | --- |
| de | Lübeck freischalten | Einmal Zugang zu deinem Stadtrundgang. |
| en | Unlock Lübeck | One-time unlock for your personal city walk. |
| da | Lås Lübeck op | Engangsoplåsning til din personlige bytur. |
| sv | Lås upp Lübeck | Lås upp din personliga stadsvandring. |
| nl | Ontgrendel Lübeck | Eenmalig toegang tot je eigen stadswandeling. |
| es | Desbloquea Lübeck | Desbloqueo único para tu paseo personalizado. |

Review notes proposal: “One-time CITYWALK account-bound Lübeck unlock for the personalized guided walking experience, adaptive walking, stories where available and bounded Ask CITYWALK local help. Core exploration, planning, account and Saved Walk behavior remains free. Content/audio availability depends on place and language. No admission or transport tickets; no unlimited-AI or complete-language-audio promise. Purchase/restore is verified by our server. The current integration is sandbox-only.” Add actual review instructions and a review account only in App Store Connect's private review fields when a review submission is separately authorized; no credentials belong here.

Capture an actual sandbox paywall review screenshot after an approved build and product lookup; do not fabricate a screenshot or reuse old binary evidence. In App Store Connect, associate the product with the exact CITYWALK app, enter localizations/pricing and required metadata, and inspect the resulting status for sandbox eligibility. Do not submit for sale, promote the purchase, enable real charging or change storefront availability under this task. Record a real Store response for price lookup once testing is possible.

Operator checks still **UNVERIFIED**: active Paid Applications agreement; any required tax/banking completion; app/product association and product status; In-App Purchase capability; Sandbox Apple Account; Apple team, certificate and provisioning profile for this exact bundle. No authenticated App Store Connect evidence was available in this review. Apple requires an active agreement for sandbox testing; sandbox uses test accounts without real charges. Sources: [IAP setup](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/overview-for-configuring-in-app-purchases/), [sandbox overview](https://developer.apple.com/help/app-store-connect/test-in-app-purchases/overview-of-testing-in-sandbox/), [metadata limits](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-information/).

## Apple notifications and EAS gate

After a verified isolated deployment, configure only the **Sandbox** App Store Server Notifications V2 URL to that deployment's public HTTPS `/api/commerce/native/notifications/apple` endpoint. Preserve the Production URL. Apple may send sandbox events to Production URL if Sandbox URL is omitted; configure explicitly. Ensure Apple can reach the signed-notification endpoint without interactive Preview protection, without broadly disabling project protection. Request an Apple Sandbox test notification and correlate receipt before claiming live acceptance. Sources: [server URL setup](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/enter-server-urls-for-app-store-server-notifications/), [test notification](https://developer.apple.com/documentation/appstoreserverapi/request-a-test-notification).

`billing-sandbox` is an internal development client, Debug iOS, Preview environment; Expo config chooses **com.citywalk.app**, not `.dev`. `expo-iap` is included and its plugin pins OpenIAP Apple 3.6.0 / Google 3.6.1. The profile intentionally has no fixed API origin. It requires an explicitly configured credential-free HTTPS origin and must point to the exact Premium verifier deployment. There is no accepted Premium origin yet. Neither profile presence nor a `.dev` client proves correct signing/capabilities for the Store bundle. No signing mutation, prebuild or EAS build was run.

**SAFE TO PUSH: NO. SAFE TO BUILD IOS SANDBOX CLIENT: NO.** The missing exact-branch isolation/configuration blocks push. Product, tester, signing, live verifier/notification and source-matched deployed backend checks block a later build. A coherent local source commit may still be created as explicitly authorized. Production/develop and held work remain untouched.
