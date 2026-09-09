This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, configure `.env.local` as described below, then run the development server:

```bash
npm run dev
```

The local bootstrap checks Docker Engine, starts Docker Desktop automatically
on Windows when necessary, waits for PostgreSQL to become healthy, and applies
existing migrations before Next.js starts. It preserves the Compose volume and
does not seed or reset data. On non-Windows systems, start Docker manually.

`npm run start` performs the same local infrastructure bootstrap before serving
an existing production build. Use `npm run db:up` or `npm run db:down` when you
only need to start or stop the local Compose services.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Database foundation

CITYWALK uses PostgreSQL with Drizzle ORM for its planned server-side data layer.

### Current status

The database schema, migration, seed mapping, server-side client, and local
runtime verification workflow are implemented.

The frontend continues to use the canonical TypeScript dataset. PostgreSQL is
only used by the backend foundation in this phase.

### Local PostgreSQL

The Compose service uses PostgreSQL 16 Alpine with local-development-only
credentials and a persistent named volume.

`npm run dev`, `npm run start`, and `npm run db:up` start this service with
`docker compose up -d --wait`.

Copy `.env.example` to `.env.local` (PowerShell):

```powershell
Copy-Item .env.example .env.local
```

The local server-only connection is:

```env
DATABASE_URL=postgresql://citywalk:citywalk@localhost:5432/citywalk
```

Never expose database credentials through a `NEXT_PUBLIC_*` variable or commit
`.env.local`.

Wait until `docker compose ps` reports PostgreSQL as healthy, then run:

```bash
npm run db:migrate
npm run db:seed
npm run db:verify
```

Expected verification:

```text
Verified database catalog: 1 city, 25 places.
- lubeck: 25 places (17 See, 5 Eat, 3 Fun; 5 curated Hidden Gems)
```

The seed is deterministic. Verify idempotency by repeating:

```bash
npm run db:seed
npm run db:verify
```

The seed-only result must remain one Lübeck city and 25 places. The verifier is
catalog-aware: after additional cities are provisioned it reports every city
and validates generic identity, coordinate, category, duration, and
city/place-slug invariants while retaining the strict canonical Lübeck check.

### Database commands

Generate a migration after an intentional schema change:

```bash
npm run db:generate
```

Drizzle reads the schema from:

```text
src/db/schema.ts
src/db/authSchema.ts
```

and writes SQL migrations to:

```text
drizzle/
```

Apply existing migrations to the configured database:

```bash
npm run db:migrate
```

Seed from the canonical `lubeckPlaces` collection:

```bash
npm run db:seed
```

Validate the real database against all canonical slugs, categories,
coordinates, tags, statuses, and catalog counts:

```bash
npm run db:verify
```

### Reset local development data

To delete only the Compose-managed local development database volume and start
fresh:

```bash
docker compose down -v
docker compose up -d
npm run db:migrate
npm run db:seed
npm run db:verify
```

`docker compose down -v` permanently deletes the local development database
data. It is not a production reset command.

## Admin authentication foundation

The internal `/admin` console uses Better Auth for email/password identity,
database sessions, and secure cookies. CITYWALK authorization is separate:
an authenticated identity also needs an active row in `staff_memberships`, and
non-global staff access is constrained by `staff_city_access`.

Configure these server-only values in `.env.local`:

```env
BETTER_AUTH_SECRET=<unique-random-secret-at-least-32-characters>
BETTER_AUTH_URL=http://localhost:3000
```

There is no public staff signup page and the public email signup endpoint is
disabled. Create the first local super admin only from a trusted terminal with
database access. Keep the password out of command arguments and shell history:

```powershell
$env:CITYWALK_ADMIN_EMAIL = "admin@example.com"
$env:CITYWALK_ADMIN_NAME = "Local Admin"
$env:CITYWALK_ADMIN_PASSWORD = Read-Host "Temporary password"
npm run admin:create-super
Remove-Item Env:CITYWALK_ADMIN_PASSWORD
```

The bootstrap command refuses to silently elevate an existing traveler or a
non-super staff identity. It is separate from `npm run db:seed`; catalog seeds
never create staff accounts.

### Vercel deployment

Vercel Preview deployments require these server-only environment variables:

```env
DATABASE_URL=<hosted-postgresql-connection-string>
BETTER_AUTH_SECRET=<unique-random-secret-at-least-32-characters>
```

`BETTER_AUTH_URL` may be omitted for Preview deployments. When it is absent,
the server uses Better Auth's dynamic base URL support to permit only the exact
`VERCEL_URL` and `VERCEL_BRANCH_URL` hostnames supplied by Vercel. This supports
both the immutable deployment URL and stable branch alias URL over HTTPS without
broad wildcard origin trust. An explicitly configured `BETTER_AUTH_URL` always
takes precedence.

Production requires the same database URL and secret plus the canonical public
application URL:

```env
DATABASE_URL=<hosted-postgresql-connection-string>
BETTER_AUTH_SECRET=<unique-random-secret-at-least-32-characters>
BETTER_AUTH_URL=https://<canonical-production-domain>
```

Use the canonical production domain instead of a deployment-specific Vercel
hostname. Vercel runs `npm run vercel-build`, which applies committed Drizzle
migrations before the normal Next.js production build. It does not generate
migrations, seed data, or reset the database.

## CMS content management

Authorized staff manage cities, places, explicitly authored localizations,
normalized tags, and curated editorial tours under `/admin`. Every mutation is
validated and authorized on the server, constrained by the CMS-01 staff city
scope, and records its authenticated actor. Publication is deliberately
separate from editing: drafts are admin-only, publishers can move valid content
from draft to published and from published to archived, and only safe drafts
can be permanently deleted.

The PostgreSQL content model is additive. The legacy place `tags` array remains
for rollback compatibility while public database reads prefer normalized
`content_tags` and `place_content_tags`. Curated database tours are separate
from the deterministic personalized Tour Builder.

### Public content source

Set the server-only `CITYWALK_CONTENT_SOURCE` variable to control the migration:

```env
CITYWALK_CONTENT_SOURCE=code
```

- `code` uses the current canonical TypeScript snapshot and is the safe default.
- `database` requires a complete, internally consistent published database
  snapshot and fails clearly when it is missing.
- `auto` prefers a valid published database snapshot and otherwise falls back
  wholesale to code. It never merges a partial database snapshot into the
  canonical one.

The public read API is `GET /api/content/cities/:citySlug?locale=en`. It exposes
public DTOs only, includes requested/resolved locale metadata for honest
fallback handling, and never exposes drafts, actor IDs, staff data, or RAG
metadata. Publishing CMS text does not make that text verified RAG evidence;
the source registry, verified knowledge chunks, and approved audio registry
remain independent trust systems.

### Explicit Lübeck import

After applying migrations, import the canonical Lübeck bootstrap snapshot with:

```bash
npm run cms:import-lubeck
```

The transaction imports one city, 25 places, normalized tags, the five curated
Hidden Gems, explicitly authored place localizations, and the curated historic
five-stop editorial tour. It does not import generated personalized tours or
invent fallback translation rows. Repeating the command does not create
duplicates. Once a row has staff-authored localizations or an authenticated
editor actor, the importer leaves it unchanged instead of overwriting editorial
work.

Never add the content import to `vercel-build`. Deployments run migrations only;
the import is an explicit bootstrap/migration operation. For a Preview database,
apply the migration, run the import once explicitly, verify the public snapshot,
then test draft invisibility, publishing, and archiving without using the
production database.

Run the real PostgreSQL CRUD and public-visibility checks with:

```bash
npm run cms:test:integration
```

The integration test uses only exact `cms02-integration-*` records and removes
those records afterward. It does not modify staff identities or canonical
Lübeck content.

## CMS media library

CMS-03 stores immutable media identity, lifecycle metadata, and city/place/tour
attachments in PostgreSQL while binary files stay in S3-compatible object
storage. Large uploads go directly from the authenticated admin browser to a
short-lived presigned PUT URL; the server then verifies the stored size,
content type, and file signature before the asset enters `pending_review`.
Only `approved`, non-archived attachments are returned by the public resolver.

Configure these server-only variables for upload and preview operations:

```env
CITYWALK_MEDIA_STORAGE=s3
CITYWALK_MEDIA_S3_ENDPOINT=https://<s3-compatible-endpoint>
CITYWALK_MEDIA_S3_REGION=<region-or-auto>
CITYWALK_MEDIA_S3_BUCKET=<environment-specific-private-bucket>
CITYWALK_MEDIA_S3_ACCESS_KEY_ID=<server-only-access-key>
CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY=<server-only-secret-key>
```

None of these values may use a `NEXT_PUBLIC_` prefix. Missing storage variables
fail only media operations; public CITYWALK pages and database-independent
builds remain available. The bucket stays private: approved uploaded media is
streamed through `/api/media/[assetKey]` only after server-side publication and
attachment checks. Object keys, bucket details, and credentials are not exposed
by the public content API. Preview must use a dedicated non-production bucket
or separately permissioned prefix. `vercel-build` still runs only migrations
and the Next.js build; it never uploads, seeds, or imports media.

Every upload belongs to one authorized city. Assets can be reused only within
that city. Editors with `media:manage` may upload and prepare non-public media
attachments. Changing approved media on published content additionally requires
`publishing:publish`; approving an asset requires `publishing:publish`, while
rejecting it requires `publishing:review`. An actively referenced approved asset
must be safely detached or replaced before it can become non-public. Media
management therefore does not grant content publication powers.

Uploaded audio may additionally be classified as `premium`. Existing assets
default to `public`. Premium audio never appears in public CMS snapshots or the
public `/api/media` delivery route; it is streamed only through the separate
authenticated commerce-media endpoint after PostgreSQL confirms an active city
entitlement. The legacy files under `/public/audio` remain free.

City Pass authorization is city-scoped (`scopeType=city`, `scopeKey=citySlug`)
through reusable access, offer, checkout-return, private-media, paywall, AI
allowance, and analytics boundaries. Lübeck is the first structured
configuration; adding a future city does not require a second authorization
implementation.

The Lübeck Digital Guide Pass catalog is provisioned only by the explicit
`npm run commerce:provision-lubeck-pass` operational command documented in
`scripts/README.md`. It is inactive by default, is never seeded or provisioned
during a build, and requires an explicit provider Price ID and amount before it
can be activated. The entitlement grant is `city:lubeck` for three days (72
hours from the verified webhook grant timestamp). Its recommended launch price
is €6.99, but that recommendation never creates or activates a database or
Stripe price automatically.

The allowlist and limits are:

- JPEG, PNG, WebP, and AVIF images up to 15 MB; SVG is rejected.
- MP3, M4A/MP4 audio, and WAV up to 50 MB; an exact CITYWALK locale is required.
- MP4 and WebM video up to 250 MB.
- PDF documents up to 25 MB.
- Structured YouTube or Vimeo links; raw iframe HTML is rejected.

Checksums are persisted when object storage supplies SHA-256 metadata. CMS-03
does not download and hash complete large objects during finalization. Replacing
media creates a new UUID-backed key; existing bytes are never overwritten.
Detaching does not delete reusable objects, and attached assets cannot be
archived. Permanent object deletion is an explicit action available only after
an asset is archived and unreferenced; database state changes only after storage
confirms deletion. A server-only cleanup service can remove stale incomplete
uploads under the same ordering rule. This ticket installs no cleanup cron.

Existing canonical images and the approved CW-08 audio registry remain the
fallback. Unapproved CMS media never suppresses legacy media, and audio resolves
only for the exact requested locale. Media approval does not grant RAG/source
provenance trust.

Run the focused PostgreSQL lifecycle test after applying migrations:

```bash
npm run media:test:integration
```
