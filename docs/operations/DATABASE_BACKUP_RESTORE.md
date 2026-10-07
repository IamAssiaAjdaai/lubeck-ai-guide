# CITYWALK PostgreSQL backup and restore policy

Issue: #110 OBS-01

This is the operational policy and local tooling for PostgreSQL recovery. It does not activate a production backup provider or modify production data.

## Launch policy

Before CITYWALK launch, production PostgreSQL must have:

- automated managed backups at least daily;
- at least 14 days of daily recovery points;
- an additional backup or provider snapshot immediately before every approved production schema migration;
- encrypted storage and access limited to production operators;
- a documented retention/deletion owner;
- a successful restore drill against an isolated non-production database before coordinated launch;
- a restore drill repeated after material database/platform changes and at least quarterly while the product is active.

The portable CLI dump is a second recovery tool, not a replacement for managed-provider backups.

## Create a portable backup

Install PostgreSQL 16-compatible client tools so `pg_dump` and `pg_restore` are available.

Preflight only:

```bash
npm run db:backup -- --dry-run
```

Create a custom-format dump:

```bash
npm run db:backup
```

The command reads `DATABASE_URL` from the normal server environment and writes to `CITYWALK_BACKUP_DIR` (default: `backups/postgres`). Database credentials are passed through libpq environment variables and are never placed in the command arguments.

Each dump gets a sidecar JSON file with creation time, byte size, SHA-256 checksum and an optional non-sensitive release identifier.

Both files are ignored by Git. A dump may contain account, commerce and other personal data: treat it as confidential production data.

## Restore drill — non-production only

Use a dedicated empty or disposable PostgreSQL database. Do not reuse the application `DATABASE_URL`.

Required safety controls:

```bash
export RESTORE_DATABASE_URL='postgresql://.../citywalk_restore'
export CITYWALK_RESTORE_TARGET='non-production'
export CITYWALK_RUNTIME_ENV='test'
```

Validate the archive and safety guards without restoring:

```bash
npm run db:restore -- --file=backups/postgres/<backup>.dump --confirm-non-production --dry-run
```

Run the isolated restore drill:

```bash
npm run db:restore -- --file=backups/postgres/<backup>.dump --confirm-non-production
```

The restore tool:

1. refuses to run without the explicit non-production acknowledgement;
2. refuses to run while `CITYWALK_RUNTIME_ENV=production`;
3. refuses a target identical to `DATABASE_URL`;
4. verifies the sidecar checksum when present;
5. asks `pg_restore --list` to validate the archive;
6. restores with `--clean --if-exists --no-owner --no-privileges --exit-on-error`;
7. runs `npm run db:verify` against the restored database.

A real restore drill is complete only when the operator records the date, backup timestamp, target environment, verification result and any remediation in #110 or the launch checklist.

## Automated isolated restore drill

The repository includes `.github/workflows/database-restore-drill.yml`. It runs against an ephemeral PostgreSQL 16 service only and exercises the real recovery commands end to end:

1. migrate and seed a source test database;
2. verify the source database;
3. run `npm run db:backup` to create a real custom-format dump and checksum metadata;
4. create a separate `citywalk_restore` database;
5. run `npm run db:restore -- --confirm-non-production` against that separate target;
6. rely on the restore command's built-in `db:verify` check;
7. verify that the dump and checksum sidecar are non-empty.

The workflow has no production credentials and never targets a production database. A successful workflow run is valid evidence that the portable backup/restore path works against a safe non-production target. It does not replace managed production backups or provider-level PITR testing.

## Production recovery

Do not run the repository restore command directly against production. Production recovery must be coordinated and should prefer the managed PostgreSQL provider's point-in-time/snapshot recovery path.

For a production incident:

1. stop risky writes or deployment activity;
2. identify the last known good recovery point;
3. preserve current evidence before destructive action;
4. restore to an isolated database first when time permits;
5. verify schema/catalog/account/commerce invariants;
6. approve the production recovery action explicitly;
7. verify `/api/health`, auth, public content and commerce afterward.

## Migration recovery

Before an approved production migration:

1. record the release/commit SHA;
2. verify `/api/health`;
3. create/confirm a fresh provider backup or snapshot;
4. review the generated migration SQL;
5. apply the migration only through the approved production process;
6. verify health and critical smoke tests.

If a migration fails:

- stop further migrations and writes that depend on the new schema;
- capture the migration error without copying secrets or user data into tickets;
- inspect the Drizzle migration state and the actual database schema;
- prefer a reviewed forward-fix migration for schema-only problems;
- never edit already-applied migration history to hide the failure;
- use restore/PITR only for destructive data loss or when a forward repair cannot safely preserve data;
- test the selected recovery on non-production before production when operationally possible.

No production migration or restore is performed by this document or its scripts.
