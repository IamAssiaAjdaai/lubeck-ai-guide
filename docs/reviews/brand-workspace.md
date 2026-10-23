# Sprint 03 — internal Brand Workspace acceptance

Base: develop bd56e2b, including merged #362. CITYWALK remains Customer #001;
extract the independent app/auth/database before external paying customers.
Mobile Core/iOS/Android: not applicable. Public Web: not applicable.
Admin Web: implemented; responsive local browser acceptance below.

## Routes and ownership

- `/admin/marketing/brands`: 20 project summaries per page with an opaque UUID
  cursor and no counts/metadata for inaccessible projects. Marketing navigation
  and the existing Marketing page link here.
- `/admin/marketing/brands/new`: German-first guided business brief form; an
  existing authorized campaign must be explicitly selected. No campaign, business
  fact, confirmation or strategy is invented.
- `/admin/marketing/brands/[projectId]/[contextId]`: structured context, provenance,
  proposed/confirmed facts, hypotheses, gaps, campaign associations, retained city
  scopes, correction and the most recent 20 chronological audit summaries.

All pages are dynamic, staff-only, non-indexable. Narrow Server Actions reauthenticate
and delegate unknown input to existing strict service validation. Browser IDs and
expectedRevision select records and guard concurrency; they never authorize access.
Reviewer identity/time remain server-derived. No purge action is exported to UI.
Mutation responses carry only success/IDs/revision or sanitized error codes and
German field groups. No source URLs/claim text/database errors are reflected in errors.

The listing filters every retained city scope in SQL BEFORE private JSON/identity
is selected. It locks real membership and scope rows, then locks each candidate
project and rechecks all-city access before validating its current JSON. Cursor
input cannot grant scope. The workspace similarly locks/authorizes the whole project
and projects only needed history summaries, with opaque reviewer tokens and exact
confirmed statements/time. No account name/email is resolved for reviewers. The
Admin shell still shows only the currently signed-in staff member's own identity.

Association requires manage rights across old scopes and the target campaign city.
Scope accumulation, campaign unlinking and explicit admin-only project erasure are
unchanged from Sprint 02; there is no scope narrowing or project purge UI.

Core and migrations 0024/0025 are byte-identical to develop. No public/private
DTO boundary is replaced. Existing CMS QA, publication and generation behavior are
unchanged. No AI/research/provider request, automatic generation or publishing.

## UX and concurrency

Forms use native labels/fieldsets, visible focus styles and existing Admin cards/
buttons; optional collections use add/remove controls. Source-backed proposals
require external provenance under existing Core validation. Linked source removal
is blocked until references are explicitly removed. No URL is fetched. URLs open
only validated http(s) addresses in a new tab without a referrer.

Review requires selection PLUS an explicit human acknowledgement. Selections reset
on revision changes. Corrections explicitly reset current confirmations and preserve
history. Mutation pending states disable controls. Validation/conflict messages focus
an alert; unsaved corrections remain available. STALE_REVISION never refreshes or
retries silently: staff can copy their changes, explicitly reload, then review and
submit against the new revision. An ambiguous network failure asks staff to inspect
current state before retrying, avoiding blind duplicate mutations.

The browser smoke found a real 375px overflow caused by the Admin shell's implicit
grid sizing. An explicit single-column grid and shrinking cards/fieldsets fix it;
assertions remain strict. Streamed pages are awaited before browser assertions.

## Actual local acceptance

All SQL used new disposable localhost database `citywalk_brand_ui_20261013` with
current committed migrations. No existing Preview database or production data was
accessed. The user's unrelated nested checkout and running server were left alone;
full gates ran from a clean temporary tracked-code copy.

Real headless Chrome/Playwright completed:

1. CITYWALK brief onboarding through the form and existing campaign.
2. Proposed fact persisted with no confirmation; explicit human confirmation
   committed revision 2 and rendered its provenance/opaque reviewer.
3. Two real tabs loaded revision 2. One corrected to revision 3 and reset approval;
   the other received STALE_REVISION and retained unsaved input without retrying.
4. Explicit reload showed current state; another existing-city campaign was linked.
5. Staff with only one of the two retained city scopes could neither list the
   shared identity nor read facts/history/campaigns through a direct URL.
6. An unrelated fictional Nordlicht Metallbau GmbH was onboarded through the same UI.
7. 375px and 1440px smoke, native control labels, keyboard focus, no horizontal
   overflow and no browser page errors. This is not WCAG certification or device/
   screen-reader acceptance.

Reproducible opt-in script: `scripts/brand-workspace-smoke.mjs`. It refuses non-local
hosts and database names outside `citywalk_brand_ui_*`; never loads env files or
migrates. Supply explicit DATABASE_URL, BRAND_SMOKE_URL, disposable BETTER_AUTH_SECRET,
and installed Playwright (or CITYWALK_PLAYWRIGHT_MODULE). PLAYWRIGHT_CHANNEL=chrome
uses installed Chrome. It creates synthetic city/campaign/staff/session fixtures,
signs only local ephemeral session cookies, and cleans fixture projects through
supported erasure. Screenshot output defaults to /tmp/brand-workspace-screenshots.

Local full tests and coverage each passed **1,402 tests**, with 135 integration/
environment tests skipped in the default run (247 files: 228 passed, 19 skipped).
The configured existing coverage target remains 100%, not whole-repository coverage.
Brand PostgreSQL integration passed **17 tests**; committed migration upgrade/
transactional rollback passed **1**. Existing CMS/QA/generation **23**, lifecycle
**25**, city **6**, media **7**, commerce **13**, and rate-limit checks passed.
Lint: zero errors/eight existing warnings. Both typechecks, build and database
verification passed; schema generation reported no drift. Final GitHub CI results
are recorded on the Draft PR head in its description.
UI/action tests cover no invented input, explicit confirmation, conflict preservation,
field validation/conversion, reauthorization and sanitized errors. PostgreSQL tests
cover bounded cursor pagination, all-city listing/workspace denial, access revocation,
existing concurrency/audit rollback/history/campaign deletion and erasure regressions.

## Screenshots (synthetic local data)

![Onboarding, desktop](brand-workspace/onboarding-desktop.png)
![Confirmed context, desktop](brand-workspace/review-desktop.png)
![Two-tab stale correction](brand-workspace/stale-desktop.png)
![Context, 375px](brand-workspace/review-mobile.png)
![Onboarding, 375px](brand-workspace/onboarding-mobile.png)

## Preview prerequisite and limitations

The release owner supplied persistent Preview verification on 2026-10-15:
Neon project `blue-king-95814774`, branch `br-orange-term-b9tomkyo`, database
`neondb`, PostgreSQL 16.15; migrations 0000–0026 applied; 0025 SHA256 matches
committed SQL; seven tables, six constraints and eight triggers verified; obsolete
campaign deletion trigger absent. This is owner-provided evidence, not a fresh
remote inspection by this release run. No Neon connection or migration was run.
Manual deployed Preview acceptance remains separate from local browser acceptance.

### Develop synchronization acceptance (2026-10-15)

Merged develop `7b78a96fa2ae274f7710a0ba3f873e3fa35bdf7e` without conflicts.
Brand Workspace remains intact; latest Cloudflare configuration, mobile fixes and
CITYWALK changes are inherited unchanged. SQL 0025 and 0026 are byte-identical to
develop (SHA256 respectively `2f07f24fe4cc9c31acdd29263a3b4bddb516e85e9be800215d9c2d6f9de5a0ff`
and `26bc7c72ae589da9bf49d82cc84903c70d3991fc2ac4072ac0c14c0fc72bae8f`).

Develop lacked a Drizzle snapshot for handwritten migration 0026. Generation
initially proposed a duplicate shared_walk_links table. Added only missing
`drizzle/meta/0026_snapshot.json`; its sole table difference from 0025's snapshot
is shared_walk_links. Discarded the generated duplicate SQL/journal entry before
successful fresh local migration. Committed SQL and journal remain unchanged.
This metadata does not execute against or alter an already migrated database.

- Full unit and coverage: each **1,455 passed, 135 skipped**; 234 passing files.
  Existing configured coverage target remains 100%; not repository-wide coverage.
- Lint: zero errors, eight existing warnings. Application, standalone Core and
  Cloudflare typechecks passed. Next build, vinext build and Cloudflare build/
  binding checks passed.
- Local 0024 and 0025 committed-SQL upgrade/transactional rollback: one test each
  passed. Fresh 0000–0026 migration, seed, CMS import and db:verify passed.
- PostgreSQL: Brand Context 17, CMS/generation 23, city 6, media 7, commerce 13,
  lifecycle 25, verified knowledge 1 tests passed; atomic rate-limit checks passed.
- Schema generation after metadata repair: no changes. No constraint or trigger
  was disabled or weakened.
- Real Chrome acceptance passed both businesses, explicit confirmation, correction,
  stale two-tab writes, association, cross-city authorization, labels/focus and
  375px/1440px overflow. Fresh synthetic screenshots were inspected locally.
- Mobile: first run 772 passed/one timing-sensitive Apple-to-Google sign-in test
  failed; unchanged full rerun **773 passed**. Lint, types, config and Expo Doctor
  passed. No mobile file differs from develop; preserve this flake as a remaining
  test reliability risk, without weakening assertions.

All database validation used newly created disposable localhost databases. No
production access, deployment or merge; original workspace `.env` and `.env.example`
hashes remain unchanged. The merge inherits develop's tracked example changes;
there is no PR diff to `.env.example` against develop.

The UI is internal and JavaScript-dependent; no public intake/external tenancy.
History is bounded to the last 20 summaries, with older durable records preserved;
there is no history export/search, autosave, merge editor or abandoned-project TTL.
The Core's automatically generated open questions remain English, while controls
and statuses are German. Sources are declared references, not independently verified
facts. Pseudonymous tokens, brief text and source URLs can still be personal data;
existing retention/backup-erasure policy and private server database permissions
remain necessary. Source-link navigation and screen-reader/device acceptance require
human review. Association-change receipts and scope narrowing remain deferred.

Core may add automatic gap questions beyond the raw-input maximum of 40. Correction
shows every existing question and explicitly asks staff to reduce the count before
saving; no question is silently dropped. A regression test protects this boundary.
