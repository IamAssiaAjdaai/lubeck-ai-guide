# Independent Marketing SaaS — local closed pilot

The actual application uses independent Better Auth, tenant-scoped projects and versioned business contexts. D2 is the public landing and Concept A the workspace. Public registration, external email, billing and live AI remain disabled. Synthetic local data only.

## Local configuration

Use the existing [configuration contract](src/config.ts) and [canonical local runner](../../scripts/marketing-consolidate-local.mjs). There is no committed environment template or fixed QA password. Supply these variables privately in the process environment:

- `MARKETING_DATABASE_URL`: dedicated `marketing_*` PostgreSQL database on `127.0.0.1`, a verified free non-default port, with its own local credentials. Never use CITYWALK databases or root migrations.
- `MARKETING_AUTH_SECRET`: a separate random secret of at least 32 characters, never committed or printed.
- `MARKETING_ORIGIN`: loopback UI origin, for example `http://127.0.0.1:3208`.
- `MARKETING_API_PORT`: a separate free loopback port, for example `3209`.
- `MARKETING_MAIL_DIRECTORY`: private local directory for verification/reset links. Files contain sensitive test tokens and must stay outside screenshots, logs and distributable artifacts.
- `MARKETING_LOCAL_REGISTRATION_ENABLED=false`: keep signup closed. Synthetic registration is enabled only inside isolated acceptance setup, never as public access.

The canonical runner forces mock-only gates and strips provider-key variables. It does not create a PostgreSQL service. After supplying the private configuration, run from the repository root:

```sh
npm ci
node scripts/marketing-consolidate-local.mjs migrate
node scripts/marketing-consolidate-local.mjs verify
node scripts/marketing-consolidate-local.mjs start
```

Open the configured origin. Use an existing verified synthetic test account. Stop only the runner you started with Ctrl+C; retain databases and volumes. Migrations are explicit, additive, checksum-verified and replay-safe. Startup does not migrate the database. Never run root CITYWALK migration commands for this application.

## Canonical offline acceptance

[CI workflow](../../.github/workflows/marketing-saas.yml) executes [the canonical acceptance runner](../../scripts/marketing-consolidate-ci.mjs): Marketing units/security, isolated PostgreSQL integrations, typechecks, lint, build, authenticated Pack/Creative/review/export, closed signup and the unauthenticated D2 demo. [CI readiness evidence](../../docs/qa/marketing-saas/consolidate-04/CI-READINESS.md) records its scope and limitations; historical counts describe their recorded revision.

For local repetition, use a **disposable** `marketing_*` database on a non-default loopback port and a database user allowed to create a separate synthetic journey database. Set `MARKETING_DATABASE_URL`, `MARKETING_ORIGIN` and `MARKETING_API_PORT` to isolated CI-owned resources, then:

```sh
node scripts/marketing-consolidate-ci.mjs
```

Local Chrome is the default; CI installs bundled Chromium and sets `MARKETING_BROWSER_CHANNEL=bundled`. Evidence defaults to private temporary storage. The workflow uploads only synthetic screenshots and aggregate summary; mail, credentials and session state are excluded. Tests preserve uncertain cost holds and honor authentication rate limits. Local setup briefly enables synthetic registration, then restarts with signup closed. No production or external provider calls are authorized.

Service city is optional owner-declared context stored through the existing `markets` schema and revision/tenant authorization. It is not automatically a confirmed location claim. Human fact confirmation, exact-version editorial review and manual publication remain separate controls. Production cookies, legal/privacy approvals, external mail and live-provider authorization remain separate release gates.
