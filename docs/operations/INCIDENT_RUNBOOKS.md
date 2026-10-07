# CITYWALK launch incident runbooks

Issue: #110 OBS-01

Use these runbooks to stabilize the product first, preserve evidence, and then recover. Never paste secrets, auth tokens, raw GPS trails, AI prompts, payment payloads or private media keys into incident notes.

## Common first five minutes

1. Confirm whether the incident is production, Preview or a local environment.
2. Record the release identifier and start time.
3. Check `/api/health` and the structured `citywalk_operational_failure` events.
4. Stop additional risky deploys, migrations or configuration changes.
5. Decide whether to degrade a feature, roll back, or continue investigation.

## Bad Web/API deployment

Trigger: elevated 5xx, broken core flow, or health regression immediately after deployment.

1. Compare the failing release with the last known good release.
2. Do not change the database unless the incident is proven database-related.
3. Roll back/promote the last known good application deployment using the approved hosting workflow.
4. Verify `/api/health`, public city content, auth and one AI request if AI is configured.
5. If the bad release included a migration, follow the database/migration runbook separately.
6. Record root cause and the fix before redeploying.

## Database / migration issue

Trigger: `DATABASE_CONNECT_FAILED`, health database=error, failed migration, or widespread DB-backed endpoint failure.

1. Stop migrations and risky writes.
2. Check provider availability and connection limits.
3. Confirm a recent backup/PITR recovery point exists.
4. For migration errors, inspect actual schema and Drizzle migration state.
5. Prefer a forward fix when data is intact.
6. If data is damaged, restore to non-production first and verify before any approved production recovery.
7. After recovery, verify auth, CMS/public content, saved walks and commerce invariants.

See `DATABASE_BACKUP_RESTORE.md`.

## RevenueCat/payment webhook issue

Trigger: `REVENUECAT_WEBHOOK_PROCESSING_FAILED`, reconciliation backlog, or entitlement mismatch.

1. Do not manually grant paid access based only on a client callback.
2. Preserve provider event IDs and statuses, but not payment/card payloads.
3. Confirm webhook signing/configuration and server reachability.
4. Reprocess only idempotent/verified provider events through the approved recovery path.
5. Verify PostgreSQL entitlement state against the authoritative provider state.
6. Keep purchase UI fail-closed if verification is unavailable.
7. Do not activate live billing/configuration as part of incident debugging without explicit approval.

## Media/storage outage

Trigger: repeated `MEDIA_DELIVERY_FAILED`, broken images/audio, or storage-provider incident.

1. Confirm public content/API remains usable without the affected media.
2. Check S3/R2 endpoint/bucket/provider status and runtime configuration.
3. Do not expose private object keys in tickets/logs.
4. If a storage migration/cutover caused the issue, restore the prior runtime configuration; do not delete source objects.
5. Verify representative image, audio and range requests after recovery.

## AI provider outage

Trigger: `AI_GUIDE_REQUEST_FAILED`, provider outage, timeout spike or quota issue.

1. Keep Home/Explore/Walk/navigation/content available; AI is not allowed to take down the rest of CITYWALK.
2. Confirm provider configuration/status without logging prompts or traveler questions.
3. Allow the existing user-facing temporary-unavailable behavior to fail closed.
4. Do not switch models/providers in production without a reviewed change.
5. Verify one grounded response after recovery and confirm no precise GPS/deadline data is sent.

## Native iOS/Android release regression

Trigger: crash spike, startup failure, broken auth/navigation, or store-release regression.

1. Identify platform, app version/build and OS range.
2. Stop rollout where the store supports staged rollout controls.
3. Keep the backend compatible with the last known good mobile build when possible.
4. For a server-side compatibility issue, prefer a backward-compatible server hotfix.
5. For a client-only defect, prepare a reviewed hotfix build; do not submit it automatically.
6. Verify launch flow on a real affected device before resuming rollout.

Native crash reporting still requires an approved live provider/setup before #110 is complete.

## Accidental CMS content publication

Trigger: wrong city/place/tour/media published or unsafe content becomes public.

1. Unpublish/archive the affected CMS record through the normal admin workflow.
2. Do not delete source data while investigating.
3. Verify public APIs no longer return the content and cached public snapshots invalidate correctly.
4. Check related tours, media attachments and verified AI knowledge activation separately.
5. Record who/what published it and add the missing review/permission guard if needed.

## Auth failure spike

Trigger: login/reset/verification failures rise sharply or auth endpoints return 5xx.

1. Check health/database first.
2. Check Better Auth base URL/secret/provider configuration without exposing values.
3. Separate email/password failures from Google/Apple provider failures.
4. Keep provider flags disabled when production provider configuration is incomplete.
5. Verify signup/login/session/logout/reset on a controlled test account after recovery.

Dedicated auth-failure rate instrumentation/alerting remains open under #110.

## Release closeout

After any incident:

- verify health and the affected critical journey;
- record start/end time, release, impact and recovery action;
- document whether data was lost or entitlements were affected;
- add a regression test/runbook improvement;
- confirm monitoring did not capture sensitive payloads.
