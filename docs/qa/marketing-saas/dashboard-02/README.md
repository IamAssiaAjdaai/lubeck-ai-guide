# MKT-DASHBOARD-02 — product UI acceptance

Local implementation only, 2026-10-24. Branch `codex/mkt-dashboard-01`.
Parent preserved: `a06d9772ef7725413753d37f399d3dbb01f7a53a`.
Fetched develop: `72c87245bbb2f0332feb7fe261cee5668ca06b7e`.
GitHub confirmed [#425](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/425)
merged at that develop revision. No assumption about an older develop head.

## Screen architecture and capability boundaries

[ARCHITECTURE.md](ARCHITECTURE.md) records the audit, screen-by-screen architecture,
implemented-vs-planned matrix, navigation placement and data boundaries.

- Overview: real session welcome/selected company, a compact contextual next action,
  three saved post previews and exact Pack version/review state before supporting
  readiness/count panels. The saved seven-day action plan is explicitly a Pack plan,
  not a generated enterprise strategy or scheduling calendar.
- Recent work/library: company/campaign groups, actual goal/channel/version/date,
  preparation drafts retained alongside packs, current-version approval badges.
  A newer pending Pack can take next-action priority over an older preparation draft;
  a newer saved preparation still takes priority. Drafts are never silently consumed.
- Thumbnails: only a valid current review referencing an approved source asset permits
  a preview, placed on that exact post. Unrelated sources, old/invalid reviews,
  pending/deleted/erased media and generated-job references do not become thumbnails.
  Missing/failed images fall back to readable text. Source GET authorization/hash
  integrity and export revalidation remain the existing server responsibilities.
- Editor: readable post/platform cards, current vs historical version, explicit demo
  provenance for provider `demo`/`mock`, unchanged dirty/version/image safeguards,
  per-post consent and clear text/campaign download readiness. Existing manual export,
  optional images, keyboard post tabs, history and sources are preserved.
- Marke & Wissen: profile/facts and Brand Kit have separate working sections. Desktop
  profile and facts align side by side, with the continuation action after both in
  DOM and visual order. Inputs and provenance/confirmation logic are reused.
- Medien: separate finite authenticated view reuses the existing private Media Library.
  Upload, metadata, rights, source approval and deletion remain actual controls.
  Desktop places the asset beside its metadata. Individual deletion is in Media;
  project-wide Creative erasure remains under Brand Kit's privacy disclosure.
  Creative Studio stays inside the saved post, where image and text are reviewed together.
- Settings: compact actual quota/budget/uncertain-cost information and honest access/
  price-hypothesis disclosures. Failed usage reads show an error rather than invented
  quota. There is no purchasable subscription or checkout.
- Active navigation names only working views. Strategy, calendar, video/reels/stories
  remain explicitly planned with no fake links, player, calendar entries or output.
  The temporary configurable product identity is retained; this does not finalize naming.

## Changed boundaries

Application: `PilotApp.tsx`, `WorkspaceOverview.tsx`, `overview.data.ts`,
`ContentLibrary.tsx`, `PackWorkspace.tsx`, `CreativeStudio.tsx`, `routes.ts`, `studio.css`.
Tests: updated `overview.test.tsx`, new `studio.test.tsx` and `studio.states.test.tsx`.
Browser harnesses: canonical authenticated/closed scripts plus new
`marketing-studio-browser.mjs`. Exact paths: [FILES.txt](FILES.txt).

No API/server, database schema/migration, package/dependency, authentication,
public D2 landing, billing, provider or CITYWALK changes. `media` is one additional
finite frontend view reusing the same private API, not a new server or data system.
All new CSS is scoped to `.simple-workspace` and reuses Manrope/Forest/Sage tokens.

## Verification — local, offline

| Gate | Actual result |
| --- | --- |
| Full repository unit suite | 1,701 passed; 0 failed; 239 skipped |
| Canonical Marketing unit/security suite | 230 passed; 0 failed; 87 skipped |
| Isolated Marketing PostgreSQL/security suites | 118 passed; 0 failed; 0 skipped |
| Authenticated customer journey | 596 checks passed |
| Closed registration/protected routes, including media | 30 checks passed |
| Unchanged D2 fictional demo | 271 checks passed |
| Focused Studio viewport/state/keyboard/motion checks | See `after/fixtures/RESULTS.json` |
| UI/API/Core TypeScript and Marketing build | PASS |
| Marketing lint | 0 errors; 4 native-image optimization advisories |
| Browser/test harness lint | PASS |
| Existing migrations/idempotency/integrity | PASS, disposable local PostgreSQL only |
| Whitespace / scoped diff | PASS |

Three image advisories existed before this task; the new one is the native private
thumbnail in the independent Vite app. No Next image service or dependency was added.
Unit totals overlap subsystem totals. The nine new tests account for the increase
from 1,692 to 1,701 full-suite tests and from 221 to 230 Marketing unit tests.
The baseline browser run had 427 checks after adding five-width coverage; final
596 includes additional media/brand/library states, bound thumbnails, mock labeling
and the dirty guard. Repeated viewport assertions are not new independent security
invariants. Dedicated DB suites exercise the existing auth/tenant, quota, hash,
stale review/source and export denials; the backend implementation is unchanged.

The actual journey covers company/manual facts, insufficiency before quota, saved
preparation, three-post editing, exact-version review/export, optional mock image,
Brand Kit/media upload and approval, source thumbnail attachment, usage and logout/
login persistence. Clicking the new Media destination during unsaved editing leaves
the route and text intact. Expired/invalid auth links and closed signup stay tested.

Local setup uses synthetic accounts and a local email sink in disposable databases.
The canonical runner strips provider keys, disables real AI/image/spend gates and
uses the outbound guard. Only local mock Creative is allowed. It respects the existing
61-second auth rate window rather than resetting security or unknown-charge ledgers.
No real provider requests, paid generation, external emails or customer data.

### Visual and accessibility evidence

All active journey states were captured and checked at 1440, 1024, 768, 390 and 375px.
Selected screenshots from those actual Better Auth/API/PostgreSQL journeys are in
`before/` and `after/`. Overview/editor/library preserve all five widths; other
screens include desktop/mobile selections. `ACCESSIBILITY.json` in each folder
records every scanned state/width, zero violations and incomplete/manual categories.
Full raw screenshots remain in the isolated temporary QA evidence directories;
raw exports, sessions, login files and mail are excluded from this commit.

| Surface | Before desktop / mobile | After desktop / mobile |
| --- | --- | --- |
| Overview | [1440](before/overview-1440.png) / [390](before/overview-390.png) | [1440](after/overview-1440.png) / [390](after/overview-390.png) |
| Editor | [1440](before/editor-1440.png) / [390](before/editor-390.png) | [1440](after/editor-1440.png) / [390](after/editor-390.png) |
| Library | [1440](before/library-1440.png) / [390](before/library-390.png) | [1440](after/library-1440.png) / [390](after/library-390.png) |
| Profile/facts | [1440](before/profile-1440.png) / [390](before/profile-390.png) | [1440](after/profile-1440.png) / [390](after/profile-390.png) |
| Brand Kit | [combined 1440](before/brand-media-1440.png) / [390](before/brand-media-390.png) | [1440](after/brand-kit-1440.png) / [390](after/brand-kit-390.png) |
| Media | [combined 1440](before/brand-media-1440.png) / [390](before/brand-media-390.png) | [1440](after/media-1440.png) / [390](after/media-390.png) |
| Settings | [1440](before/settings-1440.png) / [390](before/settings-390.png) | [1440](after/settings-1440.png) / [390](after/settings-390.png) |

The QA source image is an explicitly synthetic geometric test asset approved through
the real Media workflow, not real customer photography or AI output. Editor mock PNGs
retain their burned-in `MOCK – OHNE KI GENERIERT` label. The separate focused browser
report uses intercepted synthetic API responses and does not prove authentication.

Native buttons/disclosures, focus visibility, post-tab arrow keys, Enter navigation,
>=44px mobile targets, overflow, five-width type sizes and reduced motion are checked.
Computed font auditing found inherited 12px/8px identity text and corrected it to
14px/13px. The editor now stacks below 1100px; the old 1000px geometry assertion was
updated to the intentional readable layout. Profile card ordering and media spacing
were corrected after actual screenshot inspection. Automated accessibility success
is not full WCAG certification, screen-reader acceptance or a measured usability gain.

## Reproduction

```sh
node --import ./scripts/marketing-creative-offline-guard.mjs node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc --noEmit -p apps/marketing-saas/tsconfig.json
node node_modules/typescript/bin/tsc --noEmit -p apps/marketing-saas-api/tsconfig.json
node node_modules/typescript/bin/tsc --noEmit -p packages/marketing-core/tsconfig.json
node node_modules/eslint/bin/eslint.js apps/marketing-saas/src scripts/marketing-studio-browser.mjs scripts/marketing-consolidate-browser.mjs scripts/marketing-consolidate-closed-browser.mjs
node node_modules/vite/bin/vite.js build --config apps/marketing-saas/vite.config.ts
```

Full canonical gate: supply private operator configuration for a **new local**
`marketing_*` QA database on 127.0.0.1 with an explicit non-5432 port and unused
MARKETING_ORIGIN/API ports; place evidence/private output outside Git; run
`node scripts/marketing-consolidate-ci.mjs`. Never use production infrastructure or
clear uncertain holds. Standalone synthetic UI checks: start the existing Vite app,
then run `MARKETING_BROWSER_ORIGIN=http://127.0.0.1:<port> node scripts/marketing-studio-browser.mjs`.
Before captures are preserved baseline evidence, not regenerated by current code.

## Preservation and remaining acceptance

117 protected Human Review files and 321 held files reverified by SHA-256 in
[PRESERVATION.json](PRESERVATION.json). No coordinator key, reviewer identity,
independent scorecard, credential, session or raw export is in this QA package.
The Dashboard-01 commit/evidence and other worktrees remain intact. No reset, stash,
branch deletion or history rewrite. Working changes are limited to this worktree.

- Owner visual/usability and real-device/screen-reader acceptance remain manual.
- History still loads at most 100 jobs/project; review badges are load-time snapshots.
  Server-side exact-version export validation remains authoritative after later edits.
- No Strategy Engine, Calendar, Reel/Story/video renderer, real image model or social
  scheduling was implemented. This is a working first-stage product UI, not proof
  of strategy/copy quality or commercial availability.
- Creative controls remain local QA and default-off when capabilities are disabled;
  the unavailable state is explicit. Production/public access stays closed.
- No shared CITYWALK/DB schema changes; host build and Drizzle schema generation are
  outside this isolated frontend task. Existing Marketing migrations were tested locally.

Ready for owner review as a local commit only. No push, PR, merge or deployment.
