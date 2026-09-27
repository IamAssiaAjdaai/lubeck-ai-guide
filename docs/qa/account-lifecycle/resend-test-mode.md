# Resend test-recipient acceptance — 2026-09-27

## Supported boundary

Resend documents `onboarding@resend.dev` as its test sender and `delivered@resend.dev` as a simulated delivered recipient ([official example](https://resend.com/), [test-recipient documentation](https://resend.dev/)). This supports provider/API transport testing without a custom CITYWALK sending domain. It does **not** establish delivery to an ordinary inbox, sender reputation or CITYWALK SPF/DKIM/DMARC readiness.

No Preview-only product flag or recipient redirection is required. The existing adapter accepts these addresses. For a separately approved isolated end-to-end Preview check, register a synthetic account with the documented test-recipient address and request reset for that same address. The public endpoint still accepts the normal caller email and returns the generic existing/unknown response. Never redirect other users' email to the test recipient.

This test-only exception supersedes the verified-domain prerequisite in earlier readiness guidance **only for simulated provider integration acceptance**. A verified CITYWALK sender/domain remains a pre-production blocker. Do not configure the test sender in Production.

## Exact configuration to prepare

All settings below must apply only to Preview / `feat/account-lifecycle`, preserving shared Production and develop records:

| Variable | Required binding |
| --- | --- |
| `DATABASE_URL` | Approved isolated non-production Neon database, actual identity verified against Production |
| `BETTER_AUTH_SECRET` | Strong Preview-only secret; do not reuse Production |
| `UPSTASH_REDIS_REST_URL` | Correctly spelled name, approved non-production testdb HTTPS REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Credential for that same non-production Redis resource |
| `RESEND_API_KEY` | Approved Preview/test sending key; no value in documentation/logs |
| `CITYWALK_EMAIL_FROM` | `onboarding@resend.dev` for this restricted test |
| `BETTER_AUTH_URL` | Do not add a fixed value; use existing validated Vercel deployment/branch URL handling |

Existing non-production Redis may be reused only after resource isolation is verified and sharing its global limiter budget with other test deployments is acceptable. A database merely named `testdb` is not proof of isolation.

Fresh read-only Vercel metadata in this round still shows **no exact-branch overrides**: `DATABASE_URL` inherits the same record as Production; Preview auth secret exists; correct Redis URL/token, Resend key and sender are missing for this branch. The existing isolated Neon resource is not yet bound to this feature by the effective metadata. No deployment was found for this branch. No environment changes or database connections to Preview/Production occurred.

## Split verification strategy

1. **Real transport acceptance:** once an approved test key is available, send only the documented test message to `delivered@resend.dev`, with the documented sender. Record sanitized HTTP status and acceptance only; never print credentials, reset links, tokens or provider bodies. A simulated delivered event is not a real inbox PASS. Do not send a real account's reset token merely to probe transport.
2. **Application/provider contract:** local tests invoke the actual adapter with mocked fetch. They verify the fixed Resend API endpoint, bearer header, sender/unchanged recipient, localized text, validated dynamic Preview URL, token fragment and deferred send. Both the provider test recipient and an ordinary synthetic recipient are covered to rule out hidden redirection.
3. **Security/token lifecycle:** the existing isolated harness exercises real Better Auth 1.7.2 and PostgreSQL with intercepted provider delivery. The server-created token is recovered in memory from the intercepted message. No dependency on retrieving a token from Resend's simulated mailbox; no new token inspection endpoint/logging is introduced.
4. **Preview/iPhone:** remains pending source deployment and isolated bindings. A provider test address is not a human inbox for tapping a link on iPhone. Use the isolated harness for token/link behavior until separately approved real-inbox acceptance is possible. Do not claim physical reset UX acceptance from DOM/unit tests.

## Acceptance ledger

| Check | Result / evidence |
| --- | --- |
| Real Resend API acceptance | **BLOCKED / NOT RUN** — effective Preview key missing; requested an ignored local path/variable for an approved test credential. No email sent. |
| Template/provider contract, reset form, auth/rate-limit unit checks | **PASS locally** — `npm run test:run -- src/lib/auth src/lib/admin/bootstrap.server.test.ts src/app/account/reset-password/ResetPasswordForm.test.tsx --maxWorkers=1`: **41 passed / 12 DB-gated skipped**, 9 files passed / 1 skipped, no unhandled errors. Includes two new documented-sender/unchanged-recipient contract cases. |
| Real reset-token/password/session/deletion lifecycle | **PASS locally** — `node scripts/test-account-lifecycle.mjs`: **12 passed / 1 file**, no skips. Server-generated token format and 29–30-minute remaining lifetime checked; expired/reused/concurrently consumed token rejection, old-password failure/new-password success, session revocation and retained-record guards exercised. Disposable loopback database removed. First sandbox invocation failed before test execution; authorized loopback rerun passed without changing assertions or timeouts. |
| Native account behavior | **PASS locally** — `npm --prefix mobile run test:run -- tests/account-guest-flow.test.tsx tests/account-lifecycle.test.ts tests/auth-errors.test.ts tests/auth-configuration.test.ts tests/account-walk-api.test.ts tests/account-walk-scope.test.tsx tests/launch-locale-selector.test.tsx tests/locale-preference.test.tsx --maxWorkers=1`: **67 passed / 8 files**, no skips. Mocked native bridges; no physical acceptance. |
| TypeScript | **PASS** — `npx tsc --noEmit`; `npm run mobile:typecheck` |
| Lint | **PASS** — `npm run lint`; `npm run mobile:lint` |
| i18n | **PASS** — `npm run i18n:check`: **495 keys × 7 catalogs, zero errors** |
| Diff / new-document whitespace | **PASS** — `git diff --check` and explicit new-document trailing-whitespace check |

The 12 skipped tests in the root command are the same integration tests subsequently executed by the isolated harness; do not count them twice. Existing Vite configuration warnings remain. Mocked transport is not real Resend API acceptance. Reset UX passes only automated tests; remote/physical acceptance remains pending.

This round changes only `email.server.test.ts`, `lifecycle.integration.test.ts` and this document. The test-recipient path does not change deletion safeguards: current password, explicit confirmation, transactional account-save cleanup, preservation of local traveler data, and retained commerce/staff/audit guards remain in place. No application code flag, dependency, manifest, private environment or configuration change was needed. Better Auth remains 1.7.2.

**SAFE TO PREPARE PREVIEW ACCEPTANCE: NO for execution.** The restricted test plan is ready, but effective DB isolation, Redis bindings, sending key/sender and a separately approved source deployment are still required. Real-inbox/domain acceptance remains an independent public-launch blocker even after simulated transport succeeds.

NOT YET ACCEPTED: arbitrary Gmail/Outlook/user inbox delivery; sender reputation; CITYWALK SPF/DKIM/DMARC; verified CITYWALK sending domain; physical iPhone/Android lifecycle acceptance. These are distinct from provider test-message acceptance.

No commit, push, build, deployment, Production configuration/data change or Better Auth version change is authorized by this preparation.
