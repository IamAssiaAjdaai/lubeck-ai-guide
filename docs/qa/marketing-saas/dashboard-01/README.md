# MKT-DASHBOARD-01 — local acceptance

Date: 2026-10-24. Branch: `codex/mkt-dashboard-01`.
Verified fetched develop: `72c87245bbb2f0332feb7fe261cee5668ca06b7e`.
GitHub #425 is merged; its merge commit is that develop HEAD and its head
`c48bf732213dd4f4fbbe737c9e329deea1678982` is an ancestor. No older SHA was assumed.
Independent Marketing Public Web/authenticated web only; CITYWALK Mobile Core,
Public Web and Admin changes are not applicable. No push, PR, merge or deployment.

## Audit and implementation

- `WorkspaceOverview.tsx` previously hid a saved draft whenever a newer generation
  existed, showed only one recent row, used generation creation time as edit time,
  and inferred pending review directly from `completed`.
- `packs.ts:65–93` provides project-authorized lists capped at 100 jobs and immutable
  versions with their own creation timestamps. It exposes no export event count.
- `workspace.ts` scopes drafts to project + authenticated user (30-day retention),
  and verifies current version, context revision and image binding in `reviews()`.
  Generation completion is not editorial approval. `readiness()` assesses approved
  facts with the existing conservative sufficiency rules. These contracts are unchanged.
- New `overview.data.ts` performs only existing authorized GETs. Project reads and
  subsequent pack reads use bounded concurrency (four workers per phase). Current
  version timestamps determine ordering. A saved draft is always a separate entry,
  regardless of newer generations. Review labels count three unique post positions
  approved for the exact current version by the server. Missing/old approvals fail
  closed; incomplete reads show an error with retry instead of fabricated zero KPIs.
- One next action for the selected project: create company → add information if no
  context/facts → confirm proposed facts → resolve the actual sufficiency questions
  or specialist/source blockers → resume saved draft → review saved content → create.
  Optional city, voice and photos do not become invented admission requirements.
- Two KPIs: current user's saved campaign-preparation drafts and completed packs in
  the loaded authorized history. The 100-job-per-project bound is disclosed when hit.
  No export/approval/engagement totals, progress percentages or billing are invented.
  Review is explained on individual rows; no extra review-total KPI was added.
- Three recent rows on Overview; all loaded rows in Meine Inhalte. Each shows company,
  goal/channel, actual status, date and exact resume identity. Failed/running/unclear
  jobs have no editable output and do not offer a broken resume or automatic retry.
- Existing callbacks, dirty navigation protection and company selection are retained.
  A small profile callback opens the selected project's actual existing profile.
- Forest palette, original shell/navigation and heading remain. Sidebar/buttons are
  14px, body 16px, secondary text 13–14px, mobile navigation 13px with >=44px targets.
  No new dependencies, backend changes, schemas, migrations, Calendar, social
  integrations, provider configuration, landing or naming changes.

## Evidence and results

See `TEST-RESULTS.json` and `CI-SUMMARY.json` for machine-readable results.

| Gate | Actual result |
| --- | --- |
| Full offline repository unit suite | 1,692 passed; 0 failed; 239 skipped |
| New Overview contract/React regressions (included above) | 9 passed |
| Canonical Marketing unit/security gate | 221 passed; 0 failed; 87 skipped |
| Isolated Marketing PostgreSQL suites | 118 passed; 0 failed; 0 skipped |
| Complete authenticated browser journey | 327 checks passed |
| Closed registration/protected routes | 25 checks passed |
| Unauthenticated fictional D2 demo | 271 checks passed |
| Focused Overview browser/keyboard/state checks | 74 checks passed |
| UI/API/Core TypeScript; Marketing Vite build | PASS |
| Marketing lint | 0 errors; 3 existing image advisories |
| Changed source/harness lint | PASS, no warnings |
| Existing migrations, repeated migration, database integrity | PASS in disposable local QA databases |
| Diff whitespace validation | PASS |

Test totals overlap; do not sum them as unique tests. Full-suite 239 skips are not
claimed as integration successes; the dedicated 118 database tests ran separately.
The canonical browser journey covers onboarding, confirmed facts, saved drafts,
Pack generation with mocks, versioned editing, dirty-state guards, Brand Kit/media,
review, attachment, export and auth. Database tests include cross-tenant denials,
quotas, stale bindings and authorization. No new authorization logic was introduced.

The isolated QA runner strips provider keys, disables real AI/image transport and
spend approval, uses the existing outbound guard and creates separate synthetic
PostgreSQL databases on loopback. Local registration was enabled only during the
existing disposable setup stage, then the server restarted closed and server-side
registration denial was verified. Product defaults remain closed.

### Visual evidence

- `before/overview-{1440,1024,768,390,375}.png` vs
  `after/overview-{1440,1024,768,390,375}.png`: actual rendered application with the
  **same synthetic intercepted API scenario**. The old draft intentionally predates
  the pack. These captures demonstrate the UI, not authentication or AI output.
- `after/viewport-*.png`: viewport views; full-page screenshots place the fixed
  mobile nav at the capture viewport edge, not the bottom of the entire document.
- `authenticated/overview-{1440,768,390,375}.png`: real Better Auth session and
  persisted synthetic data from the full local API/PostgreSQL customer journey.
- `after/axe-*.json`: zero tested WCAG-tag violations at all five widths; incomplete
  categories are recorded. Keyboard focus/order, Enter navigation, selected-project
  context, stale reviews, API failure/retry, empty state, text sizing and overflow
  were exercised. Native control semantics are retained.

Inspection found an invalid definition-list child during iteration; it was fixed
before the final axe pass. The first CI startup collided with an existing local
port; that service was preserved and the successful run used unused loopback ports.

### Reproduction

From this worktree with installed dependencies:

```sh
node --import ./scripts/marketing-creative-offline-guard.mjs node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc --noEmit -p apps/marketing-saas/tsconfig.json
node node_modules/typescript/bin/tsc --noEmit -p apps/marketing-saas-api/tsconfig.json
node node_modules/typescript/bin/tsc --noEmit -p packages/marketing-core/tsconfig.json
node node_modules/eslint/bin/eslint.js apps/marketing-saas/src scripts/marketing-dashboard-browser.mjs scripts/marketing-consolidate-browser.mjs
node node_modules/vite/bin/vite.js build --config apps/marketing-saas/vite.config.ts
```

For the complete canonical gate, supply operator-owned ephemeral local QA database
configuration outside Git, using a fresh `marketing_*` database on `127.0.0.1` with
an explicit non-5432 port and unused `MARKETING_ORIGIN` / `MARKETING_API_PORT`.
Set evidence/private directories outside the repository, then run
`node scripts/marketing-consolidate-ci.mjs`. It creates a second isolated browser
DB; never reuse production databases or clear cost holds. No credentials are in this
report. For the focused visual test start the Vite app on loopback and run
`MARKETING_BROWSER_ORIGIN=http://127.0.0.1:<port> node scripts/marketing-dashboard-browser.mjs`.
Before images are preserved evidence from the fetched base, not regenerated by the
current source. The baseline hook and current hook use the same fixture scenario.

## Preservation and limits

`PRESERVATION.json` verifies all 117 protected research files and 321 held files by
SHA-256; private mappings, reviewer identities, scorecards and coordinator keys
are not copied here. Existing worktrees and user changes are preserved. `FILES.txt`
is the exact scoped commit inventory. No CITYWALK application source changed.

- Counts are authorized loaded-history snapshots, not lifetime analytics. Reviews
  are checked when Overview loads; later changes require a reload. Actual review
  and export continue to revalidate server-side at the time of the action.
- Existing saved preparation drafts remain even after generating a pack. They are
  deliberately separate; do not silently infer that the draft was consumed.
- More than 100 jobs/project requires a separately scoped aggregate/pagination API.
  Reading immutable versions/current reviews is bounded but still costs extra GETs.
- Real-device Safari/Android and screen-reader acceptance remain manual. Automated
  axe results are not a full accessibility certification or measured usability study.
- No live-model quality, human editorial quality, paid-pilot or commercial-release
  readiness is established. All synthetic mocks retain their existing disclosures.
- Host build/Drizzle schema generation/migrations are not applicable to this isolated
  frontend change; no shared CITYWALK code or database schema was modified.

Ready for local owner visual/functional review. No push or PR is authorized here.
