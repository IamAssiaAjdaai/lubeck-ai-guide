This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

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

```bash
docker compose up -d
```

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
Verified Lübeck: 1 city, 25 places (17 See, 5 Eat, 3 Fun; 5 curated Hidden Gems)
```

The seed is deterministic. Verify idempotency by repeating:

```bash
npm run db:seed
npm run db:verify
```

The result must remain one Lübeck city and 25 places.

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
the server derives the Better Auth base URL from Vercel's deployment-specific
`VERCEL_URL` hostname using HTTPS. An explicitly configured `BETTER_AUTH_URL`
always takes precedence.

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
