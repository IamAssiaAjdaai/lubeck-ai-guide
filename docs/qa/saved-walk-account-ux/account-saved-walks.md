# Launch language visibility and account Saved Walks — 2026-09-27

> **Current acceptance — 2026-09-27:** [Physical iPhone acceptance and final validation](physical-acceptance.md) supersedes the pending deployment/device status below for this feature. This document retains its earlier implementation/review evidence; its historical counts and operational restrictions describe that earlier checkpoint. Android physical and release-build acceptance remain unverified.

**Follow-up:** [Preview acceptance safety review](preview-acceptance-review.md) records the later real-auth/locked-dependency checks, migration upgrade evidence and operational deployment prerequisites. Earlier counts below remain historical.


Branch `feat/saved-walk-account-ux`, HEAD `74684d3faad7df3d5ed9e2b63173125debb87fae`. All prior local work preserved. No staging, commit, push, build, deployment, publication, remote database mutation, environment change, pnpm work or stash operation.

Scope: Mobile Core implemented for iOS/Android; shared backend/domain changes; Public Web language-selector visibility only. Admin authoring locales remain intact. Android/device acceptance and release readiness are not inferred from automated checks.

## Previously accepted iPhone behavior

The owner explicitly identifies signup, sign-in, display-name editing, password change, sign-out/failure preserving local traveler data, active-walk preservation and technical Arabic RTL compatibility as accepted on iPhone. Preserve these as owner-reported acceptance of the preceding implementation. Device/build metadata is unavailable. New account-saving and launch-visibility behavior is **UNVERIFIED physically**. Existing unrelated navigation/audio/membership acceptance is retained, not reverified by this task.

## A. Languages

Shared `supportedLocales` retains all seven catalogs and RTL metadata. `launchVisibleLocales` aliases the existing six official launch locales in order: **de, en, da, sv, nl, es**. Both native and public Web selectors use that launch list; Admin authoring and explicit content-locale compatibility remain intact.

Native initialization, persisted preference hydration and selection share `resolveVisibleLocale`. Arabic device locale and an earlier Arabic preference resolve to English for launch; hydration does not erase the historical preference or traveler data. Arabic can be explicitly enabled only in development with `EXPO_PUBLIC_EXPERIMENTAL_LOCALES=1`; production ignores that switch. No environment values were changed. Existing Arabic catalogs, direct technical locale support and RTL tests remain.

## B–E. Save gate and actual persistence

Audit found no existing account Saved Walk schema/API. The old canonical permanent save wrote AsyncStorage. This task adds a real minimal backend; signed-in records are not relabelled local records.

- Guests retain city/explore/planner/current walk/finish/audio/AI access under existing rules. Save of an eligible walk opens a dismissible native account sheet. Continue without saving/Back writes nothing and leaves the current walk intact. Empty or unresolved plans remain unsaveable.
- Create account/Sign in **push** Account above the existing walk, retaining that mounted screen and local session. Successful signup still requires sign-in. Successful explicit sign-in returns to the prior walk; the user taps Save again. No captured route, automatic save, silent upload or persisted pending-save job.
- `account_saved_walks` stores a server-generated UUID, authenticated user FK, city slug, unique user/fingerprint pair, a bounded route JSON projection, createdAt and updatedAt. Projection contains ordered planned stop slugs, start/settings and route finish. It does **not** store current GPS position, visited progress, elapsed distance/time, deadline, session IDs, locale, password/auth tokens or unknown input fields. Start/finish coordinates are private saved-route data and are never logged.
- Additive migration `0014_orange_vision.sql` plus Drizzle snapshot/journal. Applied only to disposable local test databases; no existing local/Preview/production database migrated.
- `/api/account/saved-walks`: GET list, POST create/update (`id` only for explicit update), DELETE remove. Better Auth verifies the request cookie server-side. Owner identity always comes from that session. The client supplies an expected-account header solely to reject account-switch races; it cannot select ownership.
- JSON mutation bodies are bounded to 30,000 bytes while reading. Cross-origin browser requests are rejected. Responses are private/no-store, errors sanitized and DTOs omit user ID/fingerprint. Native uses the existing same-origin authenticated API transport/SecureStore cookie, with no second auth system.
- Server validation reuses shared itinerary projection and authoritative published public content eligibility. Empty, unknown, closed/ineligible and wrong-city stops are rejected. All writes are parameterized; per-user transaction locks plus a unique index serialize concurrent creates/updates/removals. Current user cannot read/update/delete another user's record.
- A repeated unchanged save returns the same record without changing timestamps. An explicit changed-route update retains its ID/createdAt. New distinct unlinked routes create separate records. Update into another existing owned route returns 409 and preserves both records; nothing is silently deleted/merged.
- Save state comes from server records: Save walk / Saved ✓ / Update saved walk. Local lineage records both account ID and saved ID, separate from old local-save lineage. Reopening account records yields Preview with a fresh local journey and no inherited completion/timer state.
- The native save transition re-reads and revalidates the current persisted itinerary under the existing mutation queue. A remove-last-stop race cannot save an obsolete snapshot. Completed original itineraries remain saveable. Only current-session lineage is written locally after a successful server response; the permanent record is on the account backend.
- A later explicit Save after an account record was removed checks server existence and can create a new record. Failed network/API calls never silently fall back to a new local permanent save or show successful-save feedback.
- Historical local save writing is no longer a production entry point; its compatibility helper requires an explicitly injected store for historical regression fixtures. Production new permanent saves go through the authenticated service.

**Deployment boundary:** the implementation is local. The configured Preview has not received this API/migration through this task. Until an approved deployment applies the migration, account requests may fail; the app shows a recoverable error, not a fake local account save. No successful remote/cross-device/iPhone account Save is claimed.

## F. Legacy coexistence

Historical V2 saved walks and earlier legacy trip saves remain readable/removable. No deletion, migration or automatic upload on authentication. Favorites remain independent.

Signed-out Saved shows historical device records plus Sign in/Create account. Signed-in Saved defaults to account records and provides an explicit switch to **Saved on this device**. Account and local lists are never combined, so the same route in both sources is not rendered as two competing rows in one list. Each source's Remove targets only that source. Historical duplicates within the local source are not purged. Opening a local route and explicitly tapping Save after signing in may create its account copy; that is a single user-requested save, not an automatic collection import. Account loading/failure is shown separately, without labelling unknown account data as an empty successful response.

Account queries refresh on focus/mutations and discard responses belonging to a previous account or signed-out state. There is no shared cross-account permanent local cache.

## G–I. Identity, preservation, limits

The existing stable identity is now shared: city slug + ordered unique visited-prefix/remaining-suffix planned stops + finish coordinates. Locale, display text, journey ID, timestamps and normal visit progress are excluded. Backend derives its fingerprint itself; clients cannot choose it. Existing dedup and empty/one-stop/completed-route rules remain.

Auth does not reset the current walk or erase saves/favorites/preferences. Name/password management and accepted native navigation/audio/membership/presentation were not redesigned. No new native dependencies. Account benefit copy now describes saved walks/profile management; the retained local-data copy distinguishes current progress, favorites and earlier device saves from account Saved Walks in all seven catalogs.

Only Saved Walk storage is account-backed. Favorites, active/draft walk and progress, private feedback/review history and local preferences remain local. No general profile/history sync, purchase restore, account-switch migration or offline conflict engine is implemented. Planned route start/finish are stored with the saved plan; this is not live location tracking.

Native analytics transport is still absent in this path. Event names `save_gate_shown`, `save_auth_started`, `saved_walk_created`, `saved_walk_updated`, `saved_walk_removed` are documented future transport contracts only. No delivery or successful-save analytics claim; no route GPS or auth secrets logged.

## J. Validation

Final validation commands and outcomes:

| Command | Result |
| --- | --- |
| `npm run test:run -- --maxWorkers=2` | **874 passed**, **32 skipped**, 0 failed; 143 passed / 6 skipped files. |
| `npm --prefix mobile run test:run -- --maxWorkers=2` | **513 passed / 58 files**, 0 skipped/failed. |
| `node scripts/test-account-saved-walks.mjs` | **10 passed / 1 file**, 0 skipped/failed. All **15 migrations** applied to a newly allocated disposable local database; that database removed afterward. |
| `npx tsc --noEmit` | PASS. |
| `npm run lint` | PASS. |
| `npm --prefix mobile run typecheck` | PASS. |
| `npm --prefix mobile run lint` | PASS (`--max-warnings=0`). |
| `npm run i18n:check` | **477 keys × 7 locales**, 0 errors. |
| `npm run db:generate` | Intended additive migration only; snapshot comparison found exactly the new account Saved Walk table and no changes to existing tables. |
| `git diff --check` | PASS. |

The normal Web/shared run deliberately skips 32 integration cases: this task's 10 were executed separately above; the 22 pre-existing unrelated integration cases were not rerun. Isolated SQL tests use synthetic accounts on a new loopback database and the existing published code-content snapshot; Better Auth session lookup is mocked at the route boundary. They verify actual PostgreSQL transactions/indexes and endpoint ownership, not physical login or remote deployment health.

Iteration/rerun evidence: initial focused mobile run had 145 passes / 9 failures, and an intermediate walk-flow run 55 passes / 1 failure, as old local-save assertions/fixtures were adapted to the actual account persistence contract. An intermediate complete run had 508 passes / 2 failures (new-test translator typo and obsolete source assertion); the corrected complete run passed 512 tests. An additional explicit development/production locale-policy test then passed in a 15-test focused run. The first Web/shared run had 873 passes / 1 failure / 32 skips because the new selector test queried a button instead of its actual accessible option role; corrected the test to assert the six options in exact launch order. A four-worker rerun overlapping TypeScript/lint had 873 passes / 1 existing navigation timeout / 32 skips. The final complete two-worker run above passed without changing that navigation test, its assertions or its 5-second timeout. Root TypeScript initially caught an excess-property error in the new shared test fixture; giving that completed journey its proper `WalkJourney` type resolved it. Mobile lint import-order findings were corrected. No product assertions were weakened and no timeouts increased.

Vite emitted existing native-config-loader and tsconfig-path-plugin notices. No build, existing-database migration, Preview mutation or physical acceptance is claimed. Final catalog wording changes were checked by the final full suites and i18n gate; they retain the same key/type shape.

## K. Files touched by this task

```text
packages/i18n/src/locale-config.ts
packages/i18n/src/locales/{de,en,da,sv,nl,es,ar}.json
packages/traveler-core/src/index.ts
packages/traveler-core/src/savedWalk.ts
packages/traveler-core/src/savedWalk.test.ts
mobile/src/localization/localePreference.ts
mobile/src/localization/LocaleProvider.tsx
mobile/src/components/LocaleSelector.tsx
mobile/src/components/SaveAccountGate.tsx
mobile/src/components/NativeWalkFlow.tsx
mobile/src/hooks/useAccountWalks.ts
mobile/src/lib/accountWalks.ts
mobile/src/lib/walkStorage.ts
mobile/src/app/account/index.tsx
mobile/src/app/city/[citySlug]/walk.tsx
mobile/src/app/saved.tsx
mobile/tests/account-guest-flow.test.tsx
mobile/tests/account-walk-scope.test.tsx
mobile/tests/launch-locale-selector.test.tsx
mobile/tests/locale-preference.test.tsx
mobile/tests/native-city-experience.test.ts
mobile/tests/native-v2-regressions.test.tsx
mobile/tests/walk-flow.test.tsx
mobile/tests/walk-save.test.ts
src/components/LanguageSelector.tsx
src/components/LanguageSelector.test.tsx
src/db/travelerSchema.ts
src/lib/account/savedWalks.server.ts
src/lib/account/savedWalks.integration.test.ts
src/app/api/account/saved-walks/route.ts
scripts/test-account-saved-walks.mjs
drizzle/0014_orange_vision.sql
drizzle/meta/0014_snapshot.json
drizzle/meta/_journal.json
docs/qa/saved-walk-account-ux/README.md
docs/qa/saved-walk-account-ux/account-hardening.md
docs/qa/saved-walk-account-ux/account-saved-walks.md
```

Earlier dirty files remain separate prior work. No private environment/signing files, media/storage diagnostics, pnpm artifacts or store/build outputs were changed.

## L. iPhone retest — pending

Do not delete app storage. Use an isolated Preview test account. Account persistence steps require a separately approved deployment of this API and migration; until then test only the gate/recovery and language behavior without claiming successful storage.

A. In production configuration, inspect the language selector: Deutsch, English, Dansk, Svenska, Nederlands, Español only. Arabic device language/previous Arabic preference falls back to English. Explicit development opt-in retains Arabic/RTL; production must ignore it.

B. Guest: build a valid walk → Save → account sheet → Continue without saving / Back. Verify unchanged itinerary/progress and no permanent record. Repeat during an active walk and at Finish. Empty Save stays disabled; one valid stop is eligible.

C. Guest → Create account → explicit sign-in → same walk. Verify no automatic save. Tap Save once/repeatedly: one account record, Saved ✓. Repeat with direct Sign in and canceled/failed authentication. Current walk must survive.

D. Reopen an account record in Preview: Saved ✓; change a stop → Update saved walk → same server record. Completed itinerary remains saveable. Remove last stop → blocked; prior valid account record survives. Rebuild distinct route → distinct record. Remove from account Saved, return to walk and explicitly save again.

E. Sign out/in: account list disappears while signed out, returns for the same account after authentication. Another account must see only its own records. Local active walk, favorites, language and review history remain. Test API/network failure: recovery, no success/no silent local copy.

F. Historical local save: switch to device records, reopen/remove explicitly; no upload. If the same route exists in both sources, verify separate views without duplicate combined rows. Removing either source must preserve the other.

G. EN/DE/NL at normal and 110% text: account gate/actions/Save states wrap readably, keyboard/Back usable. Confirm accepted audio, Home/Explore, membership/Add-stop, Start/Rebuild and account profile/password behaviors remain intact. Android acceptance remains separately unverified.

## M. Future work

Explicit consent flow: “Move your saved walks to your CITYWALK account?” Define per-record preview, identity collisions, choice to keep/update/skip, account ownership, resumable import/idempotency, partial failure/retry and whether local originals remain. No import implemented now.

Separate tickets cover favorites/history/current-walk sync, offline/multi-device edit conflict policy, verified email/password-reset delivery/deletion lifecycle and store restoration. Do not generalize account Saved Walks into whole-app sync claims. No remote issues created or closed.
