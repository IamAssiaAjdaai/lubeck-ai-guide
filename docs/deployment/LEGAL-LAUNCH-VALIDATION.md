# CITYWALK launch-readiness implementation report

14 October 2026. Branch: `codex/legal-cloudflare-launch-readiness`, based on fetched clean `develop@2bb716a725ed35a8515811ca7f55d6dca538e4de`. The unrelated untracked `citywalk-preview-review/` directory was not modified, deleted, staged or used for validation.

## A. Existing functionality reused

Existing landing components and root cutover, `/explore`, localized traveler/account/walk/pass routes, public Support and account deletion, Privacy/Terms/Imprint foundation, browser/native consent controls, account export, transactional erasure/outbox and controlled privacy inventory/store draft. Exact modules and merged PR references are listed in [readiness and release plan](./LEGAL-LAUNCH-READINESS.md).

## B. Root cause

Public production GETs reproduced the old German city-selector homepage (HTTP 200) and all three legal URLs (HTTP 404). Local current-code Next and Worker builds contain those routes and render the marketing landing. Missing identity causes a warning/200, not a 404. A stale artifact is plausible from source/deployment chronology, but **active Worker version to Git-SHA mapping is unresolved**: read-only Cloudflare deployment-history command has no authenticated token. The supplied version prefix `4c18d94c` is not an independently verified SHA/version mapping. No DNS/build-routing cause is asserted without evidence.

## C. Code changes

| Files | Reason |
| --- | --- |
| `.env.example`, `cloudflare.config.ts` | Individual/Germany contract; runtime legal identity bindings without private values |
| `src/lib/legal.ts`, `src/lib/legal.test.ts` | Reject incomplete register pairs; shared publication date and regression coverage |
| `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, `src/app/imprint/page.tsx`, `src/app/sitemap.ts` | Request-time operator metadata/content/sitemap; privacy recipient categories include Neon/IONOS |
| `src/components/legal/LegalPage.tsx`, `src/app/support/page.tsx`, `src/app/account-deletion/page.tsx` | Support/legal navigation, absolute deletion canonical and long-contact text reflow |
| `src/components/landing/LandingClosing.tsx`, its test | Honest prelaunch footer wording without redesign or fake store/social controls |
| `mobile/src/lib/analyticsConsent.ts`, its native test | Serialize writes; immediate withdrawal; fail closed on storage errors and concurrent choices |
| `mobile/src/app/legal.tsx` | Show effective preference and tolerate failed attribution cleanup |
| `mobile/src/lib/marketingPerformance.ts`, its native test | Recheck consent before send and assert consent to the endpoint |
| `src/app/api/analytics/marketing-funnel/route.ts`, its test | Drop unasserted events; test negative/positive consent and allowlisted payload boundary |
| `src/components/legal/LegalPages.test.tsx`, `src/app/productionShell.test.ts` | Positive/negative runtime identity, metadata/navigation/sitemap tests |
| `scripts/check-cloudflare-build.mjs`, its test | Bundle/API/SSR/legal binding/provenance gate; reject incomplete artifacts |
| `scripts/check-launch-routes.mjs` | Loopback-only content/metadata/API/large-text smoke acceptance; no operator screenshots |
| `scripts/check-legal-configuration.ts` | Owner file/env structural preflight without logging identity values |
| `tsconfig.json`, `tsconfig.cloudflare.json`, `eslint.config.mjs` | Isolate Worker global types; exclude generated output from application lint |
| `package.json` | Expose legal preflight, bundle gate and isolated Worker typecheck commands |
| `.github/workflows/cloudflare-vinext-validate.yml`, `cloudflare-prebuilt-artifact.yml` | Broader source triggers; check routes/SSR/runtime bindings and package source evidence |
| `.github/workflows/landing-preview-validate.yml` | Disposable PostgreSQL; positive/negative legal route smoke on one compiled artifact |
| `docs/deployment/CLOUDFLARE.md`, both legal inventory/store docs, this report and readiness plan | Exact evidence, remaining owner facts, limitations and separately authorized release/rollback |

No application schema/migration, route relocation, planner/AI/content trust, billing enablement, traveler authentication requirement or production configuration/data mutation was added.

## D. Validation

Final gates ran in an isolated tracked-source copy at `/tmp/citywalk-launch-validation`, with local dependency copies and explicitly disposable localhost settings. This avoids discovering the unrelated nested checkout and avoids loading repository `.env*` secrets. Local Worker preview used a temporary generated-config override pointing Hyperdrive only to the disposable database; that modified preview artifact must never be deployed.

| Command / check | Final result |
| --- | --- |
| `npm run test:run` | **1,410 passed, 133 skipped**, 228 passing files / 19 skipped files; no failures |
| `npm run mobile:test` | **773 passed**, 93 passing files; no failures |
| Focused legal/endpoint/bundle tests | **20 passed**; broader earlier focused legal/landing/disclosure set **38 passed** |
| `npm run lifecycle:test:integration` | **25 passed** in guarded disposable PostgreSQL, including deletion/external outbox/export isolation and secret exclusion |
| `npm run lint` | Passed: zero errors, eight existing warnings |
| `npm run mobile:lint` | Passed, zero warnings allowed |
| `npx tsc --noEmit` | Passed after Cloudflare build; no errors |
| `npm run mobile:typecheck` | Passed |
| `npm run build:vinext` | Passed; preserved landing/legal/traveler/API routes |
| `npm run check:cloudflare-build` | Passed: 9 page routes, 7 API handlers, SSR module and runtime legal bindings; full baseline SHA recorded for local modified-source build |
| `npm run typecheck:cloudflare` | Passed |
| `npm run deploy:vinext:dry-run` | Passed; explicitly no build/upload/deploy performed |
| `npm run build` | Passed **after** Worker build, legal pages and sitemap dynamic |
| `npm run db:generate` | Passed: no schema changes/drift |
| `npm run db:migrate` | Passed only in disposable `citywalk_launch_audit` on loopback |
| `npm run db:seed`, `npm run db:verify` | Passed only in disposable DB: 1 city / 25 places |
| `node scripts/check-launch-routes.mjs` | Passed on Next and local Worker, **both** missing and synthetic runtime identity, on the same compiled artifacts. 9 page routes + content/auth/export checks; export 401 for guest; unasserted funnel 204 |
| `node scripts/check-landing-preview.mjs` | Passed: 320/390/768/1440px, 200% text, reduced motion, keyboard skip/FAQ, no-JS FAQ, homepage and `/explore` |
| `node scripts/check-account-deletion-e2e.mjs` | Passed on loopback with `CI=true`, fake email key and nonexistent synthetic account: generic request accepted; invalid-token confirmation rejected. Initial run correctly returned 503 without the required CI-only HTTP-origin guard; rerun used the documented CI configuration |
| `npm run legal:check` | Negative case exits 1 with field names only; synthetic positive case exits 0. Structural check only |
| `node --check` for new `.mjs` scripts, `git diff --check` | Passed |

No formatter command is configured in `package.json`; lint and whitespace/syntax checks were used. Skipped database suites are not passes; the affected lifecycle/export suite ran separately against real local PostgreSQL.

Observed and repaired validation failures: Next/Turbopack disallowed an external dependency symlink (replaced with local test-copy dependencies); generated Cloudflare declarations polluted application Response types (isolated configs); lint scanned generated bundles (ignored outputs); legal email overflowed at 200% text (fixed wrapping). A test-only role option typo was corrected. None establishes a production defect or deployment result.

Local routes do not prove production publication, OAuth/provider completion, email inbox delivery, store approval or either native device acceptance. No private identity screenshot was taken.

## E. Remaining blockers

- **Technical evidence:** authenticated active Worker version/source-artifact mapping, isolated infrastructure Preview acceptance, latest production migration-journal comparison and full OAuth/share/media/lifecycle acceptance on the approved candidate.
- **Configuration:** real public operator name and usable postal address; any genuinely applicable register/VAT bindings; reviewed provider/runtime settings; external erasure processor/cron activation and completion evidence. No production values were changed.
- **Privacy/legal:** provider DPAs/transfers and retention/training, support/log/backup/deletion propagation, native attribution lifetime, commercial terms and owner rights-handling procedure approval. Storage failure on both write and cleanup cannot guarantee remembered withdrawal after app restart.
- **Store/device:** final declarations/manifests/privacy reports, exact signed artifacts, iOS and Android consent/deletion/export and full traveler device QA. Existing store draft remains “DO NOT SUBMIT YET.” No store listing links were invented.

## F. Safe release plan

The [readiness plan](./LEGAL-LAUNCH-READINESS.md#safe-release-and-rollback-procedure--owner-approval-required) provides the exact read-only deployment-history, prebuilt build/check/dry-run, separately approved production command, post-release acceptance and full-version rollback commands. Preserve `getcitywalk.com` mobile/API/auth origin and all existing travelers; `app.getcitywalk.com` remains a separate unprovisioned/unverified migration proposal. No production command in that procedure was executed.

## G. GitHub

Dedicated branch: `codex/legal-cloudflare-launch-readiness`; target `develop`. Draft PR requested by the owner; commit/PR URLs and issue updates are reported in the handoff. References: #265, #109, #187, #234, #230, #34. No issue completion, merge, direct `develop`/`main` commit or automatic production deployment is authorized by this report.

## H. Final status

**BLOCKED — NEEDS OWNER INPUT** for public launch. Code-side fixes and local production-like checks are ready for review. Real identity/legal/provider decisions, deployment provenance and separately approved infrastructure/store/device acceptance remain required. No production infrastructure or user data was changed.
