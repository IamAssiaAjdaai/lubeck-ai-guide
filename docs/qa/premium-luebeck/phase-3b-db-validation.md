# Phase 3B — Isolated billing DB and migration 0015 validation

2026-09-28. Branch `feat/premium-luebeck`, unchanged HEAD `cba060b4d54e545b6476e088d15d4b8599510c32` plus the existing local premium implementation. This task authorizes disposable local migration/testing only. No Preview/Production migration, remote database connection, commit, staging, push, deployment, build, Store publication, email or real purchase.

## A. Target safety

Read-only identity check confirmed writable **PostgreSQL 16.15 on loopback**, using the local administration database only to create/remove uniquely named disposable databases. No env files were loaded; the scripts reject non-loopback targets. The billing fixture independently checked that its new `cw_billing_*` database had zero public tables before schema setup. All accounts, sessions, commerce and saved data were synthetic. Saved Walk and lifecycle regressions used separate new `cw_savedwalk_*` and `cw_lifecycle_*` databases.

The sandbox initially rejected loopback access with EPERM. The authorized local checks/runners then executed with network permission. No remote credentials were retrieved. Final read-only cleanup verification found **zero** remaining disposable databases matching these three test prefixes.

## B. Actual migration SQL

Inspected unchanged working-tree `drizzle/0015_majestic_lake.sql` (not yet committed):

- Affected table: **`commerce_orders` only**.
- `price_id`, `currency`, `amount_total`: `DROP NOT NULL`.
- New check: `commerce_orders_financial_evidence`. Either all three financial fields are non-null, or provider is exactly `apple_sandbox` / `google_test` and all three are null. Mixed-null combinations fail. Stripe, unknown and Production-native-labelled rows cannot use the all-null exception.
- No new/dropped columns, default changes, index changes, FK changes, data deletion or row rewrite statements.
- This is non-destructive constraint relaxation with a compensating check, **not strictly additive-only**.
- Existing `(provider, provider_payment_intent_id)` and `(provider, provider_checkout_session_id)` order uniqueness remain. Event uniqueness remains `(provider, provider_event_id)`; grant uniqueness remains `(user_id, source_order_id, scope_type, scope_key)`.
- Environment identity is encoded in provider names, not a separate DB environment column. Different provider-qualified namespaces may reuse an identifier. Store/environment verification remains a server responsibility; the DB does not authenticate receipts.
- Stripe financial evidence stays required; existing web-pass rows and references survive. No changes to account Saved Walks or auth tables.

## C–E. Upgrade, rerun and preservation

The runner reads the **exact committed pre-0015 baseline** (`cba060b4d54e545b6476e088d15d4b8599510c32`) migration journal/SQL through 0014, asserts local pre-0015 SQL is identical, and migrates a fresh database to that baseline. It does not truncate/edit the repository journal or insert migration journal records manually. A temporary folder holds an unchanged copy of the committed baseline journal.

Before 0015, synthetic fixtures include:

- Three Better Auth users, one credential account and one session;
- Traveler locale preference;
- Legacy Lübeck 72-hour product/price/grant;
- Three Stripe orders and active/revoked/expired entitlements;
- One Stripe provider event;
- One native-labelled pending candidate with complete financial fields required by the old schema;
- One valid non-empty account Saved Walk.

**PASS:** all 11 relevant table snapshots match exactly after applying 0015. Four orders, three entitlements, account/session and Saved Walk survive. Actual column metadata confirms only the three intended nullability changes; all default and index definitions are unchanged.

**PASS:** a second invocation of the same Drizzle migrator used for normal journal-driven migrations is harmless. Journal count is **16**, with the SHA-256 of the actual 0015 SQL recorded exactly once and matching journal timestamp. The financial-evidence constraint exists once; constraint/index snapshots and data remain unchanged. The task did not run `npm run db:migrate`, whose normal configuration could select a non-test target; it used the same migration mechanism with an explicit disposable connection.

## F–K. Real DB regressions

| Boundary | Result |
| --- | --- |
| Same provider/transaction, same account | Concurrent/repeated delivery produces one order/grant/event |
| Same transaction, different account | Conflict; no second-account grant; also rejects a changed binding attempting to claim an existing transaction |
| Actual uniqueness constraints | Duplicate order transaction and provider event fail PostgreSQL 23505 |
| Apple/Google namespace | Same synthetic hash has separate correct provider-qualified orders/grants |
| Different provider environments | DB namespace probe permits a fully priced `apple_production`-labelled synthetic order alongside sandbox/test rows; no Production verifier, grant or connection is used |
| Distinct purchases | Each distinct verified test identity can produce its own order/grant |
| Revocation / old replay | Terminal revocation wins; delayed success cannot reactivate |
| Google flag `0` | Real POST purchase/restore, direct service, ledger, acknowledgement and notification attempts rejected; all ownership-table snapshots unchanged |
| Google enabled | Mocked server-verification evidence reaches real ledger once; idempotent retry; second account conflicts; mock acknowledgement checks committed order/grant before executing |
| Apple with Google disabled | Normalized Apple evidence + mocked verifier → real service/ledger, replay, conflict and revocation pass; malformed/wrong bundle/product evidence rejected before writes |
| Notification success | Even when enabled, purchase-success notifications never grant; revocation verifies and revokes the existing order/grant, duplicate/out-of-order safe |
| Legacy commerce | Checkout concurrency, webhook rollback, duplicate events and analytics failure tests pass; real legacy access reads, 72-hour duration and Stripe refund/revocation pass |
| Saved Walks | Upgrade preservation plus separate 13-test account-save regression pass |
| Retention | Both Apple/Google native-linked synthetic accounts return `RETENTION_REVIEW_REQUIRED` with account/session/order/grants intact; separate lifecycle suite proves ordinary traveler deletion still works |

Google-disabled durable delta: **orders 0; product grants 0; entitlements 0; provider events 0**. No existing saved copy, preference or commerce row is silently removed.

All Store verification evidence is synthetic/mocked; this is not Apple/Google sandbox purchase acceptance. The existing disabled-notification policy still defers revocations, requiring retry/reconciliation before re-enabling Google use. This test does not remove that operational limitation.

## L–M. Commands and results

| Command | Final result |
| --- | --- |
| `node scripts/test-native-billing.mjs` | **31 passed / 3 files**, zero skipped: original **17/17** native ledger tests, **11** Phase 3B tests, **3** commerce webhook DB tests; upgrade/rerun assertions also pass |
| `node scripts/test-account-saved-walks.mjs` | **13 passed / 1 file**, zero skipped; disposable migration upgrade check passes |
| `node scripts/test-account-lifecycle.mjs` | **12 passed / 1 file**, zero skipped; real Better Auth with mocked email/rate limit transport |
| `npm run test:run -- src/lib/commerce src/app/api/commerce --exclude '**/*.integration.test.ts' --maxWorkers=2` | **133 passed / 20 files**, zero skipped |
| `./node_modules/.bin/tsc --noEmit --incremental false` | PASS, exit 0 |
| `npm run lint` + ESLint on final changed test/runner files | PASS, exit 0 for both |
| `git diff --check` + whitespace checks on new files | PASS |

Initial local DB identity failed solely due to sandbox EPERM; authorized read-only retry succeeded. Two initial billing-fixture setup attempts failed on PostgreSQL 42P08 (ambiguous enum parameter); the second exposed only sanitized error class/code and source location. The synthetic fixture now casts that parameter explicitly. No application/schema assertion was weakened. The next run passed 30 tests; a final added financial-constraint regression and stronger distinct-purchase assertion yielded **31 passing tests**. The baseline Git reference was then pinned to the reviewed commit (rather than mutable HEAD) so the fixture remains usable after the feature commit; the complete 31-test DB gate was rerun on that final harness. Every failed/successful attempt cleaned up its disposable database.

The first commerce unit run passed **133 tests**, with **30 DB cases skipped** there; DB suites were run separately as above. The final non-DB command explicitly excludes integration files to avoid treating skips as acceptance. Existing Vite configuration/punycode warnings remain; no unhandled test errors in successful runs. No mobile/shared code or catalogs changed, so mobile TypeScript/lint/i18n were not rerun.

## N. Exact changes in this task

- `scripts/test-native-billing.mjs`: invoke upgrade/preservation fixture; include added DB/legacy tests; sanitized setup-failure location.
- `scripts/native-billing-upgrade-fixture.mjs`: new disposable DB baseline→0015, preservation and rerun assertions.
- `src/lib/commerce/native/phase3b.integration.test.ts`: new DB-backed boundary, legacy and retention regressions.
- `docs/qa/premium-luebeck/phase-3b-db-validation.md`: this evidence.
- `docs/qa/premium-luebeck/phase-3a-google-gate.md`: dated follow-up pointer resolving the historical DB blocker.
- `docs/qa/premium-luebeck/README.md`: current status pointer.

No product/source fix was required. Migration 0015, application billing logic, dependency versions, mobile cache changes, root TypeScript configuration, private files and held stash were preserved.

## O–P. Handoff

No additional billing enablement or DB integrity bypass was found in these tested paths. This does not certify Store configuration, cryptography against live Store evidence, missed-notification reconciliation or physical purchase behavior. Previous dependency/operational limitations remain part of Phase 3 review.

**SAFE TO RESUME PHASE 3 PREFLIGHT: YES.** Final totals: **189 passed / 25 files, zero skipped** (133 non-DB + 56 DB). **SAFE TO BUILD IOS SANDBOX CLIENT remains NO** until the separate infrastructure/Store/signing preflight passes. Resuming preflight is not approval for Production, charging or EAS build. No infrastructure preflight, commit or push is executed by Phase 3B.
