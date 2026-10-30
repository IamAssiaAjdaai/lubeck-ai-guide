# Issue #395 — original landing integration audit

19 October 2026. **NO-GO: stop before application implementation.** This report follows the explicit instruction to stop if a narrow production-compatible backport requires major runtime dependencies. The visual landing is separable; a safe replacement for the active production Worker from this base is not established. No application, configuration, dependency, schema or migration change was made.

## Exact scope and refs

- Worktree: `citywalk-landing-release`; branch: `codex/original-landing-release`.
- Base, current HEAD and local `origin/main`: `88191e77e55a489804c49bccccf6307b5876b41d`.
- Audited local `origin/develop`: `689cb46c1f252ffdd7875c71d2ba9024ca1b450b`.
- Merge base: `9cc1f493c503b2e97dbd15297d7b8c86abeedd0a`.
- Verified divergence: 7 main-only / 904 develop-only commits. These refs match the issue's recorded comparison; no fetch/merge/rebase was performed.
- Initial worktree clean. Four main-only paths preserved: `.github/workflows/cloudflare-prebuilt-artifact.yml`, `mobile/package-lock.json`, `mobile/package.json`, `vercel.json`.
- Public Web required; native implementation not changed. Mobile API compatibility remains a release acceptance requirement. Other worktrees, rejected Coming Soon artifacts and preview directories were not edited. No ComingSoon component/CSS, PR #391 or 28-day policy imported.

Tracker and owner evidence: [issue #395](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/395), [active version record](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/395#issuecomment-6269238611), [topology record](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/395#issuecomment-6269610583). Issue and all four comments were read.

## Production inventory: recorded versus independently verified

Owner-recorded deployment `45fd198d-aa36-4cab-aadc-c2230217d3a4`, created `2026-10-04T23:06:50.854787Z`, assigns **100% traffic** to Worker version **`4c18d94c-f9a8-4102-b887-145bc3ad499d`**. Owner-recorded GET results: root 200; all five legal/support/deletion routes 404. These observations are attributed evidence, not new live probes in this audit and not source-SHA provenance.

Independent account inventory is **BLOCKED**: no Cloudflare connector is available, no `cf`/`wrangler` executable is on PATH in this worktree environment, and the available Cloudflare browser opened the sign-in page. No credentials were requested, read, printed or entered. No software was installed or borrowed from another worktree. No production data endpoints were queried.

Still required: current deployment/traffic confirmation; version metadata and artifact/source provenance; Worker custom domains/routes; compatibility date/flags; binding names/types and resource identity (redacted where needed); asset fallback behavior; schedules; version rollback eligibility. Do not retrieve secret values or private legal identity. The checked-in develop config is not an inventory of live settings. The exact reason for production 404s is not established.

## Visual dependency map

`src/app/page.tsx` on develop renders `LandingPreview` and imports `src/lib/site.ts` for canonical metadata. It requires:

| Dependency | Main status / minimal treatment if runtime is recovered |
| --- | --- |
| `src/components/landing/LandingPreview.tsx` | Absent; copy byte-for-byte from approved SHA |
| `LandingClosing.tsx` | Absent; supplies FAQ, launch section and footer; copy unchanged |
| `landing.module.css`, `closing.module.css` | Absent; preserve exactly, including media queries, spacing and waterfront background |
| `src/components/brand/CitywalkLogo.tsx`, `src/lib/brand.ts` | Absent; inline SVG mark/wordmark and brand constants; copy unchanged |
| `src/data/cityAvailability.ts` | Already byte-identical; re-exports traveler-core map |
| `packages/traveler-core/src/cityAvailability.ts` | Whole file differs, but exported city metadata/type declaration is identical. Develop adds launch-description/i18n dependencies that this landing does not need. Do not copy the entire package or i18n chain. |
| `src/app/globals.css` | Byte-identical |
| `src/app/layout.tsx` | Same Geist/Geist Mono font foundation; develop adds metadata base and consent banner. Do not blindly replace the layout or shared tracking/auth consumers. |
| `public/images/citywalk-waterfront.webp` | Already byte-identical, referenced by CSS |
| `public/images/city-hamburg.webp`, `city-duesseldorf.webp`, `public/landmarks/holstentor.jpg` | Already byte-identical; city card backgrounds and credits |
| `public/brand/citywalk-mark.svg` | Absent; referenced by brand asset constant, while this landing uses inline SVG. Preserve source asset if included; no substitute imagery. |

The components' dependency closure is React/Next Link, these brand and city modules, and scoped CSS. Links are in-page anchors, the existing support mailto, and five public routes. No Marketing SaaS, purchase SDK or database import is required by the visual component itself. Main has Next 16.3.4 and no installed dependencies in this worktree; develop has additional runtime/dependency changes. The framework guide must be read from the actually installed candidate version before future code work.

Source byte hashes are recorded in the accompanying manifest. They establish source identity, **not founder visual approval**. The original localhost:3000 screenshot/hash baseline has not been supplied or captured here; develop's visual identity to that original remains unverified. Do not rebuild from memory or call the rejected Coming Soon screenshots a baseline.

## Five routes and non-visual dependencies

- `/support`: Next Link + `legal.ts` support constant + `site.ts`. Mechanically small, but mailbox operation and published advice still need owner review.
- `/imprint`: request-time `connection()`, `LegalPage`, `legal.ts`, `site.ts`; requires approved runtime operator fields. Do not fabricate values or bake them into assets.
- `/terms`: same legal shell plus links. Exact release behavior and native-only IAP policy require content review; copying develop text is not legal approval.
- `/privacy`: same shell **plus AnalyticsConsentPreferences** → `AnalyticsConsentControl` → consent state, visitor identity, PostHog, pathname/subscriptions. Main initializes configured PostHog without this consent gate. Develop's control still has the old persistence/reload implementation; importing it is not a reviewed withdrawal fix. Consent/analytics must be explicitly scoped against the recovered production runtime, without silently importing broad security changes.
- `/account-deletion`: `AccountDeletionRequestPanel` calls POST `/api/account/delete-request` and `/api/account/delete-confirm`. Both are absent on main. Their develop handlers depend on lifecycle HTTP/errors/rate limiting, email verification and deletion service; the deletion service imports `externalAccountErasureJobs` and broader auth/schema dependencies. Main's auth/commerce/DB schemas differ. Copying the page would advertise a broken rights-request flow; copying the chain would breach the no-new-migrations/narrow-release scope without a separately reviewed compatibility design.

Develop's `LegalPage` shows an incomplete-configuration warning, but presence checks are not legal review approval. A candidate needs explicit fail-closed publication behavior when required identity/review is unavailable. No placeholder identity, fake deletion success or legal-compliance claim was introduced here.

## Blocking runtime and operational mismatch

Main lacks `vite.config.mts`, `cloudflare.config.ts`, `src/cloudflare/entrypoint.ts`, and package scripts `build:vinext`, `check:cloudflare-build`, `check:cloudflare-bindings`, `deploy:vinext:dry-run`. Its main-only Cloudflare workflow nevertheless references build/dry-run scripts that are absent. Do not run or rewrite that workflow; it is not evidence of a reproducible production build.

The selected base also lacks these required route implementations:

- `/api/account/export`, `/api/account/delete-request`, `/api/account/delete-confirm`;
- `/api/commerce/webhooks/revenuecat`;
- `/.well-known/apple-app-site-association`, `/.well-known/assetlinks.json`;
- `/open/[citySlug]/[marketingSlug]`.

Existing auth/content/media/Stripe routes in main are not proof that it matches the live Worker. Native Apple/Google and RevenueCat lifecycle compatibility must be inventoried, not assumed from generic auth or Stripe routes. Develop adds request-scoped Hyperdrive DB integration, lifecycle/schema changes and numerous unrelated modules. Importing its runtime wholesale to obtain a build would create precisely the uncontrolled integration the user prohibited.

Native-only IAP, preserved historical rights/reconciliation, public AI OFF, unfinished sharing OFF and no 28-day windows are required acceptance gates. No source or runtime setting was changed to satisfy them speculatively; no claims are made about their active production values. Keeping old main code is not a certification of those gates.

## Minimal safe next strategy

1. Owner supplies authenticated **read-only** Worker metadata inventory or access to an existing authenticated dashboard, with secret values and private identity excluded. Confirm active version and preserve the complete rollback artifact/settings record.
2. Recover the exact source tree, dependency lock and build recipe that produced that Worker, or independently prove an equivalent reproducible operational baseline. Link artifact digest/version to source through build records; a familiar homepage or matching dates is insufficient.
3. Compare that baseline against the preserved main-only changes. If the runtime exists only in an untracked/deleted historical source or artifact, treat recovery as its own release-engineering task. Do not silently claim main is production or merge 904 commits.
4. Once operational routes are available, apply only unchanged visual files/root metadata and existing asset references. Use the existing city metadata; avoid unnecessary traveler-core/i18n imports. Restore the five public routes only against verified backend contracts. If account lifecycle/runtime implementation is genuinely absent, separately scope and approve that prerequisite, including schema compatibility; do not fake it in a landing patch.
5. Establish the founder-approved localhost screenshot/source baseline and compare exact-size renders of the production-compatible candidate. Review legal publication privately. Keep native IAP-only/no campaign safeguards explicit; retain historical reconciliation and ordinary free core.
6. Run local exact-source unit/lint/types/build/binding checks and isolated workerd with disposable loopback data, then authorized nonproduction Preview and native API compatibility. Capture content/assets hashes, responsive screenshot diffs and negative purchase/AI/sharing/campaign tests. No production DB needed.
7. Founder reviews the local candidate. Any push, merge or deployment requires a later explicit instruction. No paid CI is required.

## Rollback assumptions, not a rehearsed plan

Version `4c18d94c-f9a8-4102-b887-145bc3ad499d` is the recorded rollback target, subject to reconfirmation of availability and compatibility. Before approval, preserve artifact digest, binding/resource references, route/asset configuration and traffic settings. With no schema change, rollback should restore the exact prior Worker artifact and routing; this has not been rehearsed and version retention/binding behavior must be checked. Never assume a version rollback restores changed secrets/resources or reverses database writes. Route/auth/media/deep-link regressions, legal publication failure or unauthorized checkout/collection are rollback triggers. No rollback was executed or authorized by this report.

## Actual validation and handoff

Performed: clean-worktree/ref/topology inspection; complete issue/comments read; Git blob dependency/asset comparisons; required-route and runtime-script presence checks; dashboard availability check. Source hashes in JSON are reproducible Git-blob SHA256 values. No application implementation exists to validate.

Unit/integration tests: **0 executed, 0 passed, 0 failed** (not a passing suite). Lint, TypeScript, Vinext build, Cloudflare build/binding checks, isolated runtime, screenshots, API/legal-route acceptance, DB generation/migration/verification, disabled-checkout/28-day negative tests and remote Preview: **NOT RUN** because the pre-implementation compatibility gate failed. Dependencies were not installed and no source/runtime was invented to make these checks appear green. `git diff --check` passes for tracked files; only audit documents are added.

**GO** for further read-only provenance recovery. **NO-GO** for a production-compatible candidate, release or deployment from this base as currently evidenced. Legal/operator approval, source provenance, authenticated binding/route inventory, original visual baseline and remote Preview/mobile compatibility remain open.

Files created: this report and `ORIGINAL-LANDING-395-SOURCE-MANIFEST.json`. No commit, push, merge, deployment, DNS/binding/secret change, production DB read/write, payment, provider deletion, cron, Store action or paid CI. **Production unchanged.**
