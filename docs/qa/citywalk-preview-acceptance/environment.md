# Preview configuration contract

CITYWALK preview acceptance uses an isolated Cloudflare preview / temporary Worker runtime. Configure preview values in the corresponding Cloudflare environment before an approved preview deployment. Never copy production DB/storage/Stripe credentials into acceptance environments.

Mobile `preview` and `store-beta` EAS profiles use the EAS Preview environment. That environment must provide `EXPO_PUBLIC_CITYWALK_API_ORIGIN` as an explicitly approved public HTTPS Cloudflare preview origin; the repository does not hardcode a temporary deployment hostname.

| Variable / setting | Classification | Requirement |
| --- | --- | --- |
| `DATABASE_URL` | Runtime required | Isolated PostgreSQL for committed migrations, public/auth/CMS/commerce reads, and shared rate limiting. |
| `BETTER_AUTH_SECRET` | Runtime required | Unique 32+ character server-only secret. Also keys pseudonymous rate-limit identifiers before database persistence. |
| `BETTER_AUTH_URL` | Runtime required | Explicit absolute origin for auth and checkout return URLs. No hosting-provider URL fallback is supported. |
| `CITYWALK_CONTENT_SOURCE` | Runtime selector, defaults to database in production | `database` for acceptance. `auto` is development-only; explicit `code` is not acceptable as a silent outage fallback. |
| `NEXT_PUBLIC_CITY_MAP_STYLE_URL` | Optional build-time public setting | Defaults to `https://tiles.openfreemap.org/styles/liberty`; no key required. Changing it requires a rebuild. Never put secrets in the URL. |
| `GROQ_API_KEY` | Feature-specific runtime secret | Existing assistant calls Groq with `openai/gpt-oss-20b`; no OpenAI key/model environment override is used by this route. |
| `CITYWALK_MEDIA_STORAGE=s3` | Feature-specific runtime selector | Required for managed object delivery. |
| `CITYWALK_MEDIA_S3_ENDPOINT`, `CITYWALK_MEDIA_S3_REGION`, `CITYWALK_MEDIA_S3_BUCKET` | Feature-specific runtime configuration | Isolated S3-compatible target; endpoint HTTPS except local development. |
| `CITYWALK_MEDIA_S3_ACCESS_KEY_ID`, `CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY` | Feature-specific runtime secrets | Scoped to isolated bucket/prefix. Public and entitled media use same-origin delivery; no public media-base env or broad image-domain allowlist. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Feature-specific runtime secrets | Only confirmed test mode for acceptance. Hosted checkout needs no browser publishable key. Products/prices are DB mappings. Webhook signature and transaction tests are separate from live sandbox acceptance. |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST` | Optional build-time browser analytics; also server commerce analytics | Public ingestion token, not an administrative credential. No location/question/session secrets in analytics payloads. |
| `CITYWALK_MEDIA_MIGRATION_SOURCE_S3_*`, `CITYWALK_MEDIA_MIGRATION_DESTINATION_S3_*` | Operational CLI only | Explicit storage migration profiles, never automatic deployment imports. |
| `CITYWALK_ADMIN_EMAIL`, `CITYWALK_ADMIN_NAME`, `CITYWALK_ADMIN_PASSWORD` | Operational CLI only | Explicit staff bootstrap, not traveler auth or build configuration. |

Deployment target: Cloudflare Workers through vinext; Node compatibility enabled. Validate with `npm ci`, `npm run build:vinext`, and `npm run deploy:vinext:dry-run`. Production/preview database migrations remain explicit release actions and are not coupled to the Worker build. Auth and paid-media authorization remain server-side; no session or secret data is added to public DTOs.
