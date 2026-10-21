# Marketing SaaS local MVP — acceptance and operator handoff

**External paid pilot: NO-GO.** This is a working local account → business → intake → human fact confirmation → Marketing Pack → human edit → export → usage flow. The complete browser proof uses an explicitly labeled deterministic demo, not real model output. No production resource, real email, model request, card charge, deployment or merge to develop/main was performed.

## Run locally

From the implementation worktree:

```sh
npm ci
npm run marketing:db:migrate
npm run marketing:demo
```

The database must already exist at the **dedicated local QA** target: `marketing_mvp_local`, `marketing_qa`, loopback port 55498. During this implementation it lives in the task-owned Docker container `marketing-mvp-qa-20261021`. Existing unrelated Docker containers/databases were left untouched. On a fresh machine, use a separate PostgreSQL container/database; do not replay CITYWALK migrations into this SaaS DB. The older compose scaffold's 55434 default is occupied on this Mac, so do not start it blindly. See the placeholder config in `apps/marketing-saas-api/.env.example`.

Open **http://127.0.0.1:3108**. Register with synthetic data, open your verification URL from the ignored `.qa-mail/*.json` sink, sign in, create an enterprise and import **https://glanz.example**. That URL maps to a synthetic fixture only in explicit demo mode. Select the supported factual assertion, acknowledge review and confirm it. Open Marketing-Packs, set a goal/audience/channel, generate, edit, save, inspect old versions and export. The demo launcher forces real provider calls off, even if an ambient API key exists. Its auth secret is generated in memory; restarting without a stable operator-supplied `MARKETING_AUTH_SECRET` invalidates existing sessions/tokens but preserves business data.

The separate ignored `.env.marketing.local` file in the original website-intake worktree contains the key created through the secure OpenAI setup flow. It is **not** auto-loaded into demo mode, copied elsewhere or committed. Do not expose it via `VITE_`/`NEXT_PUBLIC_`. Before an owner-authorized real run, configure `MARKETING_AI_ENABLED=true`, the chosen `MARKETING_OPENAI_MODEL` and conservative, current EUR input/output rates; real-mode API startup uses the explicit variables in the API example. The key alone never enables calls. Real provider smoke/quality/cost acceptance remains pending; do not infer it from the mocked SDK tests.

## Architecture and trust

The independent Vite client calls a loopback Node API through `/api`. Better Auth owns a distinct verified identity/cookie boundary. Organization membership and owner/editor/viewer access are server-derived. PostgreSQL holds append-only brand/content versions and confirmation/export audit; Drizzle defines operational read models while explicit parameterized SQL handles row locks, migrations and quota transactions. CITYWALK identity, staff scope, DB and production application flows are excluded.

Website ingestion validates public HTTPS URLs, all DNS answers and the actual socket destination. It pins IP lookup while verifying TLS against the original host. Same-origin redirects are rechecked, robots restrictions respected, resources bounded, scripts/assets never executed/downloaded. Evidence is bounded plain text. Imported claims are proposed until human confirmation. Manual brief corrections reset confirmations and preserve history. The importer is now reachable only through the verified local SaaS project authorization boundary.

The real OpenAI adapter uses Responses structured output, no tools/provider storage/SDK retries and a 20-second timeout. To make unsupported business claims impossible through free-form model prose, the model selects approved fact IDs plus bounded editorial/plan/channel/time choices; the server composes posts using exact confirmed statements. Unconfirmed claims are excluded. This deliberately constrains creative range and needs German customer usefulness evaluation. Human edits are clearly marked and never automatically declared fact-checked. Content confirmation/export is not publishing consent; there is no social-publishing adapter.

## Quotas and cost behavior

Starter hypothesis: **€79/month ex VAT, 4 attempts**. Growth: **€149/month ex VAT, 12 attempts**. These are unvalidated hypotheses, not an offer or active subscription. No Stripe integration is enabled; initial invoicing requires an approved manual process.

Each call first reserves one attempt and conservative cost under database locks. Per-user 6/minute and per-organization 12/minute admission windows, two simultaneous jobs per tenant, a €0.75 maximum reservation per job, €5/€12 tenant monthly budgets and a fixed €10 shared monthly ceiling bound local real-provider exposure. An explicit enable flag is still required. Months use UTC; suggested posting times use Europe/Berlin. Retries create new attempts only after deliberate action; identical idempotency keys reuse the existing job, including an in-progress/failed job. Unknown provider costs retain the full reservation and quota attempt until operator reconciliation; crashed/running jobs are not silently retried/refunded. A reported cost above its reservation blocks further jobs globally for that month. Manual editing/export remains free of generation quota.

Provider/model, operation, tenant/project/user, prompt/context revision, reservation, token usage, configured-rate cost estimate, retry count, status and monthly entitlement snapshot are persisted. Configured EUR rates are conservative estimates, not provider invoices. No measured live per-pack unit cost is available yet.

## Executed evidence

- Complete Chrome customer journey: `MARKETING_SAAS_COMPLETE_DEMO_JOURNEY_PASS`. Includes signup/verification/login, synthetic website → proposed evidence, selected human confirmation, pack, edit, old-version preservation, Markdown download, clipboard copy, a second generation and decrement to 2/4 remaining.
- 1440/768/390/375 viewport checks: no horizontal overflow or page errors; all rendered form fields have labels. Actual mobile/desktop screenshots under `screenshots/` were visually inspected. This is not screen-reader certification or native iOS/Android acceptance; those native surfaces are not applicable.
- Intake/provider targeted suite: **62 passed** (the original ten intake tests remain byte-identical).
- Real isolated PostgreSQL auth/tenant/pack/quota integration: **9 passed** across two files; includes cross-tenant generate/edit/export denial, verified login/reset/logout, stale/racing edits, idempotency, atomic limits, failed reservations and unsupported provider output.
- Full repository unit suite: **1,516 passed / 142 skipped**. Skipped integration tests are not counted as passes; the separate 9-test command above is the execution evidence.
- Standalone API/UI typechecks and Vite production build passed. Root lint: **0 errors / 8 existing warnings**. Final root `npm run build` (Turbopack), TypeScript and `db:generate` passed after the separate gate repair; initial failures and the repair are recorded in `build-gate.md`.
- Four isolated additive SaaS migrations applied and replayed; read-only verifier reported `MARKETING_SAAS_DB_VERIFY_OK`. It checks SQL checksums, Core context schemas, revision pointers and quota/global ledgers. It correctly caught a synthetic cost-cap fixture that had left its temporary mutation behind; fixture cleanup now restores the ledger in `finally`.
- `synthetic-pack.md` is an actual downloaded, human-edited demo export, with source references and demo disclosure.

Reproduce:
```sh
npm run test:run -- src/lib/marketing/websiteIntake apps/marketing-saas-api/src/pack.provider.test.ts
MARKETING_TEST_DATABASE_URL='<dedicated local marketing DB URL>' npm run marketing:test:integration
npm --prefix apps/marketing-saas-api run typecheck
npm --prefix apps/marketing-saas run typecheck
npm --prefix apps/marketing-saas run build
npm run test:run
npm run lint
npm run marketing:db:migrate
npm run marketing:db:verify
MARKETING_FULL_JOURNEY=true MARKETING_PLAYWRIGHT_MODULE='<installed Playwright index.mjs>' node scripts/marketing-saas-pilot-smoke.mjs
```

## Before a controlled external paid pilot

- [ ] Owner approves operator identity, Impressum, Datenschutz, Terms, B2B/VAT/payment disclosures, withdrawal obligations if applicable and manual invoicing. Legal readiness is **not approved** by this work.
- [ ] Extract the independent SaaS application/Core into its own repository/release boundary as required by the existing extraction architecture before paying-customer onboarding.
- [ ] Replace deliberate local-only guards with a reviewed release configuration: dedicated non-CITYWALK DB, TLS, HTTPS origins, secure cookies, restricted CORS/CSRF, production secrets, least-privilege DB access and isolated object/storage resources if introduced. No remote release configuration was enabled here.
- [ ] Configure approved verification/recovery email sender, domain authentication, delivery/abuse limits and privacy-safe logs. No real-email delivery is implemented or tested.
- [ ] Explicitly authorize a bounded live-model evaluation, choose an accessible supported model, validate current rates/FX and record real token/cost observations. Check 20–100 representative German SME packs for usefulness and factual quality; reconcile provider invoices. Test global stop-loss and operator handling of uncertain/crashed jobs.
- [ ] Resolve applicable remaining dependency advisories described in `security-review.md`; perform independent auth/tenant/SSRF/prompt-injection review, external deployment/Preview acceptance on the exact head and restore/retention/erasure acceptance. Local mock DNS/transport tests are not independent network penetration testing.
- [ ] Publish an approved retention schedule and implement its operator/customer deletion workflows. Suggested review candidates, **not approved policy**: raw HTML never stored; source snippets/current and prior contexts retained only for project purpose; expired local verification/reset sink files removed after 48h; transient rate windows pruned after 48h; usage/audit retention and pseudonymization decided with legal/accounting obligations. This repository does not yet automate customer erasure or these retention jobs.
- [ ] Back up encrypted data to an approved location; execute a restore into a separate non-production DB and validate counts/checksums. Review access, incident response, abuse handling and account recovery. No operational backup SLA or external restore drill is claimed.
- [x] Dedicated disposable-PostgreSQL migration/integration/browser workflow added in `.github/workflows/marketing-saas.yml`, with real AI disabled and no production secrets. Its remote result on the final pushed head must still be checked; adding the workflow is not a CI pass.
- [ ] Conduct 10–15 customer discovery conversations and validate willingness to pay. Engineering tests do not validate the €79/€149 hypotheses.

## Unit economics worksheet (not observed live costs)

| Hypothesis | Starter | Growth |
| --- | ---: | ---: |
| Monthly sales ex VAT | €79 | €149 |
| Included generation attempts | 4 | 12 |
| Sales per included attempt | €19.75 | €12.42 |
| Maximum reservation per attempt | €0.75 | €0.75 |
| Maximum at nominal full attempt use | €3 | €9 |
| Additional tenant monthly hard cost ceiling | €5 | €12 |

These bounds assume correct conservative model rates and the token limits, not a vendor quotation. Shared infrastructure, email, taxes, legal/accounting, support, acquisition, refunds and payment processing are unmeasured/excluded. The €10 global ceiling can halt all tenants before their nominal pack count. Demo cost is zero and is not evidence of real model cost or commercial margin. Real invoices and measured P50/P90/P99 costs are required before publishing economics claims.
