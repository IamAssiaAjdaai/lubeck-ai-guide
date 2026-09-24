# CITYWALK real-data integration

## Audit before implementation

Branch: `feat/citywalk-real-data-integration`, initially at `2f0009e`.

The claimed V2 merge did not contain the actual UI: `fb2b35d` changed package files only. After checking fetched origin/develop and asking the user, the user authorized the old V2 source. The implementation/assets/tests from `e54b326` were restored as working-tree changes, excluding its accidental nested repository and unrelated package/mobile changes. No commit or push.

- PostgreSQL 16 with Drizzle (`src/db/schema.ts`, `authSchema.ts`, `travelerSchema.ts`, `commerceSchema.ts`), additive SQL in `drizzle/`, lazy `pg.Pool` in `src/db/client.ts`.
- Shared `publicRepository.server.ts` resolves city snapshots, authored localization, published/current revisions, same-city tour relationships and approved media. V2 Home/hub/Explore/planner consume these DTOs already; there are no hardcoded V2 route results to replace.
- `DATABASE_URL` is used by runtime repositories/auth, migrations, seeds and opt-in database tests. Generation does not need a DB. The database client itself is lazy; auth creates it too early at import time.
- Better Auth plus Expo integration and a Drizzle adapter, with `BETTER_AUTH_SECRET` (32+ characters) and `BETTER_AUTH_URL` or Vercel hostname configuration. Server session helpers protect staff capabilities/city scope, guest-account linking, checkout and premium media. No middleware-based login gate is needed for discovery. The eager exported auth instance blocks build module collection and even public place imports.
- City schema already has immutable identity, slug, country, timezone, publication state, localized descriptions and timestamps; media supplies approved images. Launch availability has a separate explicit V2 configuration. Place schema includes coordinates, category, tags, duration, indoor/outdoor, pricing classification, editorial revisions, source relations and verification dates. Do not duplicate these schemas.
- Editorial tours/stops exist in PostgreSQL. V2 personalized routes remain calculated from published city places. Saved walks use localStorage; active walks use sessionStorage; preferences/rating feedback are local. Traveler DB tables store profiles and guest identity links, not saved routes/trips. There is no disconnected authenticated trip persistence API to reconnect.
- The minimal `db:seed` only bootstraps rows. The existing idempotent `cms:import-lubeck` adds curated authored localizations, publication/revisions, normalized tags and editorial tours while preserving staff-authored content. Both are explicit commands, never build side effects.
- `CITYWALK_CONTENT_SOURCE` currently defaults to code. `auto` silently catches DB errors and substitutes curated code. Public generic pages/APIs also turn all DB failures into 404s. A hardcoded completeness check requires all canonical Lübeck IDs, preventing valid partial published city catalogs.
- Fixture classification: **A** implicit production code/auto fallback needs explicit source behavior; **B** curated `src/data` content and V2 coming-soon configuration remain documented sources; **C** no production V2 demo stop results found. Tests use isolated mocks intentionally. Static curated content and approved legacy audio are not live context or automatically verified RAG facts.

Local infrastructure: the repository already supplies Docker Compose PostgreSQL on localhost:5432 and environment loading for CLI commands. Docker Desktop was installed but initially stopped; it was started for the authorized local workflow. No production URL will be invented or used.

## Implementation

- Restored the authorized old V2 components, styling, walk planner/journey/storage, translations and assets. No new redesign or duplicate schema/app.
- `src/lib/auth/server.ts` now constructs Better Auth on first request. All protected consumers use `getAuth()`; authorization and entitlement checks remain in place. `publicSession.server.ts` skips unnecessary anonymous session initialization and treats failed optional verification as no session, never premium access.
- `src/lib/content/source.ts` defaults to database in production, retains explicit curated code mode, and rejects production auto fallback. Development fallbacks log their use.
- `publicRepository.server.ts` enforces launch availability, shares published content across V2/API consumers, and accepts legitimate partial Lübeck catalogs. Publication, current revision, same-city tour graph, exact-locale media and source verification boundaries remain intact.
- Typed content absence produces 404. Database/configuration/integrity failures produce non-cacheable 503 API responses or the friendly page error boundary. No raw errors reach API clients.
- Updated auth/route/repository tests and added lazy-auth, optional-session, service-failure, coming-soon and partial-catalog planner regressions. No SQL/schema or dependency changes.
- See [local setup](../../CITYWALK_LOCAL_SETUP.md) and `.env.example`. Generated local-only auth configuration lives in ignored `.env.local`; no secrets are staged or committed.

## Data status

| Source | Current use |
| --- | --- |
| PostgreSQL | Published city/place/editorial tour content, translations, normalized tags/durations/coordinates, source/revision metadata, approved media metadata and existing auth/commerce data models. |
| Curated files | Explicit import source/offline code mode, launch availability, brand illustrations and canonical legacy images/audio. No claims of live hours/weather/events. |
| Client calculation | Personalized route selection from the selected city's eligible published DTOs; walking distances/times are estimates. |
| Browser storage | Saved walks in localStorage; active journey in sessionStorage; local preferences/feedback. No backend saved-trip model was added. |
| Existing external services | MapLibre/OpenFreeMap, optional Groq/Upstash guide, S3 media, Stripe and PostHog; no new external API. |

The local catalog was bootstrapped with the existing seed + CMS import: Lübeck has 25 places, 175 authored place localizations and one five-stop editorial tour. The city-content integration suite also imports existing curated Hamburg content (19 places); it remains coming soon and is excluded from public active flow. Post-test catalog verification: two cities, 44 places; public city index: Lübeck only.

## Validation — 2026-09-24

| Check | Result |
| --- | --- |
| Full unit/component suite | **797 passed**, 22 opt-in integration tests skipped (136 files passed, five integration files skipped). Final command: `npm run test:run -- --maxWorkers=2`. |
| CMS PostgreSQL integration | **5 passed**, including archive/restore of one canonical place, continued visibility of 24 published places and route IDs drawn only from those eligible records. |
| City-content PostgreSQL integration | **6 passed**, including generic city import/publication and coming-soon exclusion. |
| TypeScript | `npx tsc --noEmit` passed after framework type generation during build. |
| Lint | Passed. |
| Production build | Passed using actual local database/auth configuration; module import no longer eagerly initializes auth. Missing optional Upstash config produces existing warnings. |
| Drizzle | `db:generate`: no schema changes. `db:migrate`, seed, explicit CMS import and `db:verify` passed on local Docker PostgreSQL. |
| Diff/secrets | `git diff --check` passed; `.env.local` is ignored; no lockfile/dependency churn. No commit/push. |

An earlier parallel full run hit the existing five-second TourStopEditor test timeout; it passed alone and the final full run passed with two workers. The CMS repeated-import test now has a scoped 30-second timeout. A repeat run caught incomplete cleanup in the new archive regression; it now changes/restores only publication state, deliberately retains the live revision to test archive filtering, and the affected local test record was restored. The final CMS rerun and catalog verification passed. Unaffected media/commerce/knowledge opt-in DB suites were not run; their skipped tests are not reported as passes.

Browser acceptance used the **production build** at localhost:3000 with `CITYWALK_CONTENT_SOURCE=database`, no mocked API responses:

- Home → Lübeck → Explore lists 25 published places. Coming-soon cities remain inactive.
- Anonymous Holstentor detail renders image, authored story, verified source link, audio action and Add to my walk.
- Add to my walk preselects Holstentor. A two-hour architecture walk yields five real stops (118 min, estimated 890 m), then Save → Start → Mark visited → Finish works.
- Saved screen retains the five-stop walk after navigation. Completion shows the visited highlight.
- German Home, English detail/journey and Arabic RTL detail render. Arabic correctly shows unavailable audio rather than playing English audio.
- API checks: city index and published place return 200; missing place and coming-soon Hamburg return 404; anonymous auth session returns null; private media access remains denied (404 concealment).
- No framework error overlay was seen; the browser error collection returned no JavaScript errors for the checked flow.

Screenshots: [Home](home.png), [Place](place.png), [Preview](preview.png), [Active trip](active.png), [Finish](finished.png), [Arabic detail](ar-place.png).

## Remaining acceptance

- The existing OpenFreeMap style endpoint returned **HTTP 403 in this environment**; active-trip controls/markers render but base-map tiles did not. Verify map rendering with normal provider access on Preview. No provider replacement or fabricated map was introduced.
- Live AI responses/rate limits, paid checkout/webhooks and managed S3 media were not exercised: their credentials/infrastructure were not provided. Core discovery and deterministic route building work without them. Audio action/locale availability was checked, not audible playback quality.
- Actual Preview/production database, auth secret/origin and optional service configuration still need deployment-specific acceptance. The local result does not certify production infrastructure.
