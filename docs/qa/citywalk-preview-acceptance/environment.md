# Preview configuration contract

Set values in Vercel's **Preview** scope, then redeploy. Never copy production DB/storage/Stripe credentials into acceptance environments. No secret values are included here. This workspace builds with its existing isolated local PostgreSQL and unique local auth secret, not pulled Preview secrets.

| Variable / setting | Classification | Requirement |
| --- | --- | --- |
| `DATABASE_URL` | Build + runtime required | PostgreSQL for committed migrations and public/auth/CMS/commerce reads. Preview must be isolated. |
| `BETTER_AUTH_SECRET` | Runtime required; available during build's route initialization | Unique 32+ character secret, server-only. |
| `BETTER_AUTH_URL` | Runtime required outside Vercel; optional on Vercel | Local absolute origin; in Preview omit to use validated deployment and branch hosts. An explicit value overrides dynamic hosts. Also determines checkout return origin. |
| `VERCEL_URL`, `VERCEL_BRANCH_URL` | Platform runtime configuration | Auto-provided exact hosts; do not hardcode a deployment URL or weaken trusted origins. Email/password auth has no external OAuth callback. |
| `CITYWALK_CONTENT_SOURCE` | Runtime selector, defaults to database in production | `database` for acceptance. `auto` is development-only; explicit `code` is not acceptable as a silent outage fallback. |
| `NEXT_PUBLIC_CITY_MAP_STYLE_URL` | Optional build-time public setting | Defaults to `https://tiles.openfreemap.org/styles/liberty`; no key required. Changing it requires a rebuild. Never put secrets in the URL. |
| `GROQ_API_KEY` | Feature-specific runtime secret | Existing assistant calls Groq with `openai/gpt-oss-20b`; no OpenAI key/model environment override is used by this route. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Feature-specific runtime configuration/secret | Required by assistant rate limiting; do not bypass limits when absent. |
| `CITYWALK_MEDIA_STORAGE=s3` | Feature-specific runtime selector | Required for managed object delivery. |
| `CITYWALK_MEDIA_S3_ENDPOINT`, `CITYWALK_MEDIA_S3_REGION`, `CITYWALK_MEDIA_S3_BUCKET` | Feature-specific runtime configuration | Isolated S3-compatible target; endpoint HTTPS except local development. |
| `CITYWALK_MEDIA_S3_ACCESS_KEY_ID`, `CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY` | Feature-specific runtime secrets | Scoped to isolated bucket/prefix. Public and entitled media use same-origin delivery; no public media-base env or broad image-domain allowlist. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Feature-specific runtime secrets | Only confirmed test mode for acceptance. Hosted checkout needs no browser publishable key. Products/prices are DB mappings. Webhook signature and transaction tests are separate from live sandbox acceptance. |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST` | Optional build-time browser analytics; also server commerce analytics | Public ingestion token, not an administrative credential. No location/question/session secrets in analytics payloads. |
| `CITYWALK_MEDIA_MIGRATION_SOURCE_S3_*`, `CITYWALK_MEDIA_MIGRATION_DESTINATION_S3_*` | Operational CLI only | Explicit storage migration profiles, never automatic deployment imports. |
| `CITYWALK_ADMIN_EMAIL`, `CITYWALK_ADMIN_NAME`, `CITYWALK_ADMIN_PASSWORD` | Operational CLI only | Explicit staff bootstrap, not traveler auth or build configuration. |

Deployment: Next.js; Node 22.x; `npm ci`; `npm run vercel-build` (committed Drizzle migrations followed by production build). No automatic content seed/import. No schema change in this acceptance branch. Auth and paid-media authorization remain server-side; no session or secret data added to public DTOs.
