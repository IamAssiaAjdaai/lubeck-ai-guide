# Coming Soon candidate and native release gates — 19 October 2026

Target: **16 November 2026, planned and conditional**. Business decision: website acquisition only; purchases exclusively through native Apple/Google in-app purchase systems. No website subscriptions, passes, checkout or invented store URLs.

## Scope and provenance

Public Web required; Mobile Core audited, not modified; Admin Web unaffected. Starting branch `codex/public-beta-readiness`, HEAD `3679a0d`. PR #393 verified open/Draft. Initial worktree contained only the existing untracked `citywalk-preview-review/`. Existing commits, that directory, legal content, Sharp override and lockfile preserved. No private operator configuration read.

The implementation changes only root homepage content/metadata, adds `ComingSoon.tsx` and scoped CSS, and updates the existing homepage test and built-content assertion. It reuses the approved CITYWALK mark, navy/teal identity and existing support address. Server-rendered copy, decorative inline SVG, no added image/font dependency, form, video, checkout or store buttons. Internal links disable prefetch. Shared consent infrastructure is preserved, including the withdrawal fix in `3679a0d`.

A separate `coming-soon-candidate.patch` contains only these five implementation/test/check files. It is a review artifact, **not permission to deploy the readiness branch**. The secret-free local snapshot tests the integration on this branch. The exact current production source SHA has not been verified; therefore a production-based release candidate remains **BLOCKED** pending that evidence. Do not assume origin/main is the deployed revision.

## Deployment and rollback plan — separate explicit approval required

1. Release owner identifies current Worker version, deployed source SHA, artifact digest and rollback version through an authorized read-only inventory. Do not print bindings or secrets. Record sanitized evidence.
2. Create a dedicated `codex/coming-soon-release` worktree from that exact verified source; apply only the five-file patch. Resolve dependencies explicitly: existing brand component, public origin, support constant and reviewed consent infrastructure. If absent, stop for a separately reviewed dependency patch. Never cherry-pick all of PR #393 to satisfy dependencies.
3. Compare the complete release diff against production: no API/auth handlers, middleware/redirects, `.well-known`, app links, migrations, Worker bindings, cron, payments or provider configuration changes. Preserve saved city URLs. Keep public AI, checkout and unfinished sharing disabled. Verify those gates on the actual candidate, not by assuming this branch's defaults are deployed.
4. Build once in isolation, retain artifact digest, source SHA, dependency lock and test evidence. Stage on a separate local/Preview Worker with isolated bindings and synthetic legal configuration; no production DB/storage. Confirm both incomplete and synthetic-complete legal states. Legal owner privately verifies real public disclosures and support operation before publication; source links alone are not legal approval.
5. Acceptance matrix: `/`, `/explore`, saved `/en/lubeck` and other existing locale URLs; all five legal/support/deletion pages; `/api/health`, public content API, anonymous export rejection, auth callback contract; `/open/*`, Apple association and Android asset links; robots/sitemap/canonical; mobile widths, keyboard, contrast, consent denial/withdrawal, no unexpected network destinations. No wildcard routing changes. Use mock identities/providers.
6. Obtain explicit deployment approval for the **exact candidate SHA/artifact and rollback version** after legal/security/operations sign-off. Do not change DNS or replace the mobile API origin. Preserve `citywalk-production` identity/bindings when an authorized operator eventually releases the vetted artifact.
7. During the approved window, observe root/asset errors, API/auth error and latency baselines and association resources. Immediate rollback trigger: API/auth/deep-link regression, checkout exposure, legal disclosure failure, unexpected collection or broken homepage/assets. Roll back to the recorded prior Worker version/artifact, preserving bindings and database. No migration is required. Recheck the same route matrix and document incident evidence without identifiers/secrets. Rollback authorization must be included in that deployment approval.

No deployment, merge, DNS, production Worker, DB, billing or scheduler changes in this task. No paid GitHub Actions requirement; local checks and an owner-run release window suffice.

## Native audit and purchase gaps

**BLOCKED for iOS and Android launch approval.** Source evidence is not a signed store artifact or device acceptance.

| Area | Verified repository evidence | Exact remaining gate |
| --- | --- | --- |
| Build / origin | `mobile/eas.json` production declares `https://getcitywalk.com`; `app.config.ts` uses `com.citywalk.app`, development `.dev`; HTTPS origin validation exists | Verify resolved production build config, uploaded source SHA, EAS environment and immutable artifact. Production validator accepts arbitrary HTTPS origins, so separately assert the exact approved host before signing. No remote environment was read. |
| Distribution | `store-beta` uses store distribution, Android app bundle/internal draft and declared ASC app ID; production submit object empty | Owner verifies correct Apple app record/team, Play package, signing/certificates/profiles, Play App Signing, upload key, current build/version codes and authorized submit account. Declared ID is not proof of ownership or approval. |
| Account prerequisites | No live console/session audit performed | Apple membership/agreements, paid-app tax/banking setup and TestFlight groups/review; Google identity/account verification, payments profile, tester track and production access. Status UNKNOWN, not absent. |
| Product mismatch — P0 | Mobile `revenueCatPremiumCore.ts` filters annual product as `com.citywalk.premium.yearly`; server `revenueCatWebhook.server.ts` maps `com.citywalk.premium.annual` | Choose actual verified store products; align offering/package → product → webhook → DB entitlement and add contract test. Do not guess which ID exists or silently rename live products. |
| Purchase authority | RevenueCat purchase/restore callbacks feed UX; server webhooks reconcile PostgreSQL entitlements. Direct Store adapter is explicitly sandbox/tester-only | Approve a single production purchase architecture and sandbox-device E2E proof. Keep current production flags off; no bypass of `requireSandbox`. Public Premium/City Pass flags can enable RevenueCat separately, so attest actual build values, not just direct-store guards. |
| Webhooks | Authorization + timestamped HMAC required; event ID deduplication and stale-event ordering; refund/cancellation/renewal tests exist | Verify actual provider signing configuration and raw-body contract using sandbox deliveries; test retries, outages, duplicate/out-of-order events, reconciliation and alert recovery. No real provider request made here. |
| Entitlements | Code has purchase/restore/access polling, cancellation and refund handling | Verify monthly/yearly/pass mapping, expiration semantics and ownership transfer/alias policy; no entitlement from a client callback alone. Sandbox grants must never authorize production users. |
| Security / legal / erasure | Existing readiness and legal gap reports remain open | Refresh lockfile audit and triage exploitability/fixes; prior report records 11 high and 8 moderate affected packages, **historical, not a fresh scan**. Privately resolve operator registration/identifiers/contact, German notices, retention/DPAs/transfers and store privacy declarations. Approve provider erasure scheduling/backlog/alerts without dropping historical jobs. |

Required production purchase design, reviewed before implementation/activation: signed native build uses platform-specific public SDK keys; authenticated immutable account binds purchase; store-localized terms/prices and confirmation; provider verifies store transaction; authenticated signed webhook maps the approved product to canonical DB entitlement; protected APIs check server authority. Handle pending transactions, interrupted network, retries and delayed webhook with a recoverable pending UI. Restore after reinstall and across authorized devices; prevent cross-account takeover; cancellation retains access until the verified end; refunds/revocations and expiry revoke according to verified events. Renewal, grace/billing retry, upgrades/downgrades and account deletion with active subscriptions each need explicit semantics and device proof. Account deletion must explain that store subscription management is separate. Test reconciliation after missed delivery and operational rollback before sales. No web-purchase fallback.

Official references checked 19 October: [Apple IAP](https://developer.apple.com/in-app-purchase/), [Apple product submission](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase/), [RevenueCat webhooks](https://www.revenuecat.com/docs/integrations/webhooks), [Google closed testing](https://support.google.com/googleplay/android-developer/answer/14151465). Google's 12 testers continuously opted in for 14 days applies to covered new personal accounts; owner must establish applicability. Completing that period permits an application for production access, not guaranteed approval. TestFlight purchases are sandbox; restore is required for restorable Apple purchases. Store URLs may be added only after verified approval/availability.

Repository journey evidence: `mobile/tests/account-guest-flow.test.tsx`, `native-city-experience.test.ts`, `walk-flow.test.tsx`, `location.test.ts`, `native-audio-playback.test.tsx`, `account-lifecycle.test.ts`, `account-data-export.test.ts`, `app-links-config.test.ts`, `native-analytics-consent.test.ts`, `native-billing.test.ts` and `revenuecat-city-pass.test.ts` cover mocked domain/UI behavior. The standard mobile suite includes `mobile/tests/**`, not every colocated `mobile/src/**/*.test.ts`; do not call it complete device or purchase acceptance. Backend RevenueCat tests are in the core suite; PostgreSQL integration cases were skipped in this task.

## Separate platform Go/No-Go records

Each row requires **two independent results**, iOS and Android, with build SHA/version, device/OS, date, tester and sanitized evidence. Both currently **NOT TESTED in this task**; historical device readiness report is not a new pass.

- Install/cold start/upgrade; guest exploration without forced account; published Lübeck content and localization/RTL; loading/offline/errors.
- Navigation, GPS allow/deny/revoke, foreground/background/resume and route continuity; no dependence on analytics.
- Approved exact-locale audio, interruption/background behavior and missing-asset fallback.
- Account registration/login/verification/reset/provider callback, logout/account switch; export ownership/re-authentication; deletion and provider queue completion evidence.
- Universal/App Links cold/warm launch, saved city URLs, association/signing fingerprints; reject private/unapproved share routes.
- Consent first visit, opt-in, withdrawal/storage failure/restart; device permissions distinct from analytics consent; privacy disclosure matches observed network traffic.
- Sandbox monthly/yearly/pass purchase, pending/cancel/failure, restore/reinstall, duplicate/out-of-order renewal/refund/revoke, expiry/grace, account ownership isolation and deleted-account events.
- iOS-specific: valid distribution signing, TestFlight acceptance, App Privacy/required declarations, reviewer access and IAP approval, approved public listing.
- Android-specific: signed AAB/Play App Signing, Data Safety/deletion URL, current target SDK policy, closed test/production-access evidence if applicable, reviewer access and approved public listing.

Go requires all required rows accepted plus legal/security/operations sign-off. A failed platform gate is that platform's No-Go. Owner decides a staggered release explicitly; never imply both stores are available because one approves.

## Execution plan: 19 October–16 November 2026

| Dates | Owner / work | Exit evidence and dependency |
| --- | --- | --- |
| 19–21 Oct | Engineering + release owner: review teaser patch, identify production baseline, triage product-ID mismatch, verify account/testing prerequisites privately | Isolated candidate; exact source/artifact map; named owners and account status. Start eligible closed testing promptly with a suitable build; do not wait until November. |
| 22–25 Oct | Legal/operator + security: operator/contact/registration, German legal copy, provider/retention decisions, dependency remediation plan; engineering production purchase design | Signed decisions/evidence, never private identity in Git; approved architecture and product mapping. Website publication remains a separate gated decision. |
| 26 Oct–1 Nov | Engineering + QA: approved purchase fixes, webhook/reconciliation tests, isolated DB lifecycle tests; iOS/Android sandbox devices and core journeys | Separate device records, no production billing; fix all P0/P1 release defects. Tester continuity tracked where required. |
| 2–5 Nov | Store owner + QA: verify test eligibility, TestFlight/closed-test completion, submit accepted binaries/products/metadata for review when authorized | Submission receipts/builds; review requirements satisfied. Store review timing is external and not guaranteed. |
| 6–10 Nov | Operations + QA: erasure backlog/scheduling and recovery rehearsal, support/alerts, security closure, release regression | Runbooks, alert drills, restore/deletion evidence, platform Go/No-Go sheets. No cron activation without approval. |
| 11–13 Nov | Release owner + legal + engineering: freeze exact artifacts, review store decisions and all gates, obtain explicit release approval | Approved versions, rollback plan and responsible operator; otherwise reschedule and update planned messaging. |
| 14–15 Nov | QA + operations: final approved-device smoke and readiness review | All gates green for each platform; verified store URLs held until actual availability. |
| 16 Nov | Authorized release owner only: conditional launch; add verified download links via separate reviewed patch | Explicit approval and store availability required. If missing, remain Coming Soon, communicate revised plan; date is not a promise. |

## Validation evidence

See accompanying `COMING-SOON-VALIDATION-2026-10-19.md`. READY applies only to checks actually completed; production-based candidate, legal approval, store approval and native device/purchase acceptance remain BLOCKED / NOT TESTED as above.
