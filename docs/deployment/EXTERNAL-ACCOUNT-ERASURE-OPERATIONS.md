# External account erasure: scheduling and monitoring

19 October 2026. Scope: PR #393 follow-up; shared backend/lifecycle behavior for iOS, Android and Public Web. No new Admin UI or native UI. **Code/tests ready for review; operational activation blocked.** This document does not authorize production operations, live provider calls, secret changes, deployment or cron activation. No GitHub Actions billing is required by this plan.

## Audited deletion contract

1. Authenticated deletion requires account/session ownership and password or fresh social reauthentication. Public web deletion requires its one-time, hashed email proof. Staff/editorial retention guards apply to both paths.
2. The same database transaction queues external erasure and deletes eligible account-owned rows. Failures roll back both. Financial orders/subscriptions remain detached under existing retention rules. No migration or queue-reset operation is introduced here.
3. Every deleted account queues a RevenueCat erasure using its immutable account ID, including free accounts. Native RevenueCat identity sync uses that same ID. Absence of commerce entitlement or a disabled SDK does **not** prove that no historical provider record exists. Only an actual successful provider response or RevenueCat 404 completes the job.
4. If the selected Apple auth record has a refresh token (or access-token fallback), its token and type hint are sealed into a versioned AES-GCM envelope before the account row cascades. The durable job contains the envelope, not the raw token. Without a usable token no Apple job is created; token revocation is not deletion of the person's Apple ID.
5. Queue creation currently selects one Apple auth row (`limit(1)`). Multiple linked Apple records are not covered by the existing queue-creation acceptance. This scheduling change does not change account linking or reconstruct tokens already removed by a historical account deletion. Establish the single-Apple-account invariant or address multi-record capture separately before claiming comprehensive coverage of that scenario.

The worker is at-least-once for provider effects. A crash after a successful API call but before the database acknowledgement can repeat that call. Claims use `FOR UPDATE SKIP LOCKED`, five-minute leases and compare-and-set completion/failure updates; an obsolete worker cannot acknowledge another worker's lease. These properties do not guarantee exactly one external HTTP request.

## Provider-specific configuration

| Provider | Server-only requirements | When absent/incomplete |
| --- | --- | --- |
| Apple | Original envelope `BETTER_AUTH_SECRET`; `CITYWALK_APPLE_OAUTH_CLIENT_ID`, `CITYWALK_APPLE_TEAM_ID`, `CITYWALK_APPLE_KEY_ID`, `CITYWALK_APPLE_PRIVATE_KEY`, `CITYWALK_APPLE_APP_BUNDLE_IDENTIFIER` | Apple rows are not claimed. All payloads, attempts, deadlines, leases and errors stay unchanged. RevenueCat can still run. |
| RevenueCat | `COMMERCE_REVENUECAT_SECRET_API_KEY`, authorized for customer deletion in the correct project | RevenueCat rows are not claimed or marked complete. Apple can still run. |
| Unrecognized provider | No eraser registered | Preserve row unchanged and investigate the aggregate backlog alert. Never map it to another provider. |

The Apple fields reuse the existing social-auth signing contract. The scheduler passes only Apple fields into that factory, and signs inside the per-job boundary; unrelated partial Google configuration and an Apple signing failure cannot stop valid RevenueCat jobs. Presence validation does not validate key material, project identity or remote permission. Never rotate `BETTER_AUTH_SECRET` without a separate plan for existing envelopes: a new key cannot decrypt historical jobs. Restore access to the original key through the approved secret/recovery process; do not delete or silently complete unreadable jobs.

Each configured provider receives a separate batch of at most ten jobs. Both configured means at most twenty claims per invocation, so one failing provider cannot consume the other's batch. Provider requests and scheduled DB connection establishment have ten-second timeouts. Database query duration and platform invocation limits still require isolated runtime acceptance; twenty provider timeouts alone can consume about 200 seconds.

## Retry and failure semantics

- Only `erased` or `not_found` outcomes acknowledge a job. Apple currently accepts HTTP 200; RevenueCat accepts 200 or 404. Nonterminal responses, transport timeouts, malformed/undecryptable Apple envelopes and unknown outcomes retain the job.
- Failed attempts release the lease and set the next due time using 1, 2, 4, 8, 16, 32, then 60 minutes, capped at 60 minutes indefinitely. Actual execution also waits for the next scheduler tick. No automatic discard/dead-letter completion or retry-count reset is added.
- New `last_error` values are restricted to `NOT_CONFIGURED`, `INVALID_PAYLOAD`, `REQUEST_FAILED`, `ERASURE_FAILED`. SDK/network messages, response bodies, stacks and stringified exceptions are not stored. Historical error values are preserved and must be treated as potentially sensitive.
- A hard worker/database exception rejects the scheduled invocation with a fixed error and emits `ACCOUNT_ERASURE_SCHEDULE_FAILED`. Existing leases recover after expiry. Provider failures are recorded and counted without preventing the other provider's batch.
- The manual worker script uses the same orchestration and exits nonzero for no configuration, failed jobs or lost leases. It was **not executed** in this task. Its `server-only` imports require the React server condition; any separately authorized operator run must use the appropriate Node server condition and explicitly verified target/environment. Never use it as an unreviewed production smoke test.

## Signals and monitoring plan

The scheduled entrypoint logs only fixed lifecycle markers, configured-provider booleans, provider names from the `apple`/`revenuecat` allowlist and numeric counters. It never logs the event/controller, environment object, connection URL, account/job ID, encrypted envelope, token, JWT, provider body or raw exception. Existing structured operational events add environment/release/time metadata through their privacy-safe allowlist.

| Signal | Meaning / response |
| --- | --- |
| `CITYWALK_ACCOUNT_ERASURE_SCHEDULE_STARTED` | Invocation reached a usable provider configuration. Match to a final processed marker. |
| `CITYWALK_ACCOUNT_ERASURE_PROVIDER_PROCESSED` | Per-provider claimed/completed/failed/lostLeases; `processed` does not mean every job succeeded. |
| `CITYWALK_ACCOUNT_ERASURE_SCHEDULE_PROCESSED` | Final aggregate counters; zero claims does not establish an empty unconfigured-provider backlog. |
| `ACCOUNT_ERASURE_SCHEDULE_NOT_CONFIGURED` | No usable provider; no DB connection/work, or unexpected configuration skip. Owner configuration action required. |
| `ACCOUNT_ERASURE_PROVIDERS_UNAVAILABLE` | Partial configuration; pair the missing-provider boolean with aggregate pending counts. It is not evidence that the missing provider has no jobs. |
| `ACCOUNT_ERASURE_APPLE_FAILED` / `ACCOUNT_ERASURE_REVENUECAT_FAILED` | At least one provider job failed this invocation; inspect aggregate fixed error codes and provider health privately. |
| `ACCOUNT_ERASURE_LEASE_LOST` | A worker could not acknowledge its claim; investigate overlapping/slow invocations. Never force-complete the row. |
| `ACCOUNT_ERASURE_SCHEDULE_FAILED` | Critical setup/connect/query/orchestration failure. Invocation rejected; investigate DB/binding/runtime health. |
| `ACCOUNT_ERASURE_DATABASE_CLOSE_FAILED` | Connection cleanup warning; recorded job outcomes are unchanged. |

After explicit operational approval, route these existing structured events to Cloudflare-native logs/metrics and the owner's approved alert destination. No GitHub scheduled workflow or paid Actions runner is part of the design. Log retention, access, cost/quotas and the alert recipient need owner acceptance. Do not put provider identifiers or secret values into an alert.

Proposed initial thresholds (operational targets, not legal deadlines): notify immediately for a critical schedule failure, unknown-provider backlog, or a provider with pending jobs but missing configuration; investigate any provider failures; escalate three consecutive failing invocations, repeated lost leases, pending jobs older than 24 hours, or no final processed heartbeat for 15 minutes after activation. Tune against actual arrival rate and provider limits. Confirm an alert and a recovery notification using injected failures in an isolated environment first.

For an independently approved, read-only monitoring connection, this aggregate query avoids raw identifiers, payloads and historical messages. It has **not** been executed on production:

```sql
SELECT CASE WHEN provider IN ('apple', 'revenuecat') THEN provider
            ELSE 'unrecognized' END AS provider_bucket,
       CASE WHEN last_error IN ('NOT_CONFIGURED', 'INVALID_PAYLOAD',
                                'REQUEST_FAILED', 'ERASURE_FAILED')
            THEN last_error ELSE 'NONE_OR_LEGACY' END AS error_bucket,
       count(*) AS pending,
       count(*) FILTER (WHERE next_attempt_at <= now()
         AND (lease_expires_at IS NULL OR lease_expires_at <= now())) AS ready,
       count(*) FILTER (WHERE lease_expires_at > now()) AS leased,
       max(attempts) AS max_attempts,
       extract(epoch FROM now() - min(created_at)) AS oldest_pending_seconds
FROM external_account_erasure_jobs
WHERE completed_at IS NULL
GROUP BY 1, 2;
```

## Scheduling proposal — not activated

Use a Cloudflare-native scheduled invocation, provisionally every five minutes, after the owner approves the exact tested release and resource/retention/alert configuration. This is a proposal only: `cloudflare.config.ts` still contains **no cron and no added erasure provider bindings**. It was not edited. No production schedule or infrastructure configuration was inspected or modified during this follow-up.

Before activation:

1. Inventory pending jobs by the safe aggregate buckets, using separately authorized read-only access. Include historical Apple/RevenueCat jobs even though Public Beta is free. Establish the multi-Apple-record limitation above and the provenance of historical envelope keys.
2. Verify the exact provider project/client and minimum deletion permission using approved isolated/sandbox provider acceptance. Current tests mock transports and do not prove real provider permissions, quotas or current terminal-response behavior. Do not enable purchases, subscriptions, products or the AI guide to obtain erasure credentials.
3. Prepare a separately reviewed binding/trigger change for the intended Worker and environment. Apple fields are shared with social-auth configuration; review any sign-in activation effect. Preserve the existing production binding baseline and original envelope key. A production code/config change still needs explicit deployment authorization.
4. Rehearse the scheduled entrypoint against isolated database/storage and synthetic jobs, including one configured provider, bad Apple signing material, RevenueCat failure/not-found, timeout, database failure, lease recovery and an unknown-provider backlog. Prove alert delivery and heartbeat monitoring on the exact candidate artifact.
5. Confirm cadence, invocation/query limits and throughput (ten jobs per configured provider per tick), on-call ownership, alert destination, log retention and the manual recovery runbook. A disabled cron cannot provide erasure completion guarantees.

## Recovery and pause

- For platform/DB faults, diagnose fixed events and safe metrics; correct approved bindings/connectivity. An expired lease becomes claimable without manual row resets. Resume only through an approved scheduling operation.
- For one provider outage or invalid credentials, the other provider continues. Retry/backlog alerts remain active. Repair credentials/project permissions through owner-controlled configuration; do not disable unrelated auth credentials or turn on commerce. For a broad incident, pause the scheduler through a separately approved operation and keep the queue intact.
- For `INVALID_PAYLOAD`, preserve the envelope and seek the original key through the approved recovery process. If data is irrecoverable, escalate to the privacy owner; do not claim revocation or overwrite payloads as a workaround. Never export decrypted tokens to a ticket/log.
- For lost leases or timeouts, compare safe counters and invocation duration, wait for lease expiry, and test recovery in isolation. Do not shorten leases below provider latency or add unbounded concurrency.
- After repair, replay through the provider-specific worker. Verify decreasing pending counts, terminal acknowledgements and healthy subsequent ticks; close the alert only after backlog and heartbeat checks pass. Do not bulk-set `completed_at`, delete pending jobs, suppress alerts or reset attempts merely to make the dashboard green.

All production scheduling, provider acceptance, backlog inventory, alert delivery and recovery rehearsal remain **BLOCKED / NOT TESTED** until explicitly authorized and performed. This task uses disposable loopback PostgreSQL and mocks only. Production remains unchanged.
