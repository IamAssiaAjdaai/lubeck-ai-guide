# Cloudflare Workers deployment audit

Date: 2026-10-04  
Branch: `chore/cloudflare-deployment-audit`

## Goal

Assess whether CITYWALK can move its full-stack Next.js production deployment away from Vercel without changing product behavior, primarily to avoid the Vercel Pro base cost.

This audit is intentionally non-destructive. It does **not** change production hosting, production environment variables, or runtime behavior.

## Current deployment state

- Next.js: 16.3.8
- Node target: 22.x
- Full-stack App Router application with route handlers and server-side code
- PostgreSQL via `pg` + Drizzle
- Better Auth with Google and Apple providers
- Stripe checkout + webhooks
- Apple / Google native-purchase verification
- S3-compatible media storage
- Upstash Redis rate limiting
- Server-side image transformation with `sharp`
- Some admin-only filesystem-backed import tooling
- Vercel Git auto-deploys are already disabled in `vercel.json`

## Cloudflare status

Cloudflare currently recommends **vinext** for existing Next.js 16 apps on Workers. A non-destructive migration path exists:

1. `npx vinext check`
2. `npx vinext init`
3. `npm run dev:vinext`
4. `npm run build:vinext`
5. Deploy with `@vinext/cloudflare`

Cloudflare Workers compatibility dates from 2026-08-04 onward enable current Node compatibility by default, including common Node APIs such as `node:net`, `node:path`, `node:fs`, `node:http`, and `node:https`.

## Compatibility matrix

### Green — likely compatible

| Area | Evidence | Action |
| --- | --- | --- |
| Next.js 16 App Router | vinext supports App Router, route handlers, RSC, SSR, server actions | Run vinext compatibility check |
| PostgreSQL | CITYWALK uses `pg@^8.23.0`; Cloudflare documents node-postgres support | Keep DB external; smoke-test connections |
| Drizzle ORM | Uses node-postgres adapter over supported `pg` | Smoke-test migrations and queries |
| Stripe | HTTP API + webhook verification | Smoke-test checkout and webhook signature verification |
| Upstash Redis | HTTP-based SDK | No architecture change expected |
| S3-compatible media | AWS SDK over HTTPS | Smoke-test presigning, reads, writes, ranges |
| Groq / OpenAI clients | HTTPS APIs | Smoke-test guide endpoint |
| Better Auth core | Standard crypto/HTTP/database dependencies | Run auth acceptance suite on Workers |
| Google OAuth | HTTPS + crypto | Smoke-test callback flow |
| Apple web OAuth | `jose` + crypto | Smoke-test callback flow |

### Yellow — requires explicit validation

| Area | Risk | Required test |
| --- | --- | --- |
| Apple App Store server library | Node-heavy dependency and certificate verification | Verify sandbox purchase end-to-end |
| Google Play verification | `google-auth-library` uses Node HTTP/crypto stack | Verify sandbox purchase + push auth |
| `music-metadata` | Parses streams and may exercise Node compatibility edges | Verify uploaded audio duration extraction |
| Better Auth base URL | Current fallback is Vercel-specific | Set `BETTER_AUTH_URL` explicitly on Workers |
| Commerce return URL | Current fallback is Vercel-specific | Set `BETTER_AUTH_URL` explicitly on Workers |
| DB migrations | Vercel currently runs `db:migrate` inside `vercel-build` | Move migrations to an explicit release step |
| Next image handling | vinext image optimization support is partial | Verify every production image path |

### Red — known migration blockers / refactors

#### 1. Native `sharp` runtime dependency

`src/lib/media/imageTransform.server.ts` imports `sharp` and performs runtime transforms.

Cloudflare Workers do not run arbitrary native Node add-ons. This path must be removed or replaced before a full Workers deployment can be considered production-safe.

Options:

- pre-generate legacy variants at build/import time;
- move transformation to Cloudflare Images;
- store transformed variants in object storage;
- temporarily proxy this one operation to a small Node service.

#### 2. Legacy image route reads `public/` through the server filesystem

`src/app/api/content/image/route.ts` uses:

- `node:fs/promises`
- `process.cwd()`
- `public/<path>`
- the `sharp` transformer

Workers now expose a virtual filesystem, but Next static assets are not equivalent to a normal persistent Node project directory at runtime. This route should be converted to an asset/object-storage based implementation.

#### 3. Admin manifest import assumes a host filesystem

`src/lib/admin/content/cityManifestFile.server.ts` accepts a server-side path and reads it with `stat/readFile`.

Workers filesystem semantics are request-local/virtual rather than a persistent host filesystem. This feature should become an upload/text import flow, or remain available only in a separate admin/CLI environment.

## Vercel-specific assumptions to remove for hosting portability

No immediate code change is required if production defines `BETTER_AUTH_URL`, but these fallbacks are hosting-specific:

- `src/lib/auth/env.ts` -> `VERCEL_URL`, `VERCEL_BRANCH_URL`
- `src/lib/commerce/env.server.ts` -> `VERCEL_URL`

Portable production rule:

- always set `BETTER_AUTH_URL=https://<production-domain>`;
- do not rely on Vercel-generated host variables outside Vercel.

## Recommended path

### Phase A — keep current development cost at zero

Keep Vercel Hobby only for deliberate non-commercial development/acceptance previews while automatic Git deployments remain disabled.

Do not re-enable per-commit Vercel previews.

### Phase B — decide production target after one compatibility spike

Do **not** migrate production blindly.

Run a focused Cloudflare spike after resolving the two runtime media blockers:

1. remove runtime `sharp` from the public request path;
2. remove filesystem-backed legacy image delivery;
3. run `npx vinext check`;
4. initialize vinext on this branch only;
5. run a Workers build;
6. smoke-test:
   - homepage / city pages
   - auth: email, Apple, Google
   - PostgreSQL reads/writes
   - Ask CITYWALK + rate limits
   - Stripe checkout + webhook
   - S3 media
   - native Apple/Google purchase verification
   - admin core flows

### Phase C — choose based on effort, not ideology

**Choose Cloudflare Workers** if the compatibility spike passes without invasive refactors.

**Choose a small Node VPS** if native/runtime incompatibilities keep growing. The current application architecture is already a natural fit for a normal Node 22 + Docker environment, so a VPS is the lower-migration-risk fallback.

## Decision from this audit

**Cloudflare is promising but CITYWALK is not drop-in ready today.**

The main blocker is not Next.js, PostgreSQL, Stripe, or auth. It is the runtime media path built around native `sharp` plus host-filesystem assumptions.

Therefore:

- do not pay Vercel Pro just to continue development;
- do not move production to Workers yet;
- first make media delivery host-portable;
- then run the official vinext compatibility/build test;
- if that test is clean, Cloudflare becomes a realistic low-cost production target;
- otherwise deploy the unchanged Node architecture to a small VPS.

## Reference docs

- Cloudflare Next.js / vinext: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- Cloudflare Node.js compatibility: https://developers.cloudflare.com/workers/runtime-apis/nodejs/
- Cloudflare node-postgres / Hyperdrive: https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/node-postgres/
- Cloudflare filesystem semantics: https://developers.cloudflare.com/workers/runtime-apis/nodejs/fs/
