# Public Beta readiness — 19 October 2026

**Recommendation: NO-GO.** Local implementation and validation are ready for review; public launch remains blocked. Production, production data, credentials, DNS and traffic were not changed. No payment, subscription, public AI or 28-day launch window was activated.

Branch: `codex/public-beta-readiness`, based on freshly fetched `develop` at `689cb46c1f252ffdd7875c71d2ba9024ca1b450b`. The pre-existing Vitest exclusion and untracked 0026 snapshot were reviewed and incorporated. `citywalk-preview-review/` remains untouched and untracked.

Surface classification follows [ARCH-01 #136](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/136): Mobile Core required for shared API/auth/entitlement safety; Public Web required; Admin Web not applicable for new UI (existing CMS/staff behavior preserved). No iOS or Android client UI was changed. Device acceptance is **NOT TESTED**, separately for both platforms.

## 1. Files changed and root causes

| Files | Purpose |
| --- | --- |
| `vitest.config.ts`, `vitest.lifecycle.config.ts` | Exclude historical copies at any depth; retain normal `src/`, `packages/`, `scripts/` and `tests/` discovery. Lifecycle config admits exactly four files rather than substring-matching copies. |
| `eslint.config.mjs`, `tsconfig.json` | Prevent review copies from polluting lint and framework typechecks. |
| `scripts/lib/disposable-postgres.ts`, `scripts/disposable-postgres.test.ts`, `scripts/run-lifecycle-integration-tests.ts` | Reject remote hosts, non-PostgreSQL schemes and query overrides before connecting; pin loopback; unique disposable names, synthetic auth secret and cleanup on failure. PostgreSQL accepts `?host=...` overrides, so checking URL hostname alone was insufficient. |
| `scripts/run-beta-integration-tests.ts`, `package.json` | Reproducible isolated DB gate: migrate/import/verify only newly created local databases; native tests run serially; migration rollback tests use empty databases. |
| `scripts/native-billing-upgrade-fixture.mjs` | Preserve exact historical 0000–0014 → 0015 assertions, then apply later committed migrations. The previous helper incorrectly required 0015 to remain the latest migration. |
| `src/db/travelerSchema.ts`, `drizzle/meta/0026_snapshot.json` | Restore missing snapshot and represent the existing route-object CHECK constraint. No historical SQL rewritten and no new migration. |
| `src/lib/sharing/publicWalk.ts`, corresponding test | Omit precise start/finish coordinates as well as identity, progress and deadlines. Public projection no longer claims to be a complete private `SavedRoute`. No callers depended on that shape. |
| `src/lib/account/savedWalks.integration.test.ts`, `src/lib/auth/lifecycle/lifecycle.integration.test.ts` | Verify cookie security using a verified test account; enforce the real CHECK constraint; test owner share-link cascade and preservation of another account. Production authentication remains unchanged. |
| `src/lib/guideSafety.server.ts`, corresponding test, `src/app/api/guide/route.ts` and its three test files, `.env.example` | Fail-closed AI opt-in and global DB quota, 16 KiB streamed body bound, same-origin protection, one reservation per provider attempt, disabled SDK retries and request timeout. |
| `src/lib/commerce/stripeProvider.server.ts`, corresponding test | Public Beta allows only test-key checkout. Live checkout is rejected before a provider request; webhook/refund processing remains available. |
| `src/lib/commerce/native/config.server.ts`, `google-gate.server.test.ts`, `phase3b.integration.test.ts` | Honor Cloudflare production identity as well as Vercel. Align stale deletion expectations with the current identity-erasure/detached-financial-record contract, adding explicit cascade, outbox and other-account assertions. |
| `package-lock.json` | Compatible updates only: music-metadata 11.16.1, source-map-js 1.2.2, undici 8.12.2, DOMPurify 3.4.17. No framework downgrade or forced dependency override. |
| This report, `PUBLIC-BETA-DEPENDENCY-AUDIT.json` | Release evidence, remaining blockers and dependency triage. |

Earlier lifecycle session-token duplication did not reproduce with review copies excluded: all four lifecycle files pass. Duplicate discovery and native file concurrency were test-harness problems; authentication was not loosened. CMS/content tests require the canonical CMS import, not the legacy seed that leaves records unpublished.

## 2. Validation evidence

| Check | Status / actual result |
| --- | --- |
| Core `npm run test:run` | **READY** — 233 files passed; 1,461 tests passed; 134 DB tests skipped in the ordinary run. No failing tests. |
| Discovery audit | **READY** — 252 files, including original package and root tests; no review paths. Specific sharing-file filter returns one original file; lifecycle discovery returns exactly four originals. |
| Lifecycle isolated suite | **READY** — 4 files, 25 tests, none skipped. |
| Saved walks / CHECK / real cookies | **READY** — 14 tests. |
| Native ledger, upgrade, namespaces, deletion | **READY** — 28 tests; real DB, synthetic provider verification. |
| Commerce webhook/subscription/RevenueCat | **READY** — 13 tests; synthetic events, no real payments. |
| CMS / marketing QA | **READY** — 23 tests. |
| Media / knowledge / content | **READY** — 7 / 1 / 6 tests. |
| PostgreSQL rate limits | **READY** — sliding window, keyed identifiers and concurrent atomicity passed. |
| Brand authorization/erasure and migration upgrades | **READY** — 15 brand tests plus two migration tests. |
| Lint | **READY** — zero errors; eight existing warnings. |
| TypeScript | **READY** — full app and Cloudflare checks passed. |
| Next production build | **READY** — successful compilation/typecheck and 784 static pages. |
| Cloudflare build | **READY** — bundle gate confirms nine required pages, seven API handlers, SSR and marketing landing content. |
| Cloudflare bindings | **READY** — 16 active bindings preserved, six previously reviewed additions; active-version metadata also matches. Secret values not inspected. |
| Deployment dry-run | **READY** — tool reported no build or deployment performed. This is not an authenticated upload/runtime rehearsal. |
| Legal check | **BLOCKED** — no complete real operator configuration available to the check. |
| Local browser smoke/reflow | **READY** — both unconfigured and synthetic configured legal states; nine pages, three API checks, consent assertion denial, canonical/indexing checks; legal reflow at 320/390 px and enlarged text. Installed Chrome used because the runtime Playwright browser revision was unavailable. Not a full accessibility certification. |
| Preview, Cloudflare runtime/browser acceptance | **NOT TESTED** — Next loopback browser checks do not prove deployed Vinext behavior. |
| iOS device / Android device | **NOT TESTED** / **NOT TESTED**. |

Core's 134 DB skips are intentional: all 134 pass separately (109 through the eleven-group beta runner, 25 through lifecycle), with no integration skips. The procedural rate-limit and native upgrade checks pass in addition. Initial broader DB failures were corrected at their fixture/setup boundaries and rerun. A transient core run overlapped dependency replacement and failed to load seven workers; the full completed rerun passed. The first sandboxed Next build stalled; the unrestricted local build passed. No failed attempt is counted as successful evidence.

Both frameworks generate `.next/types/routes.d.ts` in different formats. After a Vinext build, run `npx next typegen` before the full app `npx tsc --noEmit`; run `npm run typecheck:cloudflare` separately. Do not edit generated route declarations or suppress their errors.

## 3. Database migration status

**READY locally.** Snapshot 0026 has a distinct ID and its `prevId` matches 0025. Its only table addition is `shared_walk_links`; existing 0025 tables are unchanged. Journal entries are ordered 0000–0026 (27 entries); duplicate 0027 is absent. `npx drizzle-kit check` passes. `npm run db:generate` reports no schema changes and creates no migration.

`shared_walk_links_route_object_chk` now exists in SQL, schema and snapshot. Real PostgreSQL rejects an array route with SQLSTATE 23514 and the expected constraint name. Owner index and cascading FK remain in the unchanged 0026 SQL. New isolated databases migrate successfully and the canonical catalog verifies as one city/25 places. The native upgrade fixture verifies historical data preservation and migration rerun idempotency before applying all 27 entries.

No pre-existing local catalog was seeded or reset. No production DB was connected, compared, migrated or queried. Production journal comparison and any production migration remain a separately approved release step.

## 4. Shared Walks

**BLOCKED as a launch feature; unavailable publicly.** [PR #368](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/368) explicitly delivered a foundation, not end-to-end sharing. Current source has no creation/read/revoke API or sharing UI wired to this serializer/table. There is no active public feature to expose or switch on; none was introduced here.

The allowlist excludes owner/session IDs, progress, current GPS/history, deadlines and private start/finish coordinates. Stops remain visible itinerary content. Before adding public endpoints, require a server-controlled activation gate, published-stop resolution, opaque IDs, ownership checks, revocation/no-store behavior and deleted-account acceptance. A public replay must resolve its start from published stops or request a new location, rather than recovering the owner's private coordinates.

Authenticated saved-walk IDOR, forged ownership, account-switch races, concurrent deduplication, missing/forged/revoked cookies, CSRF and body limits pass. Account erasure deletes the owner's shared rows through the existing FK while preserving another owner's rows. Link revocation is **NOT IMPLEMENTED / NOT TESTED**, not claimed complete.

## 5. Authentication, privacy and erasure

**READY in isolated automated acceptance:** signup/verification, non-enumerating email responses, sessions and revocation, reset expiry/single-use/concurrency, password bounds, owner isolation, export secret exclusion, deletion confirmation/reauthentication, staff retention guards, transactional erasure and synthetic external-erasure retries. No production mail, Apple or RevenueCat deletion was sent.

**BLOCKED operationally:** `cloudflare.config.ts` has no scheduled trigger. External erasure outbox code is tested but automatic production processing remains dormant. Approval, credentials, scheduling, retry monitoring and completion evidence are needed. Financial orders/subscriptions remain detached as documented; staff/editorial references require retention review.

The existing [data inventory](../legal/CITYWALK-DATA-INVENTORY.md), privacy disclosures and consent controls were reviewed. Browser/native analytics remain optional and consent-controlled; no consent grants were introduced. Owner/legal review is still needed for real controller information, German public legal copy, processor agreements and transfers (Cloudflare, Neon, Groq, Resend, PostHog, IONOS, and conditional commerce/store providers), retention, logs/backups and restored-backup erasure. Automated tests do not establish legal compliance.

## 6. AI, Premium and Beta policy

**READY as disabled safeguards.** Public AI requires `CITYWALK_AI_GUIDE_ENABLED=true` plus a valid `CITYWALK_AI_DAILY_COMPLETION_LIMIT` (1–10,000). Neither is bound/enabled in the Cloudflare production config; an existing Groq key alone cannot enable the endpoint. Each attempt reserves the same global rolling-24-hour PostgreSQL allowance across visitors/cities. Database failure or exhaustion stops provider use. Existing per-identity daily entitlement checks and abuse limits remain. Each request has at most two attempts, 1,024 completion tokens each, no hidden SDK retries and a 15-second provider timeout.

This is an attempt/token safeguard, not a currency-denominated provider spending guarantee. Guest visitor IDs and forwarded IP identity are not cryptographic proof of a person; the global cap bounds their aggregate use. Provider account budgets, trusted edge identity, quota values and runtime acceptance need review before any opt-in. No paid entitlement bypass, free-Premium grant or launch-window activation was added.

Live Stripe checkout is blocked even if a live key is accidentally supplied. Existing verified refund/webhook handling is preserved. Native billing remains sandbox/tester-controlled and now also refuses Cloudflare production. Existing free city discovery/planning/maps and exact-locale approved audio behavior are preserved; real-device GPS/navigation/audio and all native release acceptance remain unverified.

## 7. Dependency security

**BLOCKED.** `npm audit --omit=dev --json` initially reported 23 affected packages (13 high, nine moderate, one low); after four compatible fixes it reports **19 (11 high, eight moderate, zero critical)**. Parent/transitive findings are not 19 independent exploits. See [sanitized audit](./PUBLIC-BETA-DEPENDENCY-AUDIT.json) for exact packages and advisory links.

Remaining findings involve the Vinext/Cloudflare dependency graph, Sharp/librsvg, braces/fflate and legacy esbuild via Drizzle tooling. npm suggests breaking downgrades for several framework parents; none were applied. `npm audit fix --dry-run` itself errored (`edgesOut`), so it was not trusted as remediation evidence. Resolve supported dependency paths and assess runtime/build reachability before clearing this blocker; do not suppress advisories or assume all tooling findings are harmless.

## 8. Production evidence and rollback

Authenticated GET-only Cloudflare evidence reconfirms 100% traffic to version `4c18d94c-f9a8-4102-b887-145bc3ad499d`, deployment `45fd198d-aa36-4cab-aadc-c2230217d3a4`, created 4 October 2026. Its 16 binding definitions and compatibility settings match the committed baseline. The active Worker lists 11 secret bindings and lacks all three operator identity bindings (name, street address, postal city). Secret presence metadata does not prove secret correctness. No exact source SHA is claimed for this historical version.

Read-only public HTTPS checks: `/` returns 200; `/privacy` returns 404. The current build includes the landing/legal routes, confirming that build readiness and active production readiness differ. Custom-domain ownership/routing configuration and runtime provider behavior still need owner acceptance; HTTP reachability alone is not a complete routing audit.

Use the existing [release/rollback procedure](./LEGAL-LAUNCH-READINESS.md#safe-release-and-rollback-procedure--owner-approval-required). Before any later deployment, record fresh active full UUIDs/traffic, approved artifact SHA, binding comparison and isolated Preview acceptance. Rehearse the artifact against isolated DB/storage and synthetic identity. Do not run production migrations or deploy from this audit.

If a separately approved release regresses, restore the recorded version distribution through the documented Cloudflare deployment-create command and then repeat public smoke checks. Reverify version eligibility and secret compatibility immediately before rollback. Worker rollback does not roll back database/provider changes. The production rollback action is **NOT TESTED** because it mutates traffic; only current baseline retrieval/comparison and local dry-run were exercised.

Safe initial production smoke checks are GET-only: landing content, legal/support/deletion pages, canonical/robots/sitemap, `/explore`, localized traveler entry, published city API and anonymous session response. Check SSR/Hyperdrive errors without logging secrets/prompts. Auth, export, erasure and provider workflows require an explicitly authorized synthetic production account or an isolated Preview; do not test them on real users.

## 9. Launch checklist

- [x] Preserve local review work and existing migrations/data.
- [x] Core discovery, lifecycle isolation, migration metadata and public DTO privacy fixed.
- [x] Local builds, binding contract, dry-run, browser smoke and security DB acceptance.
- [x] Keep public sharing/AI/live commerce unavailable for launch without later approved work.
- [ ] Supply real operator name, service address and postal city; pass structural check using owner-managed configuration and obtain legal review.
- [ ] Resolve/review remaining high-severity dependency findings.
- [ ] Approve and verify operational external-erasure processing, monitoring and retention procedures.
- [ ] Accept exact PR head in CI and isolated Preview, including Vinext/Hyperdrive/provider runtime behavior.
- [ ] Accept iOS and Android native traveler capabilities on devices separately.
- [ ] Review production migration journal and recovery plan without changing production during this task.
- [ ] Approve a separate release that corrects the currently missing production legal routes.

## 10. Delivery

Commit and Draft PR target `develop` as explicitly requested. Do not merge or deploy. GitHub CI/Preview status must be read on the pushed head; local checks do not stand in for those results. The PR and chat handoff record the delivery URL and actual remote status.
