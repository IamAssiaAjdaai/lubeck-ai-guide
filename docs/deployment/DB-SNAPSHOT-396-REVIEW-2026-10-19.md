# #396 — migration snapshot correction and separate native compatibility review

19 October 2026. Worktree `citywalk-landing-runtime-rc`, branch `codex/landing-runtime-rc`. Base/current HEAD: `689cb46c1f252ffdd7875c71d2ba9024ca1b450b`. All changes remain uncommitted. No push, merge, deployment, credentials, production DB, DNS, cron, payment provider or Store action occurred.

**READY for review: #396 metadata correction. BLOCKED: overall production runtime release, including the separate native AI incompatibility below.** This report supersedes only the schema-drift status in the preceding #395 audit; all other operational and legal blockers remain open.

Scope classification: shared database metadata; Mobile Core compatibility inspected and tested with synthetic evidence; Public Web unchanged and locally verified; Admin Web no feature change. No device acceptance.

## Independently reviewed source

Read GitHub #396 before edits. Its cited PR #393 snapshot at commit `3679a0d6322cb7947aa185df50750f26e51fb9ab` resolves locally to Git blob `84cca0f95fa706688b97d5b2f07c804648605d7d`. Only that snapshot was considered, not the broad PR. No claim is made that the cited commit remains the current remote PR head.

The proposed snapshot has 56 tables, id `9ad7d6b6-3e40-4d7a-8019-3e9e5b3ca94e`, and prevId `5e38443c-7580-4fb1-a24b-fb1823b43157`, matching committed snapshot 0025. All other 55 tables and all nonidentity top-level metadata match 0025. Journal entry 26 already points to `0026_shared_walk_links`; neither its timestamp nor any journal entry was changed.

**The PR file was not reused unchanged.** Its FK name `shared_walk_links_owner_id_user_id_fk` differs from the physical PostgreSQL name `shared_walk_links_owner_id_fkey` created by the unnamed inline reference in committed migration 0026. Fresh loopback migration confirmed the physical name. The local snapshot retains the validated structure and chain identity but corrects that one FK key/name. No fictitious SQL migration or journal history was added.

| Object | Committed SQL, independently inspected snapshot and corrected ORM |
|---|---|
| id | UUID, NOT NULL primary key, `gen_random_uuid()` default |
| owner_id | text NOT NULL, user(id) FK, ON DELETE CASCADE / default NO ACTION update |
| city_slug | text NOT NULL |
| route | jsonb NOT NULL |
| revoked_at | nullable timestamp with time zone |
| created_at / updated_at | timestamp with time zone NOT NULL, `now()` defaults |
| owner index | nonunique btree `shared_walk_links_owner_idx` on owner_id |
| object CHECK | `shared_walk_links_route_object_chk`: `jsonb_typeof(route) = 'object'` |

The PR snapshot already contains the CHECK (with qualified table/column expression). The ORM lacked it. Merely copying the snapshot would therefore leave a destructive CHECK-removal diff in generation. The ORM now declares the existing CHECK and names its existing FK explicitly. These are Drizzle metadata declarations of already committed database behavior; no runtime endpoint or historical SQL changed. PostgreSQL tests verify object acceptance, array/string/JSON-null/number rejection, cascade and transaction rollback.

## Exact additions in this task

1. `drizzle/meta/0026_snapshot.json` — validated snapshot plus physical FK-name correction. SHA-256 `f87ce82b45fe626940449864960aa4b03be62160cb511d612990ea7c67826dd8`.
2. `src/db/travelerSchema.ts` — existing CHECK and FK-name declarations only.
3. `scripts/migrationSnapshot396.test.ts` — chain, unchanged other tables, CHECK equivalence and FK/index contract tests.
4. `src/lib/nativeReleaseCompatibility.test.ts` — records shared native endpoint usage and proves the existing candidate gate rejects native requests before authentication.
5. This report and `docs/deployment/DB-SNAPSHOT-396-EVIDENCE.json`.

Every changed/untracked review file present at task start was hashed and remains byte-identical. All 25 original LandingPreview source-manifest hashes still match. Historical SQL and `_journal.json` are unchanged. The earlier quarantined duplicate CREATE TABLE remains unapplied. No new migration was added. No package/lock, Cloudflare configuration, landing, legal content, billing activation, or publicReleasePolicy implementation changes were made in this task.

## Disposable verification and results

A disposable source checkout was materialized from HEAD inside `.citywalk/396/checkout`, then overlaid only with the snapshot and ORM correction. It used installed dependencies and an allowlisted environment without private configuration. Two consecutive `npm run db:generate` runs exited 0 **and all migration/metadata filenames and content hashes were identical before and after**; both reported no schema changes. `drizzle-kit check` passed. The disposable checkout was removed after recording final hashes. No duplicate migration or CHECK drop was applied anywhere.

Fresh loopback databases were created for migration upgrade, lifecycle, native ledger/reconciliation and built-runtime acceptance and removed afterward. No existing development DB was used. Upgrade testing migrated through 0025, applied committed 0026, reran the migration and tested transaction rollback. No destructive down-migration was invented: this patch changes metadata only, and removing the patch restores the earlier tooling drift without altering a database.

| Gate | Actual result |
|---|---|
| Disposable `db:generate`, twice | 2 passed; no new files, no content drift |
| Drizzle validation | Passed |
| PostgreSQL upgrade/constraint/rerun/rollback assertions | 8 passed, 0 failed |
| Focused Vitest | 106 passed, 0 failed, 28 skipped; 13 passed / 2 skipped files |
| Complete root Vitest | 1,452 passed, 0 failed, 133 skipped; 234 passed / 19 skipped files |
| Fresh lifecycle integration | 25 passed, 0 failed, 0 skipped; 4 files |
| Standalone native ledger + Stripe/RevenueCat/subscription reconciliation | 30 passed, 0 failed, 0 skipped; 4 files; synthetic provider evidence only |
| Built Vinext loopback acceptance | 32 passed, 0 failed; 320/390/768/1440 widths, legal modes, auth/API rejection, app links |
| Next route types, root TS, Cloudflare TS | Passed |
| ESLint final | Passed: 0 errors, 8 existing warnings |
| Vinext + Cloudflare bundle check | Passed: required 9 pages / 7 API handlers |
| Binding contract | Passed: 16 preserved / 6 baseline additions; generated config restored after runtime acceptance |
| `git diff --check` | Passed |
| Historical `test-native-billing.mjs` runner | Failed before Vitest: fixture assumes journal ends at 0015; current journal ends at 0026 |
| Attempt to run Phase 3B against an otherwise fresh current-schema DB | 35 passed / 6 failed across 5 files; details below; not a valid replacement for its historical fixture |
| Standard Next production build / populated catalog `db:verify` | Not rerun; preceding audit's missing-auth build limitation and catalog-verification gap remain |
| Production schema, providers, real native devices, remote Preview | NOT TESTED |

The Phase 3B attempt's four failures concerned missing legacy upgrade fixtures (legacy access, price lookup in namespace/financial tests, legacy refund order). Its two deletion expectations require native-owned accounts to reject deletion, but the current lifecycle implementation allowed it. Do not label these six results as passes, or infer a production incident. Repair/reconcile the historical fixture and deletion policy expectations in separate scoped work before using that suite as release evidence. The 30 standalone tests exclude Phase 3B and are not a substitute for its unresolved acceptance.

An initial native-client import test could not load Expo's missing local tsconfig dependency; it was replaced with a clearly scoped source-endpoint assertion plus actual server-route invocation with synthetic native headers. This does not claim an Expo/device test. The final focused/root suites pass. An unused import in an ignored audit script added a temporary ninth lint warning; removed, final lint returns to eight existing warnings.

Evidence logs and disposable runners: `.citywalk/396/`; built-runtime JSON/screenshots: `.citywalk/runtime-rc/`. These are local ignored evidence. The companion manifest records exact newly changed file hashes and preservation checks. Embedded build revision remains HEAD, not a unique identifier for the uncommitted patch.

## Separate native compatibility finding — release blocker

`mobile/src/lib/api/client.ts` calls **the same** `/api/guide/eligibility` and authenticated `/api/guide` routes used by Web. The prior candidate's unconditional `isPublicAiEnabled() === false` returns ineligible / 503 before auth, entitlement or provider work. Consequently it disables **native guest and authenticated/paid Guide**, not only public Web. The regression test proves a request with native origin/session/account headers still receives 503 without invoking auth. It deliberately does not pretend those headers constitute a verified session; the gate executes before any session can be checked.

The gate does not delete or revoke rights. Native RevenueCat purchase/restore orchestration and `/api/commerce/native/context`, `/api/commerce/city-unlock/...`, entitlement reads and provider webhooks are separate from the Web checkout route. Source inspection and mocked/current-schema ledger tests confirm those paths are not directly replaced by the Web checkout/AI guards. Existing active legacy/canonical access and premium-access unit tests pass. However, **a legitimate paid Guide journey remains unusable even when its entitlement is valid**, so “native compatibility preserved” is not a valid release claim.

Web Stripe checkout is intentionally blocked at route and provider layers. Historical webhook reconciliation is preserved and tested with synthetic events. No new purchase was initiated; no live provider credentials were supplied. Native purchase/restore/refund/renewal device flows remain unverified. API-origin trust cannot be implemented by simply trusting Origin, a caller header or user-agent; any future Web-only restriction must use a reviewed server-side capability/access design and retain entitlement enforcement. No such runtime redesign is included in this metadata ticket.

Cancelled 28-day policy remains OFF: scoped case-insensitive source search of src/packages/mobile/scripts/config found no matching campaign identifiers/phrases. No campaign code or PR #391 content was imported. Ordinary core access/rights were not changed.

## Handoff and blockers

#396 metadata correction is ready for independent review, **not committed or pushed**. A reviewer can isolate the snapshot, ORM declarations and metadata regression test from the pre-existing #395 safety patch and separate native compatibility test/report.

Production remains NO-GO pending native Guide policy compatibility, historical Phase 3B fixture/deletion-policy reconciliation, legal/operator approval, consent persistence review before analytics activation, authenticated production route/domain/schema inventory, erasure operations, remote Preview and native device/provider acceptance. Live Worker source provenance remains unknown; this task did not re-query or mutate production. Prior rollback assumptions remain conditional on retained artifact, binding compatibility and schema compatibility. Production is unchanged.
