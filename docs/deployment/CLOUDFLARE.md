# Cloudflare Workers deployment

CITYWALK keeps the existing Next.js development path and adds a parallel Cloudflare Workers build through vinext.

## Local verification

```bash
npm ci
npm run build:vinext
```

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

Do not deploy until the Cloudflare production environment has the same required server-only configuration as the current production environment.

At minimum, configure the values CITYWALK actually uses, including:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL=https://<production-domain>`
- enabled Google / Apple auth credentials
- S3-compatible media credentials
- Upstash Redis credentials when Ask CITYWALK rate limiting is enabled
- Stripe secrets when web checkout is enabled
- Groq / other AI provider keys when Ask CITYWALK is enabled
- native Apple / Google billing verification credentials when those flows are enabled

Never commit these values.

### Important portability rule

Outside Vercel, always set `BETTER_AUTH_URL` explicitly. Auth and checkout code otherwise have Vercel-specific URL fallbacks.

## Database migrations

The old Vercel production build uses:

```bash
npm run db:migrate && next build
```

The vinext build intentionally does **not** migrate the database. Run migrations as an explicit release step before deploying a production version that requires them:

```bash
npm run db:migrate
npm run build:vinext
```

This keeps build retries from silently mutating production data.

## Deployment

Deployment is manual by design. Automatic Git-triggered Vercel deployments remain disabled.

After the Cloudflare account, project, production secrets, custom domain, and runtime smoke tests are ready:

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
6. Ask CITYWALK and Upstash rate limits
7. S3 image/audio delivery
8. Stripe checkout and webhook verification
9. Apple native-purchase sandbox verification
10. Google Play test-purchase verification and push authorization
11. admin core content/media flows

The admin manifest path importer still assumes a host filesystem and should not be treated as a production Workers workflow until separately replaced by an upload-based import.
