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
