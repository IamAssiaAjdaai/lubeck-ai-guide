# Account Saved Walks — Preview acceptance review — 2026-09-27

Branch: `feat/saved-walk-account-ux`. HEAD and freshly fetched `origin/develop`: `74684d3faad7df3d5ed9e2b63173125debb87fae`. Index unchanged/empty. All existing local work preserved. No stash operation, source reset, commit, push, build, deployment, Preview migration, configuration change or publication.

The owner accepts the six-language launch policy, retained technical Arabic support, guest-first core, account-required permanent Saved Walks and separately preserved historical local saves. This accepts product direction, not new physical/backend deployment results. Previously confirmed iPhone behavior remains recorded in the preceding reports; no new iPhone, Android or release acceptance is claimed here.

## Review decisions

- **SAFE TO PREPARE COMMIT: YES.** Local source and additive migration are coherent with current develop. The exact locked backend dependencies pass actual cookie/auth and PostgreSQL tests. No runtime implementation/schema changes were needed in this review. Include the migration, journal/snapshot, shared/mobile/backend implementation and coupled tests together; nothing staged here.
- **SAFE TO DEPLOY TO PREVIEW AFTER COMMIT: NO — operational clearance pending.** Code/migration safety passes, but the effective feature-branch Preview database/auth binding has not been verified. The connected Vercel project tool failed conflicting `projectId`/`idOrName` schema validation, so it did not establish project/environment settings. Prior owner confirmation of isolated Preview storage/database is retained, but does not verify this feature branch's overrides. The iPhone acceptance target also needs to be bound to the feature Preview: checked-in EAS preview/store-beta profiles still target the develop alias. This is not a reason to merge into develop or alter production to obtain acceptance.
- This NO is not a request for a schema redesign or an auth upgrade. The smallest next step is read-only operator confirmation of the feature Preview bindings, followed by explicit authorization for the commit/push/automatic Preview migration sequence. No credentials or connection URLs should be sent in chat.

## Backend and API safety

| Boundary | Evidence / result |
| --- | --- |
| Authentication | `/api/account/saved-walks` calls `getAuth().api.getSession` server-side. Actual Better Auth 1.7.2 signup/sign-in and signed-cookie session lookup pass against a disposable DB. Missing, forged and revoked cookies reject writes. |
| Ownership | All queries/write predicates use the verified session user. `X-Citywalk-Account` must equal it; the header cannot establish identity. Forged body `userId`/fingerprint values are ignored. A mismatched header returns 401; wrong-owner IDs return 404. GET only lists the authenticated account. |
| Save/update | POST without ID creates/deduplicates; explicit owned ID updates that record, retaining ID/createdAt. No client actor/role or fingerprint is persisted as authority. |
| Duplicate prevention | Shared deterministic tuple: city + ordered unique planned stops (visited prefix plus remaining suffix) + finish coordinates; SHA-256 calculated server-side. Unique `(user_id, fingerprint)` index plus per-user transaction lock handles concurrent creates and update collisions. Same route for two different users remains independent. |
| Idempotency | Same-route repeat/retry returns the original row and timestamps. Update collision with another owned route returns 409 without deleting either. DELETE repeat returns 404 after the first 200, with the same absent final state and no other rows changed; it does not promise repeated 200 responses. |
| Validity | Server projection rejects empty/malformed routes and validates published same-city eligible stops through the existing public repository. Completed itinerary is saved from all original planned visit stops, not only unvisited stops. |
| Private data | Bounded JSON request (30,000 bytes); cross-origin browser requests rejected; private/no-store responses; sanitized errors. Projection excludes current progress/GPS position, deadline, session ID and locale. Planned start/finish coordinates are private route data; no credentials, cookies or route coordinates logged. |
| Existing architecture | Existing Better Auth, PostgreSQL/Drizzle and native SecureStore transport reused. Staff capabilities and media/content approval rules unchanged. No production-host assumption; auth environment supports explicit URL or deployment/branch host configuration. |

Full Saved Walks are returned only to their account, not as public content. The implementation has no distributed offline conflict resolution: concurrent distinct edits serialize with the later successful update winning. This is not broader CITYWALK synchronization.

## Client/server and historical-save review

- Guest Save opens the account sheet; cancel/continue writes no permanent record. Current walk, progress and favorites survive. Session absence/account switch also rejects direct account persistence before an HTTP write.
- Signup requires the existing explicit sign-in; account navigation preserves the current walk and returns to it. The user taps Save again; no automatic save or captured stale snapshot.
- Save state uses account records. No optimistic permanent local copy is created. Revalidation occurs inside the current-walk mutation queue, protecting remove-last-stop/save races and completed itineraries.
- Tests explicitly cover 401, 403, 503 and network rejection: no mutation notification or new account lineage/saved record; current/historical/favorite storage unchanged. An explicit retry can then succeed. UI failure remains visible and does not block continued route use.
- Reopen/update/remove keep the server record ID and expected-account header. A fresh local journey ID does not create a new permanent row. Sign-out hides account rows; sign-in refetches the current user's list; stale responses from another account are discarded.
- Saved separates **account** and **this device** views, with source-specific removal. No combined duplicate rows or competing remove actions for the same route. Historical duplicate local records are not purged. Old local saves remain readable/removable; sign-in does not upload or merge them. Explicitly opening one and choosing Save while signed in is a single user-requested account copy, not collection migration.
- No import implementation, favorite sync, history sync or current-walk cloud resume added. No new permanent local guest-save entry point remains in production code.

## Migration review against refreshed develop

File: `drizzle/0014_orange_vision.sql`.

Creates `account_saved_walks` with:

- `id uuid` primary key, default `gen_random_uuid()`;
- required `user_id text`, `city_slug text`, `fingerprint text`, `route jsonb`;
- required `created_at` / `updated_at` timestamptz with `now()` defaults;
- foreign key `account_saved_walks_user_id_user_id_fk` to existing `public.user(id)`, `ON DELETE CASCADE`, `ON UPDATE NO ACTION`;
- unique btree index `account_saved_walks_user_route_unique (user_id, fingerprint)`.

The cascade only applies to new saved rows when their owning account is explicitly deleted; migration execution deletes no users or data. The migration adds one table, its primary/unique indexes and FK. It does not alter existing columns, seed content, backfill, reset accounts or access device-local saves. Adding the FK may briefly acquire an ordinary schema lock on the referenced user table; no existing account-table rewrite is requested.

Snapshot 0014 correctly references 0013; comparison finds exactly one new table, zero changed/removed existing tables. All 14 existing migration SQL files match refreshed develop. `db:generate` reports **38 tables, no schema changes, nothing to migrate**.

The isolated runner now applies the original 14 migrations, creates a synthetic pre-existing account/profile, applies migration 15, then repeats the full migrator. Account/profile JSON remains byte-equivalent, new Saved Walks starts empty, and migration history contains exactly 15 rows. The runner removes only its own newly allocated loopback database and temporary migration directory. No existing local or Preview database was migrated.

**Rollback:** no destructive down migration is needed or proposed. Installed Drizzle's PostgreSQL migrator applies pending SQL and journal writes transactionally. If a subsequent application build fails after migration success, the new table remains; the previous application can run with the unused additive table. An application rollback should leave it and any new saves intact. Do not drop it as routine rollback.

**Existing deployment path:** `vercel.json` selects `npm ci` and `npm run vercel-build`; that script runs `npm run db:migrate && next build`. It is structurally compatible with this additive migration, provided the intended isolated Preview DATABASE_URL/auth environment is verified first. Deployment will not perform CMS imports or device-save migration. Do not run `db:migrate` manually against Preview in this review.

## Dependency discrepancy found during actual-auth testing

The existing workspace installation is not lockfile-matched:

| Package | Workspace installed | Lockfile / isolated npm-ci installation |
| --- | --- | --- |
| better-auth | 1.7.6 | 1.7.2 |
| @better-auth/drizzle-adapter | 1.7.6 | 1.7.2 |
| @better-auth/expo | 1.7.6 | 1.7.2 |
| @better-auth/core | 1.7.2 | 1.7.2 |

The mixed workspace installation rejects required `account.issuer` during auth initialization. The initial expanded integration run therefore had **12 passed / 1 failed**, although its migration checks passed. No schema/credentials were changed to suppress this finding.

A separate temporary source copy, excluding private env files, received `npm ci --ignore-scripts --no-audit --no-fund`. Its four packages resolve to locked 1.7.2. The exact same 13 integration tests then all passed, including real signup/sign-in/session verification/revocation. Backend, domain, auth/schema, migration, runner and manifest/lock source files used there were compared byte-for-byte with this working tree. Install scripts were disabled for this diagnostic; no Next/native build was run and this is not deployment evidence.

Preserve the lockfile and use the existing clean `npm ci` deployment path. A future auth upgrade is a separate compatibility/migration review. Restoring the live workspace's dependencies to its lockfile is separate environment housekeeping; it was deliberately not done while preserving the current development session.

## This review's validation

| Check | Exact result |
| --- | --- |
| Relevant mobile tests (final command below) | **201 passed / 11 files**, 0 failed/skipped. |
| Account domain/auth/selector tests (command below) | **18 passed / 5 files**, 0 failed/skipped. |
| `node scripts/test-account-saved-walks.mjs`, mixed workspace deps | **12 passed / 1 failed / 1 file**; actual auth initialization fails as above. DB cleaned afterward. |
| Same isolated integration command, lockfile-matched temporary copy | **13 passed / 1 file**, 0 failed/skipped; actual auth/session and DB tests; DB cleaned afterward. |
| Migration upgrade/rerun/data preservation | PASS against disposable DB, 14→15; no fabricated saves or existing-data changes. |
| `npm run db:generate` + snapshot/predecessor comparison | PASS, no drift/new migration generated. |
| `npx tsc --noEmit` | PASS. |
| `npm run lint` | PASS. |
| `npm --prefix mobile run typecheck` | PASS. |
| `npm --prefix mobile run lint` | PASS, zero warnings. |
| `npm run i18n:check` | **477 keys × 7 catalogs**, zero errors. |
| `git diff --check` | PASS. |

```sh
npm --prefix mobile run test:run -- tests/account-guest-flow.test.tsx tests/account-walk-api.test.ts tests/account-walk-scope.test.tsx tests/saved-route-identity.test.ts tests/walk-flow.test.tsx tests/walk-save.test.ts tests/walk-session.test.ts tests/native-v2-regressions.test.tsx tests/locale-preference.test.tsx tests/launch-locale-selector.test.tsx tests/auth-errors.test.ts --maxWorkers=2
npm run test:run -- packages/traveler-core/src/savedWalk.test.ts src/lib/auth/native-policy-contract.test.ts src/lib/auth/env.test.ts src/lib/auth/server.test.ts src/components/LanguageSelector.test.tsx --maxWorkers=2
```

Initial relevant mobile run: 194/10 passed; new client failure/retry cases: 6/1 passed; the final 201/11 run includes the added sign-out/sign-in refetch case. Existing Vite configuration notices and npm dependency deprecation notices were emitted. No timeout/assertion changes, no weakened auth/schema validation. Full prior 874-web/shared and 513-mobile results remain historical; unrelated full suites and build were not repeated in this review. The current CI database job does not invoke the new Saved Walk runner; record this explicit isolated gate on the reviewed source rather than assuming a default unit-test run exercises it.

## Exact files changed in this review

- `src/lib/account/savedWalks.integration.test.ts` — forged ownership, repeat deletion and actual signed-cookie/revocation cases.
- `scripts/test-account-saved-walks.mjs` — upgrade an existing synthetic baseline, verify data preservation and migration rerun.
- `mobile/tests/account-walk-api.test.ts` — new session/HTTP/network failure, retry and record-identity tests.
- `mobile/tests/account-walk-scope.test.tsx` — sign-out hides rows and sign-in refetches.
- `docs/qa/saved-walk-account-ux/preview-acceptance-review.md` — this review/plan.
- `docs/qa/saved-walk-account-ux/account-saved-walks.md` — pointer to this later review.

No application runtime files, SQL, auth schema, lockfiles, environment files, held media diagnostics, pnpm files or CI configuration changed in this review. Earlier owner work remains unstaged and intact; its implementation file list is in the preceding report.

## Proposed Preview sequence — not executed

**Pre-push operational clearance:** using read-only project settings, confirm the feature branch resolves to Preview (not the production branch), correct root/build/install commands, isolated Preview DATABASE_URL with required migration privileges, and auth secret/URL scope. Report presence/scope and match only; never copy values or screenshots containing secrets. Check explicit BETTER_AUTH_URL does not pin auth to production or a different Preview; otherwise the existing deployment/branch dynamic-host path must cover the chosen HTTPS alias. Confirm Preview Protection permits the approved native QA access without weakening auth or publishing private access tokens. The connected project-tool schema error prevented this live verification here.

A. After approval, selectively stage/commit the coherent implementation, migration trio and coupled tests/docs. Inspect staged secrets/generated files and run the isolated gate from a clean lockfile-matched checkout. Do not include the held media/tooling stash.

B. After separate approval covering automatic migration, push `feat/saved-walk-account-ux`. A push may immediately trigger C via [Vercel Git integration](https://vercel.com/docs/git); there may be no pause between push and migration. Open/update a PR to develop only if authorized. Do not merge for acceptance.

C. Feature Preview installs via `npm ci`, applies the additive migration once through `vercel-build`, then builds. Verify exact commit/deployment/branch/environment, migration success and READY status. A failed build is not proof migration rolled back; inspect before retry. No CMS publication, content seed, auth upgrade or production promotion.

D. Verify the feature URL, not the develop alias: city/content JSON health; anonymous account GET/POST 401; real isolated test-account auth; own list/create/retry/update/delete; wrong-account/header rejection; empty route rejection; completed itinerary save. Use normal authenticated APIs and sanitized status/count evidence. Confirm table/index/journal state read-only without logging saved route coordinates or auth values. API 404 means this deployment lacks the new route; 503 needs diagnosis, not a local-save fallback. Do not treat Preview SSO HTML as API success.

E. With approval, run the existing Development Client/Metro JS against that exact feature Preview origin without rebuilding, deleting app storage or changing production configuration. Auth and data clients must share that origin. Existing EAS preview/store-beta settings still target develop; those binaries are not evidence for a feature-only backend. Changing the QA session origin must be explicit and recorded, not silently re-pointing develop. Then execute the owner checklist below. A Development Client can verify selector policy with the experimental flag absent; actual release-mode selector acceptance remains separate, since no release build is created here.

## Physical iPhone checklist after deployment — all new cases UNVERIFIED

Record actual app/JS/deployment identity and device metadata where observable; do not invent it. Do not clear storage. Use two isolated Preview traveler accounts A and B; record only sanitized record IDs/counts and UI outcomes, not credentials or raw routes.

1. With launch visibility active, selector shows **de/en/da/sv/nl/es only**, Arabic hidden. Arabic catalog/RTL tests remain; a production configuration must ignore any development-only Arabic opt-in. Arabic device/persisted preference resolves to English.
2. Guest builds a valid walk → Save → account gate. Continue without saving/close: walk/progress intact, no new permanent local save and no account-save POST.
3. Create account → existing explicit sign-in → same walk; also test direct Sign in. Cancel/failure preserves walk and data. No automatic save after auth.
4. Explicit Save → one backend record for A. Repeat request/tap where permitted → still one record, **Saved ✓**; refresh/reopen proves persistence beyond a success message.
5. Open it from Account Saved → **Saved ✓**. Modify one stop → **Update saved walk** → same backend ID, no duplicate; reopen verifies changed route.
6. Sign out → authenticated account entries disappear. Current itinerary/progress, favorites, historical device saves and locale remain.
7. Sign in as A again → account Saved Walk returns from backend.
8. Sign in as B → cannot list/open/update/delete A's saved walk. Saving the same route for B creates B's own independent record.
9. Historical device save still opens and removes explicitly. No silent upload on sign-in. If both sources contain the same route, source switch/removal remains clear; removing one does not remove the other.
10. Remove final planned stop → Save disabled/explained; direct empty save rejects and preserves any earlier valid copy. One valid stop saves.
11. Complete an itinerary → save succeeds using original planned stops; it reopens as a fresh Preview without restarting itself or inheriting elapsed time.
12. Remove an account save → backend/list absence; historical local copy/favorites remain. Repeat removal is harmless; later explicit save may create a fresh account copy.
13. Network/auth failure during save → visible recoverable failure, no fake Saved success or local permanent copy. Retry when available → correct account record.
14. EN/DE/NL at **110%** text: gate, Save/Update/Remove controls and source headings readable with no clipping. Reconfirm accepted account/navigation/audio/membership behavior.
15. Repeat selector check in the actual release configuration when separately approved; no Android or release readiness inferred from this iPhone Development Client round.

Capture PASS/FAIL/BLOCKED per scenario only after an owner result/device evidence. Do not merge, publish, submit stores or claim general cloud synchronization from this acceptance.
