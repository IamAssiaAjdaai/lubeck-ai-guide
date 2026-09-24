# CITYWALK V2 local setup

Use Node.js supported by the installed Next.js version, npm, and Docker Compose.
Start Docker Desktop first on macOS/Linux. PostgreSQL 16 and Drizzle are the existing data layer.

## Configure and start

```bash
npm ci
cp .env.example .env.local
```

Set `BETTER_AUTH_SECRET` in the ignored `.env.local` to a unique random value of at least 32 characters. Generate it locally, for example with `openssl rand -base64 48`; do not put the output in source control or shared logs. Keep `BETTER_AUTH_URL=http://localhost:3000` for this local server. The example database URL is only for the repository's local Compose service, never a production credential.

```bash
npm run db:up
npm run db:migrate
npm run db:seed
npm run cms:import-lubeck
npm run db:verify
npm run dev
```

The seed bootstraps 25 curated Lübeck places; the explicit CMS import adds their authored translations, source relationships, published revisions and editorial tour. Seed alone is insufficient for database-backed public discovery. Imports are idempotent and preserve staff-authored content. Neither development startup nor deployment builds import editorial content automatically. `dev`/`start` bootstrap existing local infrastructure and migrations; do not delete the Compose volume to update content.

## Environment and data boundaries

| Configuration | Purpose |
| --- | --- |
| `DATABASE_URL` | Server-side PostgreSQL queries, auth, migrations, seeds and DB integration tests. Runtime content queries are deferred beyond build. |
| `CITYWALK_CONTENT_SOURCE=database` | Shared published city/place/tour repositories. The production default; database failures are not replaced with code fixtures. |
| `CITYWALK_CONTENT_SOURCE=code` | Explicit curated-file mode for offline development/demos. Does not prove database integration. |
| `CITYWALK_CONTENT_SOURCE=auto` | Development-only, logs when falling back to curated content. Rejected in production. |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Better Auth configuration, validated at first auth request. On Vercel, the existing validated deployment/branch hostname fallback can replace an explicit URL. |
| `CITYWALK_MEDIA_STORAGE=s3`, `CITYWALK_MEDIA_S3_*` | Optional for core discovery; required for managed media upload/delivery. Use isolated local/Preview storage, never production credentials for tests. Imported canonical legacy images/audio still use existing approved local files. |
| `GROQ_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Required for the existing AI guide and its rate limits, not for browsing or deterministic walk planning. AI also requires verified knowledge; publication alone does not grant source trust. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Optional paid checkout and webhook verification. Protected purchases/media remain server-authorized. |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST` | Optional analytics; only public analytics settings belong in the browser. |

Public Home, city hub, Explore, Place Detail and walk building work without login. A missing optional public session cannot grant premium access. Account/staff/checkout/private-media requests still use strict authentication and existing authorization. A build succeeding without auth secrets is not proof those runtime features are configured.

Database content supplies published places, coordinates, durations, tags, localizations, editorial stops and approved media metadata. The existing launch configuration keeps Hamburg and Düsseldorf coming soon independently of CMS publication. New database cities still use generic routes. Saved walks remain browser-local (`localStorage`); active trips are tab-local (`sessionStorage`). No account trip persistence backend exists to reconnect. Walking time is an estimate, not live routing; weather, hours and events are not invented.

## Validation

```bash
npm run test:run
npm run lint
npx next typegen
npx tsc --noEmit
npm run build
npm run db:generate
npm run db:migrate
npm run db:verify
npm run cms:test:integration
npm run content:test:integration
git diff --check
```

`next typegen` creates the framework's generated `PageProps`/`LayoutProps` types on a fresh checkout; build also generates these. `db:generate` should report no changes unless schema work is intentional. Run integration suites only against an isolated local/test database: they create temporary test records and exercise publication workflows. The city-content suite also idempotently imports curated Hamburg content, which remains coming soon.

The build downloads the project's existing Google fonts, so outbound font access is needed. `npm run start` serves the production build. Check Home → Lübeck → Explore → Place Detail → Add to my walk → Preview → Start → Finish, plus DE/EN/AR, invalid slugs, and unauthenticated protected actions.

On deployment, configure the actual environment's database/auth/storage/services independently and run committed migrations (`vercel-build` already does this). Provision editorial content explicitly. Local verification does not replace Preview acceptance or live AI/payment/storage checks.
