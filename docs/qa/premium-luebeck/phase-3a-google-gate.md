# Phase 3A — Google billing server enablement

**Follow-up 2026-09-28:** [Phase 3B](phase-3b-db-validation.md) authorized and passed disposable DB validation, including all 17 previously blocked cases. The DB blocker/status below records the historical Phase 3A handoff; current status is safe to resume preflight, not safe to build.

2026-09-28. Branch `feat/premium-luebeck`, base HEAD `cba060b4d54e545b6476e088d15d4b8599510c32` plus preserved Phase 1/2 work. Mobile Core backend security correction; Public/Admin Web UI not changed. No commit, staging, push, migration, build, deployment, environment change or real purchase.

## Original failure and entry-point inventory

The Phase 3 probe showed that `sandboxContext` reported Google disabled while `verifyAndDeliver` still reached the provider and entitlement delivery. The Google flag was only a context/UI check. The service, provider and ledger lacked the same authorization boundary.

Paths traced before editing:

| Entry point | Downstream path / protection now |
| --- | --- |
| `GET /api/commerce/native/context` | Reports the centralized `googleBillingEnabled` decision |
| `POST /api/commerce/city-unlock/[citySlug]` | Authenticated/rate-limited request → real `verifyAndDeliver` gate; forged client flags cannot enable Google |
| Purchase, restore and app-resume reconciliation | All use that POST/service; no separate ownership-restore write path |
| Direct `verifyAndDeliver` caller | Gate before provider call and recheck after async verification, before delivery and acknowledgement |
| `verifyGoogle` / `normalizeGoogle` | Central policy required before SDK client construction and evidence normalization |
| `acknowledgeGoogle` | Gated SDK client and current ownership check; explicit recheck before acknowledgement POST |
| `verifyGooglePushAuthorization` | Gate before OIDC/provider work; existing audience/email checks retained |
| `POST /api/commerce/native/notifications/google` | Gate before parsing/verification; verified revocations only; purchase-success notifications never grant |
| Direct `deliverNativePurchase` caller | Google gate before opening DB transaction, and after acquiring transaction lock before any ledger writes |
| Orders, product/grant definitions, provider events, entitlements | Written only below that authoritative ledger gate for Google evidence |

Apple functions, notification behavior and sandbox configuration remain independent. No additional Apple configuration requirement was introduced.

## Exact centralized policy

`config.server.ts` owns `googleBillingEnabled()` and `requireGoogleBilling()`. All must hold:

1. `CITYWALK_GOOGLE_TEST_PURCHASES` is exactly `"1"` (no trimming/coercion).
2. `CITYWALK_NATIVE_BILLING_MODE` is `sandbox` and the existing account-binding secret requirement passes.
3. `VERCEL_ENV` is `preview` or `development`; when it is absent, `NODE_ENV` must explicitly be `development` or `test`. Unknown/empty deployment values and Production deployments are rejected. Vercel Preview may legitimately run `NODE_ENV=production`.
4. Google service-account configuration parses as JSON with `type=service_account` and nonblank `client_email` / `private_key` strings. This is configuration-shape validation, not proof of working credentials. Google still authenticates and verifies the exact package/product/test-payment/account evidence.
5. The existing tester allowlist/account-binding checks still apply to user purchase/restore delivery.

Disabled operations return the existing safe JSON convention with HTTP **503** and `{"code":"GOOGLE_BILLING_DISABLED"}`. Earlier authentication/input rejection can still fail independently. No configuration values, proofs or new logging are exposed. Only the server-local error union changed; no shared/mobile type or dependency changed.

## Notification/revocation decision

The policy disables **all** Google processing, including revocation writes. Disabled notifications return retryable 503 rather than falsely acknowledging completion. Neither a purchase notification nor a forged payload can create ownership. There is no hidden revocation-only bypass of this gate.

Operational limitation: revocations are deferred while the Google gate is disabled; existing records are not purged or silently changed. Provider retries are bounded, so operators must reconcile missed revocations before re-enabling Google test use. Re-enabling must retain the same isolated sandbox/credentials. Existing grants are not automatically invalidated by this purchase-processing flag. Production/customer Google billing remains unsupported. This policy does not block Apple merely because Android Store configuration is unfinished.

## Regression and validation

Coverage includes missing/empty/zero/false/malformed flags; malformed/missing credentials; allowed and rejected environments; tester allowlisting; direct service/provider/ledger calls; HTTP purchase/restore; disabled success/revocation/test notifications; no provider or DB access when disabled; policy changes during verification/delivery/lock waits; independent Apple verification; enabled Google delivery and acknowledgement ordering.

The old `CITYWALK_GOOGLE_TEST_PURCHASES=0` reproduction is now a permanent parameterized regression: context false, service rejected, no provider/durable/ack/access ports called. A separate real-ledger entry test proves rejection before database access. These are automated results, not Store/device acceptance.

Final validation:

| Command / gate | Result |
| --- | --- |
| Initial `npm run test:run -- src/lib/commerce/native/google-gate.server.test.ts --maxWorkers=1` | 34 passed / 1 file; before adding lock-wait coverage |
| Final `npm run test:run -- src/lib/commerce/native 'src/app/api/commerce/city-unlock/[citySlug]/route.test.ts' src/lib/commerce/cityUnlock.server.test.ts src/lib/commerce/cityUnlock-compatibility.server.test.ts --maxWorkers=2` | **77 passed, 17 skipped**; 7 passed files / 1 skipped DB file; exit 0 |
| `./node_modules/.bin/tsc --noEmit --incremental false` | PASS, exit 0 |
| `npm run lint` | PASS, exit 0 |
| `git diff --check` and whitespace check for new files | PASS |
| Mobile TypeScript/lint | Not rerun: no mobile/shared source or types changed |
| Isolated native billing DB tests | **BLOCKED / NOT RUN** under the no-0015 instruction; 17 cases skipped, not passing evidence |

The first combined run passed 75 tests / skipped 10 DB cases. Final rerun included the added lock-wait/Apple coverage and seven added DB cases. No assertions/timeouts were weakened. Existing Vite configuration and punycode deprecation warnings appeared; no unhandled test error. Source-only reproduction with flag `0`: **PASS** (rejected with zero provider/durable calls). No remaining Google enablement bypass was found in the traced paths; this is not a claim of exhaustive security certification.

**SAFE TO RESUME PHASE 3 PREFLIGHT: NO pending the requested isolated DB gate.** The source correction and automated non-DB gates pass. The owner's migration restriction takes precedence: isolated DB execution is pending because the existing `scripts/test-native-billing.mjs` runs migration 0015 twice in its disposable loopback database and this task explicitly prohibits executing 0015. The runner was not executed. An asynchronous clarification requested whether migration 0015 is permitted solely in that disposable loopback fixture; no answer/exception was received before handoff. Added DB regressions must not be described as passed until an authorized isolated run completes.

## Exact Phase 3A file scope

Implementation:

- `src/lib/commerce/native/config.server.ts`
- `src/lib/commerce/native/service.server.ts`
- `src/lib/commerce/native/providers.server.ts`
- `src/lib/commerce/native/ledger.server.ts`
- `src/app/api/commerce/native/notifications/google/route.ts`

Tests:

- `src/lib/commerce/native/google-gate.server.test.ts` (new)
- `src/lib/commerce/native/native-billing.server.test.ts`
- `src/lib/commerce/native/provider-boundary.test.ts`
- `src/lib/commerce/native/notifications.test.ts`
- `src/lib/commerce/native/ledger.integration.test.ts`

Evidence:

- `docs/qa/premium-luebeck/phase-3a-google-gate.md` (new)
- `docs/qa/premium-luebeck/phase-3-preflight.md` (historical report, follow-up pointer)
- `docs/qa/premium-luebeck/README.md` (current-status pointer)
