# Account lifecycle — local implementation, 2026-09-27

## Reviewed commit / Preview preparation checkpoint

The historical readiness blockers in `preview-readiness.md` and `resend-test-mode.md` describe earlier configuration. They are superseded for infrastructure by the owner-approved exact-branch preflight: isolated lifecycle Neon database verified by server-reported project identity; migration privileges verified read-only; separate Preview auth secret; owner-designated non-production Redis endpoint/token authenticated with PING; Resend key accepted by a read-only provider API request; official test sender configured. All six variables apply only to `feat/account-lifecycle`. No fixed auth URL was added. The temporary Ignored Build Step was restored to unset. Production/develop environment records remained unchanged.

This is configuration readiness, not successful email transport or physical acceptance. Real inbox/domain readiness and retained-account deletion policy remain blocked. The owner authorized one feature commit/push and source-matched Preview validation, using synthetic accounts and Resend's test recipient only; no merge or Production deployment.

Final pre-commit rerun on the reviewed source:

- Root auth/provider/reset-form command listed below: **41 passed / 12 DB-gated skipped**, 9 files passed / 1 skipped.
- Mobile account/auth command listed below: **67 passed / 8 files**, no skips.
- `node scripts/test-account-lifecycle.mjs`: **12 passed / 1 file**, no skips; these execute the root run's 12 gated tests.
- `node scripts/test-account-saved-walks.mjs`: **13 passed / 1 file**, plus migration upgrade/rerun preservation PASS.
- Root/mobile TypeScript and lint PASS; i18n **495 keys × 7 catalogs, zero errors**; diff check PASS.
- Better Auth installed/locked **1.7.2**, password policy **12–128** unchanged. No dependency/schema/migration edits.

No remote smoke or physical result is inferred from these automated results. Later Preview evidence must identify the exact deployment SHA and distinguish provider acceptance, token completion and audible/visible device behavior. Private env files, `.expo/`, held stash and operational scripts outside the repository are excluded from the feature commit.

Branch: `feat/account-lifecycle`. Base: `b599f2c26fdb0bc889b2827f75f145802a361ab3`, the merged PR #143 head; matches fetched `origin/develop` during this task. Installed and locked Better Auth remain **1.7.2**. No dependency or lockfile changes.

Scope: Mobile Core account lifecycle on iOS/Android; Public Web browser password recovery required; Admin Web has no new UI. Physical acceptance from PR #143 remains historical evidence for that source, not acceptance of these new flows.

## Capability and dependency audit

The installed Better Auth 1.7.2 implementation already supplies cryptographically random reset tokens, expiry, atomic token consumption, credential hashing/update and session revocation. Existing `verification` rows support reset tokens without a migration. `revokeSessionsOnPasswordReset` is now enabled; a successful reset ends **all** account sessions and does not sign the reset browser in. The password policy remains the shared 12–128 bounds.

No transactional email provider was previously integrated. A small Resend HTTP adapter was added; no SDK/dependency addition or real email send occurred. Request acknowledgement does not prove delivery. Missing configuration returns a generic unavailable response before account lookup. Provider delivery runs through Next.js `after` so provider latency/errors do not reveal account existence in the request response. Provider failure emits only `[account-lifecycle] reset_email_delivery_failed`; the recipient, reset link, token, credentials and provider response body are never logged. This requires operator monitoring and inbox acceptance before launch; it is not a durable email queue.

Better Auth's built-in delete endpoint permits fresh-session deletion without a password. It remains **disabled**. The dedicated endpoint instead verifies the existing server session and current credential password, requires explicit confirmation, and runs the account mutation in a PostgreSQL transaction. The expected-account request header prevents account-switch races; it does not select the deletion target. A supplied body user ID is ignored.

### Account data deletion map

| Data | Implemented behavior |
| --- | --- |
| `user`, credential `account`, all `session` rows | Deleted server-side; existing FKs cascade inside the transaction |
| `account_saved_walks` | All owned records cascade; another account is unaffected |
| `traveler_profiles`, `traveler_guest_links` | Cascade; no local data upload or migration |
| Existing `reset-password:*` verification rows whose value is this account ID | Explicit cleanup because verification has no user FK; other accounts' rows untouched |
| Commerce customers, orders or entitlements referencing this account | **Block deletion**, preserve all rows; financial retention policy not supplied |
| Staff membership (including inactive), staff membership created-by references | **Block deletion**, preserve all rows |
| Editorial created-by/updated-by/published-by/verified-by and workflow actor references | **Block deletion**, including former staff; committed schema columns scanned, not request-controlled SQL identifiers |
| Provider payment-event ledger | Unchanged; no user FK; no Stripe calls or payment mutations |
| Native current walk/progress, favorites, locale, review history, historical device-only saves | Kept on device; no AsyncStorage deletion/upload |
| Anonymous visitor analytics | No account-ID linkage found in current visitor tracking; guest links are removed. External analytics retention is not redefined here |

No server account-linked feedback table was found in this schema; current trip ratings/review history are device-local. Broad feedback ingestion remains a separate workstream.

**Launch policy blocker:** accounts with commerce/staff/editorial history cannot self-delete until an approved retention/anonymization and operator-handling policy exists. No legal policy is invented here. The UI explains that nothing was deleted when review is required. Supporting ordinary traveler deletion does not close that policy gap.

The transaction takes short, read-compatible SHARE locks on tables with plain-text editorial actor references (which have no FKs), then locks the user/session/credential. This prevents audit-reference insertion racing the guard. Lock waits have a 3-second bound; contention returns a recoverable unavailable response with no committed deletion. Tables with FK references serialize against the locked parent. This should be included in Preview operational acceptance on a realistically busy CMS.

## Reset flow and privacy

Native Sign in → Forgot password → email → generic request acknowledgement. Invalid email is rejected locally and server-side. Unknown/existing accounts get the same acknowledgement. No promise of inbox delivery is made.

The email link uses the configured/validated auth origin, never arbitrary request Host or a caller redirect. With dynamic Vercel auth configuration it uses that deployment's fallback HTTPS origin. `/account/reset-password?locale=…#token=…` removes the fragment from history immediately and retains it only in component memory. Token validation and reset use POST bodies; no local/session storage, URL query token, analytics or error capture on the recovery page. The route is no-index/no-referrer. Provider click/open tracking must be disabled for recovery emails; no email tracker is added by the app.

The browser form validates the token without consuming it, supports password-manager autofill and independent show/hide controls, checks confirmation and shared bounds, and offers network retry. Invalid/expired/used tokens get a clear new-link instruction. A successful reset clears the password fields/token and links to the existing localized account sign-in page. Refreshing after the fragment was removed intentionally requires reopening the email link.

Rate limiting reuses Upstash Redis with atomic sliding windows: each reset-email target 3 requests/15 minutes, each token validation/reset or account deletion target 10/15 minutes, plus 60/15 minutes per action globally. Identifiers in Redis are HMAC digests; no raw email/user/token keys, analytics or custom IP parsing. Missing/unreachable Redis fails closed. Global limits are a conservative initial policy that needs capacity review before public launch.

## Native deletion and device data

Account → Delete account explains permanent account/Saved Walk loss, session termination and retained local data. The owner must enter the current password and explicitly check the confirmation before the final action is enabled. Duplicate submissions use the existing lock. Errors do not show deletion success, sign out or remove local data.

After the server confirms committed deletion, the client uses Better Auth Expo 1.7.2 sign-out. Its inspected implementation clears the auth cookie/session cache in SecureStore and the session atom before sending its network request. Auth refresh is best-effort after deletion; a subsequent network failure is not misreported as a failed server delete. The existing user-scoped account-walk hook clears account-backed lists when the session becomes guest. No changes to walk storage or Saved Walk semantics.

All new copy is shared across DE/EN/DA/SV/NL/ES and AR. Launch selector behavior is unchanged. Forms use existing native keyboard-safe Screen/PasswordField and growing controls; no font scaling is disabled. German/Dutch at 110% and Arabic RTL still need physical/visual confirmation.

## Configuration and isolated Preview plan

Required server variable **names only**:

- `RESEND_API_KEY`: separate non-production sending credential for Preview; production credential only after separate approval.
- `CITYWALK_EMAIL_FROM`: operator-approved sender on a verified CITYWALK domain; never a personal mailbox. Domain ownership/DNS/sender approval cannot be established by syntactic validation.
- Existing `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`: intended isolated environment's rate-limit service.
- Existing `BETTER_AUTH_SECRET`, `DATABASE_URL`: isolated Preview identity/database.
- Existing auth URL handling: `BETTER_AUTH_URL` locally, or validated `VERCEL_URL` / `VERCEL_BRANCH_URL` dynamically. No new fixed Preview URL is required.

Local email acceptance requires explicitly configured non-production credentials and an approved synthetic recipient. No `.env` files were loaded, edited or printed during implementation/tests. No real email was sent.

Before any separately approved push/deployment: verify this branch's exact Preview database/auth/Redis bindings, isolation from Production, verified sender and delivery restrictions. Do not assume the prior feature branch's overrides apply here. Then deploy reviewed source, verify generic/missing-config/rate-limit behavior, send only to an approved synthetic inbox, open the real link and test deletion with synthetic accounts. No migration is added; deployment still has the existing migration build path, so target verification remains mandatory.

## Validation

Final validation is recorded below. Counts from different runs overlap and must not be added together. Isolated integration uses `scripts/test-account-lifecycle.mjs`: creates a uniquely named loopback-only database, applies the existing migrations, mocks email and rate-limit transports, and removes only that database. It never loads private env files or accesses Preview/Production. Real Better Auth hashing/token/session behavior and PostgreSQL cascades are exercised; mocked transport success is not email-delivery evidence.

## Physical iPhone retest — pending

1. Preserve current walk, favorites, language, rating history and historical local saves; record their presence without deleting storage.
2. Sign in → Forgot password. Check invalid email, request acknowledgement, offline/config/rate-limit error and retry; compare existing/unknown synthetic emails without disclosure.
3. Receive the actual email in an approved test inbox. Open on iPhone Safari; verify CITYWALK origin, localized copy, visible labels/show-hide/autofill at EN/DE/NL 110%, no token left in address/history after load. Check Arabic RTL separately without changing launch visibility.
4. Test mismatched and short/long passwords; reset with a valid one. Old password fails, new password works; another signed-in session must require sign-in again. Reused/expired links are rejected.
5. With a disposable ordinary account containing an account Saved Walk, open deletion. Cancel/back must preserve everything; wrong password/network failure must not claim success. Confirm explicitly with correct password.
6. Verify server account/saves gone, Profile guest, account Saved Walk list cleared, old credentials fail, and every device-local item from step 1 remains. Relaunch and verify again; another account must remain unaffected.
7. For synthetic commerce/staff/audit-linked fixtures only, deletion must report review required without changing any records. Do not create real purchases to test this guard.

No iPhone, Android, inbox, Preview or release acceptance is claimed for this change. No commit, push, deployment, provider settings, production data, held stash or content publication was performed.

## Exact changed files

- `docs/qa/account-lifecycle/README.md`
- `instrumentation-client.ts`
- `mobile/src/app/account/index.tsx`
- `mobile/src/lib/auth/lifecycle.ts`
- `mobile/tests/account-guest-flow.test.tsx`
- `mobile/tests/account-lifecycle.test.ts`
- `packages/i18n/src/locales/ar.json`
- `packages/i18n/src/locales/da.json`
- `packages/i18n/src/locales/de.json`
- `packages/i18n/src/locales/en.json`
- `packages/i18n/src/locales/es.json`
- `packages/i18n/src/locales/nl.json`
- `packages/i18n/src/locales/sv.json`
- `scripts/test-account-lifecycle.mjs`
- `src/app/account/reset-password/ResetPasswordForm.test.tsx`
- `src/app/account/reset-password/ResetPasswordForm.tsx`
- `src/app/account/reset-password/page.tsx`
- `src/app/api/account/delete/route.ts`
- `src/app/api/account/reset-token/route.ts`
- `src/app/global-error.tsx`
- `src/components/VisitorJourneyTracker.tsx`
- `src/lib/auth/factory.server.ts`
- `src/lib/auth/lifecycle/deleteAccount.server.ts`
- `src/lib/auth/lifecycle/email.server.test.ts`
- `src/lib/auth/lifecycle/email.server.ts`
- `src/lib/auth/lifecycle/hooks.server.ts`
- `src/lib/auth/lifecycle/http.server.ts`
- `src/lib/auth/lifecycle/lifecycle.integration.test.ts`
- `src/lib/auth/lifecycle/rateLimit.server.test.ts`
- `src/lib/auth/lifecycle/rateLimit.server.ts`
- `src/lib/auth/native-policy-contract.test.ts`

Preserved: pre-existing untracked `.expo/`; held stash unchanged; no staged files. Dependency/lock, schema/migration, Vercel and private environment files have no diff. A changed-file credential-pattern and whitespace scan found no flags; synthetic loopback fixtures are test-only. No generated build output is included.

## Final validation results

| Command | Result |
| --- | --- |
| `npm run test:run -- --maxWorkers=2` | 146 files passed / 7 DB-gated files skipped; **888 tests passed / 47 skipped**, no unhandled errors. This complete-suite run preceded the final limiter-timeout and response-shape hardening below. |
| `npm run test:run -- src/lib/auth src/lib/admin/bootstrap.server.test.ts src/app/account/reset-password/ResetPasswordForm.test.tsx --maxWorkers=1` | Final affected source: **39 passed / 12 DB-gated tests skipped**; 9 files passed / 1 skipped; no failures or unhandled errors. Includes the three additional regression cases after the full-suite run. |
| `npm --prefix mobile run test:run -- tests/account-guest-flow.test.tsx tests/account-lifecycle.test.ts tests/auth-errors.test.ts tests/auth-configuration.test.ts tests/account-walk-api.test.ts tests/account-walk-scope.test.tsx tests/launch-locale-selector.test.tsx tests/locale-preference.test.tsx --maxWorkers=1` | **67 passed / 8 files**, no skips/failures/unhandled errors on final native source. |
| `node scripts/test-account-lifecycle.mjs` | **12 passed / 1 file**, real Better Auth 1.7.2 + isolated PostgreSQL; no skips. |
| `node scripts/test-account-saved-walks.mjs` | **13 passed / 1 file**, additive migration upgrade/rerun preservation also passed; no skips. |
| `npx tsc --noEmit`; `npm run mobile:typecheck` | PASS |
| `npm run lint`; `npm run mobile:lint` | PASS |
| `npm run i18n:check` | **495 keys × 7 catalogs, zero errors** |
| `git diff --check`; additional new-file whitespace scan | PASS |

Final rate-limit hardening explicitly rejects Upstash's `success: true, reason: "timeout"` response. Final UI hardening requires the expected JSON success marker; a protected Preview HTML page or unexpected HTTP 200 response cannot become reset success.

Validation history: initial integration fixtures used an incorrect staff role/audit export; corrected without changing application eligibility. A password-boundary test hit its unchanged 5-second limit while suites ran concurrently and passed when rerun alone. The first full root run exposed eager server-only imports breaking plain-Node auth/bootstrap consumers; dependencies were made lazy, and an incorrect nested middleware wrapper was caught by integration tests and replaced by a plain guard. The subsequent complete root run passed. Later parallel focused runs hit worker-start timeouts (3/4 root errors and 3 mobile errors); those runs are **not** passes. Final focused root/mobile runs used one worker with unchanged assertions and timeouts and exited cleanly. Existing Vite configuration deprecation warnings remain unrelated.

No full-suite claim is made for the three late hardening tests beyond the final complete affected-suite rerun. No build, Preview migration, deployment, real provider send or physical acceptance was performed. Both installed and locked Better Auth/Expo auth packages are 1.7.2 in root and mobile.
