# Isolated Vinext / Cloudflare runtime acceptance — 19 October 2026

**READY for the tested local runtime scope. BLOCKED for public launch. Production remains unchanged.**

Tested branch `codex/public-beta-readiness`, exact commit `c9b9273b8f44743ce25fb2cc6de0c1606bcff6ad` from Draft PR #393. The checkout matched this HEAD and initially contained only the existing untracked `citywalk-preview-review/`. Its files, the committed Sharp 0.35.5 override/lockfile, existing migrations and application source were preserved. This follow-up changes documentation/evidence only; no commit, push, merge, deployment or production configuration change was made.

Public Web: required and tested locally. Mobile Core: shared backend/auth behavior tested locally; iOS and Android device acceptance each **NOT TESTED**. Admin Web: not applicable to this acceptance scope.

## Isolation and method

A tracked-files-only `git archive HEAD` snapshot was extracted under a newly generated system temporary directory. Dependencies were reused through a `node_modules` symlink. Child processes received an explicit environment allowlist, a temporary HOME and synthetic test configuration; repository `.env*`, operator identity and provider credentials were not copied or loaded.

`npm run build:vinext` produced the Worker bundle. `npm run start:vinext -- --host 127.0.0.1 --port 3187 --strictPort` served that bundle through Vite preview and local workerd. This is Vinext/Cloudflare-compatible execution, distinct from the earlier Next.js smoke test.

Only the disposable snapshot's generated `worker.config.json` was adapted for preview: Worker name `citywalk-local-acceptance`, synthetic Hyperdrive ID, `HYPERDRIVE.dev.connectionString` pinned to `127.0.0.1`, database-backed content, test runtime identity, synthetic auth secret/base URL and explicit disabled AI. The application bundle was unchanged. `CLOUDFLARE_VITE_FORCE_LOCAL=true` disabled remote bindings. Provider, email, object-storage and AI credentials were absent. Browser requests outside loopback were blocked; none were attempted during these checks. The production source configuration and Worker `citywalk-production` were untouched.

A generated `cw_vinextruntime_*` database was created using the local PostgreSQL administrative database. Migrations, canonical CMS import and catalog verification ran only against this new database: one city, 25 places, 175 authored localizations, five Hidden Gems and one five-stop tour. Synthetic verified/unverified accounts were inserted with hashed test passwords. The existing development database was not used as a test target. Every rehearsal database was dropped in `finally`, including initial assertion iterations. The separate lifecycle runner created and removed its own database as well.

The same built bundle was restarted with (a) missing legal configuration and (b) a complete synthetic individual operator. No actual controller identity was used. The modified local-preview output must never be deployed. The final build/binding gate rebuilt the snapshot from its unchanged source configuration.

## Actual runtime results

| Check | Result |
| --- | --- |
| `/`, `/explore`, `/privacy`, `/terms`, `/imprint`, `/support`, `/account-deletion` | **READY** — all 200 with expected main content in both states; exactly one main heading per page |
| Responsive layouts | **READY** — all seven routes without horizontal overflow at 320, 390 and 1440px; legal pages also at 200% root text size on 390px |
| Browser runtime | **READY** — no uncaught page errors in either state; fixed-viewport synthetic imprint visually reviewed |
| Incomplete legal configuration | **READY** — legal warning present, noindex/nofollow, canonical URLs retained, legal URLs omitted from sitemap |
| Synthetic-complete legal configuration | **READY** — warning absent, indexing allowed, canonical URLs correct, legal URLs included in sitemap; synthetic operator displayed |
| `/robots.txt`, `/sitemap.xml` | **READY** — 200; robots references sitemap; state-dependent legal sitemap assertions passed |
| Anonymous content | **READY** — city list and Lübeck detail APIs 200 with imported content; guest session endpoint 200 |
| Account export denial | **READY** — anonymous, missing account binding and another account binding 401; foreign-origin request 403 |
| Authentication | **READY** — wrong password 401; unverified account 403; verified sign-in 200 and correct session; sign-out clears session and export returns 401 |
| Authorized own export | **READY** — 200 with explicit matching account binding, private/no-store; test password, password hash and auth secret absent from payload |
| Public AI | **READY as disabled** — guide POST 503 before provider use |
| Commerce | **READY as disabled within tested scope** — anonymous checkout 401; native billing context 503 both before and after login. No payment session created. Full unit suite includes synthetic live-key rejection before the Stripe request |
| Unfinished public walk sharing | **READY as unavailable** — `/share/synthetic` and `/api/shared-walks/synthetic` 404; no public walk-link publishing/replay was enabled. Existing city-URL system sharing remains separate |
| Analytics without consent | **READY** — marketing-funnel POST discarded with 204 |

Full-page screenshot captures showed repeated paint regions after viewport resizing; those captures were not accepted as visual evidence. Rechecking the DOM found a single body/main heading, and the fixed-viewport capture rendered correctly. This does not establish cross-browser or physical-device acceptance.

Machine-readable route/auth evidence and the exercised bundle digest are in [PUBLIC-BETA-VINEXT-ACCEPTANCE.json](./PUBLIC-BETA-VINEXT-ACCEPTANCE.json). The digest identifies the tested bundle before the final rebuild; it is not a deployment approval or reproducible-build claim.

## Regression results

| Command | Actual result |
| --- | --- |
| `npm run test:run` | PASS — 235 files / 1,483 tests; 19 integration files / 143 tests skipped as expected |
| `npm run lifecycle:test:integration` | PASS — four files / 34 tests on a separate disposable loopback database |
| `npm run lint` | PASS — zero errors, eight existing warnings |
| `npx next typegen` then `npx tsc --noEmit` | PASS |
| `npm run typecheck:cloudflare` | PASS |
| `npm run build:vinext` | PASS — before rehearsal and again before final bundle/binding checks |
| `npm run check:cloudflare-build` | PASS — nine pages / seven API handlers, full tested revision |
| `npm run check:cloudflare-bindings` | PASS — 16 preserved bindings / six reviewed additions; no secret values inspected |
| `git diff --check` | PASS |

No migration was added or changed. `db:migrate`, `cms:import-lubeck` and `db:verify` passed on disposable rehearsal databases. Database generation and the Next production build were not repeated: this follow-up changes documentation only and targets the built Vinext runtime.

## Remaining gates

**BLOCKED:** real owner-managed legal configuration and review; approved external-erasure scheduling, monitoring and provider completion evidence; remaining release/security review; exact-head remote CI/isolated Preview and explicit release approval. Existing GitHub billing restrictions are not resolved by this local run. No paid GitHub Actions requirement or automation was added.

**NOT TESTED:** production/remote Preview runtime, real email delivery, Apple/RevenueCat erasure APIs, authenticated hosted checkout, live commerce, AI provider responses, object-storage upload/audio delivery, iOS and Android devices, real GPS/navigation, production migration/rollback execution and a fresh dependency audit of this HEAD. Provider/lifecycle unit and local integration results do not establish real-provider acceptance. Public launch remains NO-GO until its separate operational gates are satisfied.

Production Worker configuration, cron, credentials, databases, DNS, traffic and payments remain unchanged. No live provider API was called and no production command was executed.
