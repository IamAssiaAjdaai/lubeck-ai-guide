## Database foundation

CITYWALK uses PostgreSQL with Drizzle ORM for its planned server-side data layer.

### Current status

The database schema, migrations, seed mapping, and server-side database client are implemented.

The frontend still uses the existing TypeScript dataset. No production or local PostgreSQL instance is required yet.

### Generate migrations

```bash
npm run db:generate
```

Drizzle reads the schema from:

```text
src/db/schema.ts
```

and writes SQL migrations to:

```text
drizzle/
```

### Database environment

Database connections use the server-only environment variable:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/citywalk
```

Never expose database credentials through a `NEXT_PUBLIC_*` variable.

### Local PostgreSQL

Local PostgreSQL and Docker Compose setup are intentionally postponed.

When Docker is available, the remaining steps are:

1. Start PostgreSQL.
2. Apply the generated migration.
3. Run the Lübeck seed.
4. Verify one city and exactly 20 places.