# Cloudflare Workers deployment

CITYWALK deploys the public web/API runtime to Cloudflare Workers through vinext while keeping the normal Next.js development path available locally.

For the legal/landing launch audit, owner configuration, exact artifact provenance, API-preserving release and rollback gates, follow [Legal launch readiness](./LEGAL-LAUNCH-READINESS.md). Production operations remain separately authorized.

## Local verification

```bash
npm ci
npm run build:vinext
npm run check:cloudflare-build
npm run check:cloudflare-bindings
npm run typecheck:cloudflare
```

To validate the exact deployment path without uploading a Worker or making Cloudflare API changes:

```bash
npm run deploy:vinext:dry-run
```

The dry run uses the same vinext Cloudflare deploy command as production with `--dry-run`. It is safe to run before authentication and is also enforced by the Cloudflare validation workflow.

To preview the Worker build locally:

```bash
npm run start:vinext
```

The normal Next.js workflow remains available:

```bash
npm run dev
npm run build
```

## Production release prerequisites

Do not deploy until the Cloudflare production environment has the required server-only configuration.

At minimum, configure the values CITYWALK actually uses, including:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL=https://<production-domain>`
- enabled Google / Apple auth credentials
- `RESEND_API_KEY` and a verified-domain `CITYWALK_EMAIL_FROM` for account verification/password-reset delivery
- S3-compatible media credentials
- Stripe secrets when web checkout is enabled
- Groq / other AI provider keys when Ask CITYWALK is enabled
- native Apple / Google billing verification credentials when those flows are enabled

Never commit these values.

### Canonical origin rule

Every deployed server runtime must set `BETTER_AUTH_URL` explicitly. Auth and checkout do not derive their public origin from hosting-provider variables.

For production, CITYWALK uses one canonical HTTPS web/API origin. Configure that same origin as `BETTER_AUTH_URL` on the Worker and as `EXPO_PUBLIC_CITYWALK_API_ORIGIN` for mobile production builds.

Preview and store-beta mobile builds must receive `EXPO_PUBLIC_CITYWALK_API_ORIGIN` from the EAS Preview environment. It must be an explicitly approved public HTTPS Cloudflare preview/temporary Worker origin backed by isolated preview data. Do not commit a temporary preview hostname into `mobile/eas.json`, and never point preview builds at production data by default.

## Database migrations

The vinext build intentionally does **not** migrate the database. Run migrations as an explicit release step before deploying a production version that requires them:

```bash
npm run db:migrate
npm run build:vinext
```

This keeps build retries from silently mutating production data.

## Deployment

Deployment is manual by design. Git pushes do not constitute a production release.

After the Cloudflare account, Worker, production secrets, custom domain, and runtime smoke tests are ready:

```bash
npm run build:vinext
npm run deploy:vinext
```

Do not run `deploy:vinext` for ordinary PRs.

## Initial Cloudflare configuration

The initial target is deliberately minimal:

- Node compatibility enabled
- static asset binding only
- no Cloudflare KV data cache
- no Cloudflare CDN response-store add-on
- no Cloudflare Images optimizer
- no prerender cache layer

This minimizes migration risk and keeps optional paid platform features out of the first release.

## Required smoke tests before switching production traffic

Verify on a Cloudflare preview / temporary hostname before moving the real domain:

1. public city and place pages
2. PostgreSQL reads and writes
3. email/password auth
4. Sign in with Apple
5. Sign in with Google
6. Ask CITYWALK and PostgreSQL-backed rate limits
7. S3 image/audio delivery
8. Stripe checkout and webhook verification
9. Apple native-purchase sandbox verification
10. Google Play test-purchase verification and push authorization
11. admin core content/media flows

The legacy content-image API no longer reads from the host filesystem or requires a native image-processing dependency; it redirects approved legacy assets to the static asset tree. The remaining manifest path loader uses `node:fs`, but it is currently consumed by the operator CLI import script rather than the traveler runtime. Keep that CLI outside the Worker deployment path unless it is later replaced by an upload-based import.
