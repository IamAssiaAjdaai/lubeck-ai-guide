# PR #369 authenticated production binding audit

14 October 2026 follow-up. Public Web/backend configuration required; Mobile Core consumes the unchanged API origin, with no native code change in this follow-up; Admin Web auth/database compatibility is preserved. iOS/Android device acceptance is still separate.

## Confirmed deployment evidence

Authenticated GET-only `cf workers versions get` and `cf workers deployments list` independently confirm `citywalk-production` serves version `4c18d94c-f9a8-4102-b887-145bc3ad499d` at 100%. Version creation: **4 October 2026, 23:06:48.557667 UTC**. Deployment: **23:06:50.854787 UTC**, source `cf_cli`. No Git SHA annotation exists. This predates the 5 October committed landing cutover and 7 October legal routes and explains the observed pre-feature release mismatch. The precise compiled Git SHA is unknown; the historical #187 artifact SHA is not proof of this version's source.

Only binding names/types, three existing non-secret mode values, Hyperdrive resource ID and compatibility/asset-routing metadata were retained in `cloudflare-production-binding-baseline.json`. No secret values, operator identity, connection string or Cloudflare author email are in the baseline. Secret metadata cannot prove secret-value equality or provider connectivity.

## Complete comparison

The original #369 configuration retained 15 of 16 active bindings, omitted `DATABASE_URL`, and added six bindings. This follow-up restores `DATABASE_URL` as a **secret**: final candidate has **22 bindings: all 16 active preserved, six reviewed additions, zero removals/type/value/resource-target changes**.

| Active binding | Active → candidate type/value | Dependency / assessment |
| --- | --- | --- |
| `ASSETS` | assets → assets | Static asset delivery preserved |
| `BETTER_AUTH_SECRET` | secret → secret | Auth/security/HMAC/encrypted lifecycle records; rotation/removal unsafe |
| `BETTER_AUTH_URL` | secret → secret | Canonical auth/API origin; removal or value change unsafe |
| `CITYWALK_CONTENT_SOURCE` | text `database` → same | Published database content selection preserved |
| `CITYWALK_DATABASE_RUNTIME` | text `hyperdrive` → same | Scoped database enforcement preserved |
| `CITYWALK_EMAIL_FROM` | secret → secret | Account email sender preserved |
| `CITYWALK_MEDIA_S3_ACCESS_KEY_ID` | secret → secret | Managed media access preserved |
| `CITYWALK_MEDIA_S3_BUCKET` | secret → secret | Media bucket target preserved by reference; value not inspected |
| `CITYWALK_MEDIA_S3_ENDPOINT` | secret → secret | Media endpoint preserved by reference; value not inspected |
| `CITYWALK_MEDIA_S3_REGION` | secret → secret | Media signing region preserved |
| `CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY` | secret → secret | Managed media credential preserved |
| `CITYWALK_MEDIA_STORAGE` | text `s3` → same | Storage backend selection preserved |
| `DATABASE_URL` | secret → **restored secret** | Direct PostgreSQL Node/operational compatibility; do not remove in this release |
| `GROQ_API_KEY` | secret → secret | Guide provider credential preserved |
| `HYPERDRIVE` | Hyperdrive → same ID `390958927c2946be8571ec5282b35ce6` | All scoped Worker database/API/auth access; changing target unsafe |
| `RESEND_API_KEY` | secret → secret | Verification/reset/deletion email credential preserved |

Reviewed additions:

| Binding | Candidate | Effect / required evidence |
| --- | --- | --- |
| `CITYWALK_RUNTIME_ENV` | text `production` | Health/operational event environment classification; existing code already falls back to production `NODE_ENV`; no billing/auth mode change |
| `CITYWALK_LEGAL_ENTITY_TYPE` | text `individual` | Owner-confirmed legal entity contract, no traveler authentication change |
| `CITYWALK_LEGAL_OPERATOR_COUNTRY` | text `Germany` | Owner-confirmed launch country |
| `CITYWALK_LEGAL_OPERATOR_NAME` | secret | Required owner-approved public identity, not supplied by this audit |
| `CITYWALK_LEGAL_OPERATOR_STREET_ADDRESS` | secret | Required legally usable/publicly approved address, not supplied by this audit |
| `CITYWALK_LEGAL_OPERATOR_POSTAL_CITY` | secret | Required postal code/city, not supplied by this audit |

Compatibility date `2026-10-03`, `nodejs_compat`, and asset not-found handling `none` match the active version. Active assets also report `html_handling=auto-trailing-slash`, `run_worker_first=false`, `base_path=/`; this follow-up changes none of these settings. No Worker name, production domain, DNS, traffic, scheduled trigger or resource was changed. OAuth/store/commerce/analytics secrets are **not present in this active metadata**; do not invent them or activate those integrations. Any later additional binding requires a reviewed contract update.

## DATABASE_URL dependency trace and exact risk

- `src/cloudflare/entrypoint.ts` creates a `pg.Client` using `env.HYPERDRIVE.connectionString`, then wraps `handler.fetch` in `runWithRequestDatabase`. The scheduled erasure handler also uses a Hyperdrive client/scope. Neither entrypoint selects `DATABASE_URL` for the database connection.
- `src/db/client.ts:getDb()` returns the scoped database first. Outside that scope, `CITYWALK_DATABASE_RUNTIME=hyperdrive` **throws**; it does not silently connect with the legacy secret. New tests prove both behaviors, with no network/database operations.
- When the runtime is plain Node (normal Next/CLI compatibility), `getDb()` creates a `pg.Pool` through `src/db/env.ts:getDatabaseUrl()`, which requires `DATABASE_URL`. `src/lib/auth/factory.server.ts` uses `getDb()` for the Better Auth adapter. `getAuth()` rebuilds auth for scoped Worker requests but retains the existing plain-Node auth bootstrap path, including `scripts/create-super-admin.ts`.
- `drizzle.config.ts` requires `DATABASE_URL` for explicit migrations. Seed, verify/import/content operations use the same database layer. Backup/restore and integration runners also explicitly consume this variable. These operator commands require their own approved environment; declaring a Worker binding does **not** export a secret to a local shell or authorize migrations.

Removing `DATABASE_URL` is therefore **not a safe compatibility cleanup** within this release. The current guarded Worker fetch path does not need it, but Node/operational paths still do, and the active deployment's exact source is unknown. An omitted binding is a deployment-contract risk even if a particular CLI version happens to retain undeclared secrets. Preserve it explicitly; do not depend on undocumented retention. No claim is made that its omission would necessarily break current Hyperdrive auth, or that the CLI has actually deleted a secret.

Other exact risks: changing database mode or Hyperdrive ID could route requests to a wrong database; changing auth credentials/origin could invalidate sessions or callbacks; removing email/media/AI references could disable their flows; changing compatibility or asset fallback could affect execution/API routing. All are blocked by the new offline contract gate. Secret values are opaque: the gate cannot detect rotations, incorrect sender/origin/bucket credentials or provider state.

## Automated checks and release drift

`npm run check:cloudflare-bindings` checks the **compiled** Worker config against the sanitized authenticated baseline. It rejects any active binding removal, secret-to-text/type change, changed mode value/Hyperdrive target, local database override in a release artifact, Worker/compatibility/asset-not-found drift or unreviewed addition. CI and the manual prebuilt artifact workflow run this without Cloudflare credentials or secret values. A test also checks the real source `cloudflare.config.ts`, so an omission is caught before build.

Immediately before a separately approved release, capture fresh metadata privately (use `umask 077` and do not commit raw output):

```bash
./node_modules/.bin/cf workers versions get 4c18d94c-f9a8-4102-b887-145bc3ad499d --worker-id citywalk-production > /absolute/private/path/version.json
npm run check:cloudflare-bindings -- --active-version-file /absolute/private/path/version.json
./node_modules/.bin/cf workers deployments list --worker citywalk-production --per-page 1
```

The live metadata check rejects a changed version, incomplete binding inventory, new/removed bindings and public mode/resource/compatibility drift. Separately verify that the fetched version is still the one serving 100% traffic; fetching a known UUID does not establish it is active. CI alone cannot detect later dashboard changes, secret-value drift or stale owner-supplied files. A different active version requires fresh authenticated evidence and a reviewed baseline, not a bypass.

## Follow-up validation and boundaries

Targeted command: `npm run test:run -- scripts/cloudflare-binding-contract.test.ts src/db/client.test.ts src/db/env.test.ts scripts/check-cloudflare-build.test.ts`: **35 passed**. Includes removal of each of the 16 active bindings, secret type safety/error-output privacy, target/mode/compatibility/asset/addition drift, fresh-version drift, scoped Worker access without DATABASE_URL, fail-closed out-of-scope Hyperdrive and retained Node fallback.

Compiled Worker build and the binding check against authenticated metadata passed: **16 preserved, six reviewed additions**. The page/API/SSR gate still verifies nine pages and seven handlers. Full suite, lint/typechecks, Next build and latest CI results are reported in the PR follow-up. No migration, import, seed, database verification command or database test runner is executed in this follow-up; no production data was read or written. Existing CI workflows may validate their own isolated disposable database fixtures.

Final local gates: `npm run test:run` **1,439 passed / 133 skipped** (230 passing files); `npm run lint` zero errors/eight existing warnings; sequential post-build `npx tsc --noEmit` and `npm run typecheck:cloudflare` passed; `npm run build`, `npm run build:vinext`, bundle/binding checks and `npm run deploy:vinext:dry-run` passed. Tests run in the isolated tracked-source copy, without repository secrets or database operations. Remote results are tied to the pushed follow-up SHA in PR #369/#187; the previous head's five workflows were all green before this update.

Remaining blockers: owner-approved legal identity/address and legal/provider/retention decisions; fresh pre-release active-version/traffic/binding acceptance; opaque secret-value/provider runtime acceptance; isolated infrastructure Preview and device/store acceptance. The historical exact Git SHA remains unknown and must stay marked unknown. No merge, deploy, secret/DNS/traffic change or migration was performed by this follow-up.
