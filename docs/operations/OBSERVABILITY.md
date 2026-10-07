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
- `AUTH_SIGN_IN_FAILED` — an email/social sign-in request was rejected without logging credentials or account identity.
- `AUTH_RATE_LIMITED` — an auth endpoint returned HTTP 429.
- `AUTH_PROVIDER_CALLBACK_FAILED` — a social-provider callback was rejected.
- `AUTH_RECOVERY_FAILED` — password-reset/recovery was rejected.
- `AUTH_REQUEST_REJECTED` — another public auth request was rejected.
- `AUTH_SERVER_FAILED` — Better Auth returned/threw an unexpected server-side failure.

These events are suitable for Cloudflare log queries and later forwarding to an approved error-monitoring provider without changing the application call sites.

### Alert policy to configure before launch

The code does not activate an external alert destination. Production operations should create alerts from the structured events with at least these launch rules:

- **critical immediately:** any `DATABASE_CONNECT_FAILED`, `REVENUECAT_WEBHOOK_PROCESSING_FAILED`, or `ACCOUNT_ERASURE_SCHEDULE_FAILED` in production;
- **configuration immediately:** any production `AI_PROVIDER_NOT_CONFIGURED` or `REVENUECAT_NOT_CONFIGURED`;
- **rate/spike:** repeated `AI_GUIDE_REQUEST_FAILED` or `MEDIA_DELIVERY_FAILED` over the agreed operational window;
- **auth spike:** elevated `AUTH_SIGN_IN_FAILED`, `AUTH_RATE_LIMITED`, `AUTH_PROVIDER_CALLBACK_FAILED`, `AUTH_RECOVERY_FAILED`, or `AUTH_REQUEST_REJECTED`; any repeated `AUTH_SERVER_FAILED` should be treated as a service incident;
- correlate alerts by `environment` and `release` so Preview noise cannot page production responders.

Alert rules must key on the fixed event/code fields rather than parsing free-form exception text.

## Native iOS/Android crash reporting foundation

CITYWALK includes `expo-observe` on Expo SDK 57 so installed iOS and Android builds can record native crashes. Native crash reporting is supported by `expo-observe` 57.0.21 and later.

The integration is intentionally fail-closed:

- dispatch is hard-disabled in the SDK 57 foundation; `dispatchingEnabled` is always false and `sampleRate` is always 0;
- no committed EAS build profile sets `EXPO_PUBLIC_CITYWALK_OBSERVABILITY`, and setting it to `1` fails the build;
- debug dispatch is disabled;
- SDK 57's shipped `expo-observe` API does not expose the SDK 58 `errorHandlingEnabled` opt-out, so CITYWALK does not permit off-device Observe dispatch on SDK 57;
- CITYWALK does not call `Observe.reportError`, mount `ObserveErrorBoundary`, or attach custom error attributes in this foundation; handled/render error reporting stays out until a separate privacy review;
- CITYWALK does not attach account IDs, emails, GPS, prompts, tokens, payment payloads or private object keys to Observe;
- environment labels are restricted to development / preview / production.

With dispatch hard-disabled, this change does not activate Preview or production telemetry. A later, separate change may enable Observe only after either upgrading to a compatible SDK/API that can disable automatic unhandled-JavaScript recording or explicitly approving that error-reporting privacy scope. That activation must then verify a deliberate native crash/error, environment/release grouping, and a crash-regression alert/check.

The EAS installation/client identifier is pseudonymous and must continue to be treated as monitoring data rather than an account identifier.

## Remaining OBS-01 work

Before launch, #110 still requires:

1. production server/runtime error monitoring with environment/release context;
2. activate/test actionable alerts for elevated 5xx, auth, DB, commerce webhook, media and AI failures (auth failure events now exist);
3. decide the post-SDK-57 privacy/upgrade path, then explicitly activate and verify native iOS/Android crash visibility in an approved build (provider foundation is installed but dispatch is hard-disabled);
4. activate production PostgreSQL managed backups and record a successful restore drill against a safe non-production target (portable tooling/policy now exists);
5. execute and evidence migration recovery/rollback drills (procedures now documented);
6. validate incident runbooks during release rehearsal (runbooks now documented);
7. keep sensitive-data scrubbing tests green as monitoring expands.

No production monitoring provider, alert destination, backup job or deployment is activated by this foundation.
