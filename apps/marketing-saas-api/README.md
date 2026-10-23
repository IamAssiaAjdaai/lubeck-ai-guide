# Independent Marketing SaaS — local pilot backend

Working local Better Auth + tenant/project persistence, isolated from CITYWALK. See [acceptance evidence](../../docs/qa/marketing-saas/auth-persistence.md). Real outbound email is deliberately unavailable; verification/reset links go to the ignored `.qa-mail` sink. Synthetic data only. No external paid-pilot readiness is claimed.

From repository root, create a **dedicated** disposable PostgreSQL database, then export the values in this folder's `.env.example` (placeholders must be replaced). Never reuse CITYWALK DATABASE_URL or its migrations. The default test container/port used during implementation is `marketing-mvp-qa-20261021`, loopback 55498, database `marketing_mvp_local`; this is distinct from the older draft compose port 55434, which was occupied by an unrelated project.

```
npm ci
npm --prefix apps/marketing-saas-api run db:migrate
npm --prefix apps/marketing-saas-api run dev
```

In another terminal:
```
npm --prefix apps/marketing-saas run dev
```

Open http://127.0.0.1:3108/auth. New accounts require email verification; open the link in the mode-0600 JSON file in the configured local mail directory. Do not commit these files or expose a mailbox endpoint. `.env.marketing.local` is ignored and separate from CITYWALK configuration. Migrations are explicit, checksum-verified, additive and transaction-safe; run twice to verify replay. Server startup never mutates schemas. A failed migration rolls back. Roll back application code while retaining the additive DB schema/history; no destructive rollback script.

Test with MARKETING_TEST_DATABASE_URL pointing to a dedicated synthetic database already migrated:
```
npm run test:run -- apps/marketing-saas-api/src/auth.integration.test.ts
npm --prefix apps/marketing-saas-api run typecheck
npm --prefix apps/marketing-saas run typecheck
npm --prefix apps/marketing-saas run build
```

Browser QA requires Playwright/Chrome. Set MARKETING_PLAYWRIGHT_MODULE to the absolute installed Playwright `index.mjs` if it is not installed in the root. Run `node scripts/marketing-saas-pilot-smoke.mjs`. No provider requests, real emails, billing, production operations or deployments are performed by these tests.
