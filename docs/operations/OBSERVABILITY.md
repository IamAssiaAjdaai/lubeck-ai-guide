# CITYWALK operational health foundation

Issue: #110 OBS-01

This document describes the first launch-observability foundation. It does **not** claim that production monitoring, alerting, backup/restore or native crash reporting is complete.

## Health endpoint

`GET /api/health` is a non-cacheable readiness endpoint for infrastructure monitoring.

The response exposes only coarse operational state:

- service name
- runtime environment
- optional non-sensitive release identifier
- check timestamp
- database reachability
- auth configuration readiness
- media-storage configuration readiness
- transactional-email configuration readiness
- AI-provider configuration readiness

It never returns database URLs, API keys, bucket credentials, auth secrets, email-provider secrets, user data, GPS information, prompts or payment payloads.

### Status behavior

- `200` + `status: "ok"` when required readiness checks pass.
- `503` + `status: "degraded"` when PostgreSQL is unavailable or required Preview/production configuration is incomplete.
- Development/test builds do not fail readiness solely because production-only provider configuration is absent.

The Cloudflare production worker explicitly identifies itself with `CITYWALK_RUNTIME_ENV=production`.

## Release metadata

`CITYWALK_RELEASE` may contain a non-sensitive commit/release identifier. Where it is not set, Vercel's commit SHA is used when available; otherwise the endpoint reports `unknown`.

Never put secrets, account identifiers or customer information in the release field.

## What this endpoint does not probe

The endpoint intentionally avoids active outbound checks to Groq, Resend or S3 on every request. A health probe should not create provider traffic, send emails, consume AI quota or require privileged object operations.

Provider outages must instead be captured through runtime error monitoring and alerting.

## Structured operational failure events

CITYWALK emits a fixed JSON event named `citywalk_operational_failure` for launch-critical server failures. The contract is intentionally narrow: category, allowlisted code, severity, environment, release, timestamp, retryability and optional HTTP status. Arbitrary exception messages, stack traces, request bodies, account identifiers, GPS data, object keys and provider payloads are not accepted by the event API.

Current codes:

- `DATABASE_CONNECT_FAILED` — Cloudflare/Hyperdrive request database connection failed.
- `AI_PROVIDER_NOT_CONFIGURED` — Ask CITYWALK was requested without the required provider configuration.
- `AI_GUIDE_REQUEST_FAILED` — an unexpected server-side AI Guide failure produced a 5xx response.
- `REVENUECAT_NOT_CONFIGURED` — native commerce webhook configuration is incomplete.
- `REVENUECAT_WEBHOOK_PROCESSING_FAILED` — unexpected verified-webhook processing failure.
- `MEDIA_DELIVERY_FAILED` — unexpected public media lookup/delivery failure.
- `ACCOUNT_ERASURE_SCHEDULE_FAILED` — scheduled external account-erasure processing failed.

These events are suitable for Cloudflare log queries and later forwarding to an approved error-monitoring provider without changing the application call sites.

### Alert policy to configure before launch

The code does not activate an external alert destination. Production operations should create alerts from the structured events with at least these launch rules:

- **critical immediately:** any `DATABASE_CONNECT_FAILED`, `REVENUECAT_WEBHOOK_PROCESSING_FAILED`, or `ACCOUNT_ERASURE_SCHEDULE_FAILED` in production;
- **configuration immediately:** any production `AI_PROVIDER_NOT_CONFIGURED` or `REVENUECAT_NOT_CONFIGURED`;
- **rate/spike:** repeated `AI_GUIDE_REQUEST_FAILED` or `MEDIA_DELIVERY_FAILED` over the agreed operational window;
- correlate alerts by `environment` and `release` so Preview noise cannot page production responders.

Alert rules must key on the fixed event/code fields rather than parsing free-form exception text.

## Remaining OBS-01 work

Before launch, #110 still requires:

1. production server/runtime error monitoring with environment/release context;
2. actionable alerts for elevated 5xx, auth, DB, commerce webhook, media and AI failures;
3. native iOS/Android crash/error visibility;
4. production PostgreSQL backup policy and a restore drill against a safe non-production target;
5. migration recovery and rollback procedures;
6. incident runbooks for deployment, DB, commerce, storage, AI and native-release failures;
7. tested sensitive-data scrubbing for monitoring payloads.

No production monitoring provider, alert destination, backup job or deployment is activated by this foundation.
