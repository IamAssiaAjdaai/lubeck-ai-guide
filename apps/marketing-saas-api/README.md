# Independent Marketing SaaS API — Phase 1 local isolation

**Status:** isolated Docker PostgreSQL config added. **No Better Auth server, migration, real session, verification-email delivery or organization/project API is implemented yet.** Parent [#384](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/384); upstream draft UI [#385](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/385) stacked on [#383](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/383). These must not be merged or exposed until CI/security review.

## Local database safety boundary

Unlike CITYWALK's regular `docker-compose.yml`, this project's standalone `compose.qa.yml`:

- uses a unique Compose project `marketing-saas-qa`
- binds PostgreSQL **only** to `127.0.0.1:55433`
- creates `marketing_saas_qa` under a dedicated `marketing_qa` local user
- stores test data in independent volume `marketing_saas_qa_pgdata`
- contains **obvious dummy local-only** credentials and must never be deployed
- does not read or modify CITYWALK env, development databases, migrations or auth tables.

### Inspect, then run (from root of the dedicated SaaS backend worktree)

```bash
docker compose -f apps/marketing-saas-api/compose.qa.yml config
docker compose -f apps/marketing-saas-api/compose.qa.yml up -d --wait
docker compose -f apps/marketing-saas-api/compose.qa.yml exec -T postgres \
  psql -U marketing_qa -d marketing_saas_qa -tAc "SELECT current_database(), current_user;"
```

Expect `marketing_saas_qa|marketing_qa` (spacing can vary). Future **SaaS-only** connection string (for a future server process, not CITYWALK):

```text
postgresql://marketing_qa:local_marketing_qa_only@127.0.0.1:55433/marketing_saas_qa
```

To stop the isolated test DB while keeping its contents:

```bash
docker compose -f apps/marketing-saas-api/compose.qa.yml stop
```

No need to remove Docker volumes. **Do not run the root `npm run db:migrate`**, root `drizzle.config.ts`, root `npm run dev`, or reuse any CITYWALK `DATABASE_URL` for the SaaS backend. No schema or migration has been created on this branch yet.

## Upcoming implementation gates

1. Use the already installed, existing Better Auth library **in an independent SaaS API entrypoint** with its own baseURL, dedicated database and host-only synthetic dev secrets. Separate Vite origin will get an explicitly limited localhost-only same-origin development proxy. Do not import CITYWALK `createCitywalkAuth`.
2. Generate/review Better Auth `user/session/account/verification` schema and migrations **only for the SaaS DB**, with explicit verification-email requirement, 12-char minimum password enforced server-side, email-reset flows, safe cookies, CSRF and throttling. Prefer local email sink until sender approval; never share CITYWALK's Resend keys.
3. Organization owner/editor/viewer memberships and project access checks must derive a principal from the verified session; no client-provided tenant/reviewer IDs may confer access.
4. Test two separate QA users and organizations: unauthorized cross-tenant read/write/confirm denied, unverified login/workspace denied, stale context revision conflicts, session/logout revocation and replayed email tokens denied.
5. Only then wire React `/auth` to the server, replace pretend validation copy with real provider statuses, and persist brand contexts using `@marketing/core`. Real human confirmation remains separate from content editorial approval and publishing authorization.

**No production migrations, external signup, provider calls, deployed cloud resources or CI bypass authorized.**
