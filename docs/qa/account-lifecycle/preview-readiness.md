# Account lifecycle Preview readiness — 2026-09-27

**SAFE TO PREPARE PREVIEW TEST: NO.** The plan is prepared; executing it is blocked. Branch `feat/account-lifecycle`, local base `b599f2c26fdb0bc889b2827f75f145802a361ab3`, plus existing uncommitted lifecycle implementation. No lifecycle deployment was found by the branch-filtered deployment query. Earlier Saved Walk acceptance does not cover this source or branch.

## Read-only environment evidence

Existing authenticated Vercel CLI and GET-only API metadata verified the linked `lubeck-ai-guide` project in the existing team. No login, relink, environment pull/decryption, database connection, email send or configuration mutation was performed. Exact-branch CLI listing returned no variables. All-environment API metadata was filtered in memory by scope and branch; only names, scope and presence/equality classifications were emitted.

| Variable | Effective presence | Scope of effective record | Exact branch override | Identity class |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Present | Production + Preview + Development | No | Shared Production binding — unsafe |
| `BETTER_AUTH_SECRET` | Present | Preview | No | Preview-only record; value strength/uniqueness not inspected |
| `BETTER_AUTH_URL` | Missing for this branch | None | No | Dynamic runtime handling applies |
| `UPSTASH_REDIS_REST_URL` | Missing | None | No | Unavailable |
| `UPSTASH_REDIS_REST_TOKEN` | Missing | None | No | Unavailable |
| `RESEND_API_KEY` | Missing | None | No | Unavailable |
| `CITYWALK_EMAIL_FROM` | Missing | None | No | Unavailable |

The effective Preview and Production `DATABASE_URL` resolve to the **same environment record**, not merely similarly named databases. This proves shared binding without retrieving either connection string. No actual database contents or live connectivity were queried. The old Saved Walk branch's isolated override does not apply to this branch.

A shared variable named `UPSTASH_REDIS_REST_UR` exists; it lacks the final `L` and is not consumed by this implementation. Redis variables on other branches do not apply here. Do not rename or repurpose shared records during feature setup: add exact-branch isolated bindings after approval.

`src/lib/auth/env.ts` uses validated `VERCEL_URL` / `VERCEL_BRANCH_URL` dynamically when no explicit `BETTER_AUTH_URL` exists. That is compatible by source inspection; deployment-host/link behavior remains untested. The develop-specific fixed URL does not apply here. No new fixed feature URL is required.

`vercel.json` uses `npm run vercel-build`, which runs `npm run db:migrate && next build`. There is no local Git deployment block. Treat a push as potentially migration-triggering until isolation is reverified. No push was made.

## Resend and rate limits

The authenticated Vercel account integration listing returned no Resend integration. This does not prove that the owner has no separate Resend account. No effective sending credential or sender is configured, so sender/domain verification, sending permission, account restrictions and inbox delivery remain **UNVERIFIED/BLOCKED**. There was no authenticated Resend domain check and no send attempt.

The adapter accepts a bare sender email address (not `Display Name <address>`). An operator must select an approved non-personal sender on a verified sending domain, provision a Preview-only domain-scoped sending credential, and disable click/open tracking for reset mail. Domain verification and key scope must be checked in Resend; syntax checks cannot establish either. See [Resend domain guidance](https://github.com/resend/resend-skills/blob/main/skills/resend/references/domains.md) and [API-key guidance](https://github.com/resend/resend-skills/blob/main/skills/resend/references/api-keys.md).

Redis readiness is **FAIL**: the correctly named effective URL/token pair is absent. Lifecycle operations fail closed. Preview must use an isolated Redis resource; the implementation's global limiter keys are shared names, so sharing Production Redis could consume Production rate limits even with a different auth secret. No limiter request was made during this audit.

## Deletion retention classification

This is the implemented technical classification, not a legal retention policy. No retention duration is assumed. The current endpoint keeps affected classes blocked with `RETENTION_REVIEW_REQUIRED` and commits no partial deletion.

| Data/table | Classification | Current handling |
| --- | --- | --- |
| `user` (ordinary traveler with no retained references) | SAFE TO DELETE | Server session, current password and explicit confirmation required; transactional delete |
| `account`, `session` | SAFE TO CASCADE | Credential/OAuth fields and all sessions removed through user FK cascades |
| `verification` | SAFE TO DELETE, narrowly scoped | Explicitly delete only this user's `reset-password:*` records; no user FK; unrelated records retained |
| `account_saved_walks` | SAFE TO CASCADE | Delete this owner's cloud saves only |
| `traveler_profiles`, `traveler_guest_links` | SAFE TO CASCADE | Delete profile and anonymous/account association; device storage unaffected |
| `commerce_customers`, `commerce_orders`, `commerce_entitlements` | BLOCK UNTIL POLICY | Guard prevents existing CASCADE/SET NULL semantics; financial/entitlement retention and anonymization require approval |
| `commerce_provider_events` | RETAIN / ANONYMIZE review | No direct user FK; provider audit ledger untouched. No anonymization is implemented or authorized |
| `staff_memberships`, dependent `staff_city_access` | BLOCK UNTIL POLICY | Membership ownership, inactive membership and membership created-by references block deletion |
| `cities`, `city_launch_readiness`, `city_localizations`, `places`, `place_localizations`, `tours`, `tour_localizations` | BLOCK UNTIL POLICY | Plain-text created/updated actor references are checked; content remains unchanged |
| `place_revisions`, `content_sources`, `place_sources`, `city_sources`, `verified_knowledge_chunks`, `content_workflow_events` | BLOCK UNTIL POLICY | Published-by, created/updated-by and workflow actor history preserved |
| `media_assets`, `media_asset_rights`, `city_media`, `place_media`, `tour_media` | BLOCK UNTIL POLICY | Created/updated/verified-by and attachment actor history preserved; no storage mutation |
| `content_tags`, `place_content_tags`, `tour_stops`, `audio_generation_metadata`, commerce catalog/price/grant tables | RETAIN | No direct user reference found; account deletion must not remove shared content/catalog data |
| Feedback / trip ratings / review history | RETAIN device-local data | No server account-linked feedback table found in current schema; future ingestion requires its own policy |
| Anonymous analytics and external provider records/logs | RETAIN / ANONYMIZE review | Guest bridge removed; no external erasure or provider-history purge claimed |

Editorial actor guards enumerate schema columns ending `ByUserId` or named `actorUserId`; staff/commerce guards are explicit. The transaction uses bounded locks before deletion. Do not enable deletion for retained classes until the owner approves which records/identifiers remain, anonymization rules, and the support/escalation process. Physical guard behavior and operational lock contention remain unverified remotely.

## Operator steps — not executed

1. In the existing Vercel project, prepare exact **Preview / `feat/account-lifecycle`** bindings. Do not edit shared Production/develop records. If branch selection requires a remote branch, stop and arrange a separately approved deployment-blocked branch bootstrap; do not push this implementation against the inherited database.
2. Bind `DATABASE_URL` to the approved isolated non-production Neon database. Verify actual resource/database identity differs from Production; do not rely on URL-string difference or the older branch's override. No Production users/data copying.
3. Add a new strong Preview-only `BETTER_AUTH_SECRET` for this exact branch. Keep Better Auth 1.7.2 and dynamic URL handling; do not add `BETTER_AUTH_URL`.
4. Bind exact `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to an isolated Preview Redis resource with working limiter permissions. Do not reuse the shared misspelled setting or Production resource.
5. In the approved Resend account, verify sending-domain status/capability and permitted recipient restrictions. Provide Preview-only `RESEND_API_KEY` and a bare approved `CITYWALK_EMAIL_FROM` as exact-branch Preview settings. Configure tracking off and an approved synthetic recipient. Do not send yet.
6. Re-run metadata/identity preflight. Require isolated database and Redis, Preview secret, sender/key presence and domain verification. Review retention decisions or retain current guards. Only then seek separate approval to commit/push/deploy and execute tests.

## Exact acceptance sequence after separate authorization

All steps target a source-matched isolated lifecycle Preview, not the historical Saved Walk Preview or develop. No step below ran in this audit.

1. Confirm deployed source, runtime origin, database/Redis isolation and auth health. Ensure Preview protection permits the approved iPhone/browser to reach the email link without broadening access. Record source/device details only when observed.
2. Preserve a device-local walk, favorites, locale and historical saves. Create disposable ordinary account A using an approved inbox. Sign in on iPhone and a second browser/session; create one account Saved Walk. Keep account B as an isolation control.
3. Request password reset from native UI in an official locale. Check generic acknowledgement and separately verify the real email arrives. A provider HTTP success or acknowledgement is not inbox acceptance. Observe only sanitized event outcomes, never record recipient/token/link credentials.
4. Open the email link in Safari. Verify correct Preview host, localized form and token fragment removal. Test invalid/mismatched passwords, then set a valid new 12–128-character password. No automatic sign-in.
5. Verify old password fails and new password succeeds. Use both pre-reset sessions to verify authenticated operations are rejected/refreshed to signed-out, not merely an outdated UI. Reopen the same email link: rejected as used.
6. Request a separate token within rate limits and leave it unused for more than the configured 30-minute lifetime. Then open/reset: expired rejection. Do not alter server clock/expiry or database rows. If waiting is impractical, mark remote expiry UNVERIFIED; local integration evidence is separate. Use the valid new password to continue.
7. Sign in as A. Delete UI Cancel/back and wrong password must preserve account and saves. Explicitly confirm with current password, then require server-confirmed success.
8. Verify A cannot sign in again and its old sessions cannot access APIs. With separately authorized read-only inspection of the isolated DB, confirm A's user/auth/session/reset-token/account-save/profile/guest-link rows are gone; inaccessible UI alone does not establish row deletion. Verify account B remains unaffected.
9. Confirm guest Profile, cleared account-backed list, and all device-local data from step 2 preserved; relaunch and check again. Record iPhone results separately from Android.
10. Test retained-class refusal only using separately approved synthetic commerce/staff/audit fixtures in isolated Preview; never real purchases or production staff. Otherwise keep that remote guard check UNVERIFIED.

## Audit outcome

Only this documentation was added in the readiness round. No application changes, secrets/dependency/configuration edits, tests requiring remote services, database connections, migrations, content operations, email sends, commits, pushes or deployments. Existing local work and held stash remain intact. `git diff --check` passes; application test results in README remain historical and were not unnecessarily rerun for a read-only/documentation audit.
