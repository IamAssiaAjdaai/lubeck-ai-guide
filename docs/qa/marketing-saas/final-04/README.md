# WIRKFADEN-DESIGN-FINAL-04 — local owner acceptance

## Result and scope

**PASS: local preview corrected; two requested presentation fixes implemented and verified.** No new commit, staging, push, PR, merge, deployment, database setup/migration or provider activation. HEAD remains `80a212c2dbcf6850ad347e0da9c5f2a16771b695` on `codex/mkt-dashboard-01`; these narrowly scoped changes are uncommitted. The approved dashboard layout, typography hierarchy, palette and composition remain locked. Complete product Design Freeze is NOT declared.

**Working preview: http://127.0.0.1:3208/workspace**

The browser now receives Vite source from `/private/tmp/mkt-dashboard-01`. Frontend PID `96192`, API PID `96191`, preview runner PID `96178`; both listeners are IPv4 loopback only. The source includes the existing Fraunces hero, pastel cards, direction/action-plan row and three actual saved content previews.

## Preview diagnosis and repair

Port 3208 previously belonged to Vite PID `42402`, managed with Marketing API 3209 by runner `42400`. Its working directory was the separate consolidation checkout, not the requested dashboard checkout. At inspection that checkout was on `feat/admin-auth-0027-migration-20261024`, HEAD `19abfcbbd10bdc683bca3713187cbe19b4cffc12`. This was a source/worktree mismatch, not a reason to alter application code or clear the database.

The identified Marketing runner was stopped gracefully, then the existing environment was recovered privately and the Marketing frontend/API restarted from the dashboard checkout. No unrelated process, branch or worktree was stopped/deleted. No CITYWALK source was modified. API origin remains `http://127.0.0.1:3209`; database host/port/name remain isolated `127.0.0.1:55508 / marketing_consolidate_01`. Existing auth configuration, media directories, closed registration and disabled live-provider/spend gates were preserved. No credentials are in this report, source changes or screenshots.

Source changes below implement the separately requested visual fixes; none were needed merely to route the preview correctly.

## Fix 1 — context-safe hero

- Removed the workspace's automatic D2 florist fallback. Public D2 sources and photography are unchanged.
- Existing exact-version reviewed asset selection is retained. A hero photograph additionally requires role `business_photo` and a private asset URL bound to the selected project. Logos, unknown roles, other-project URLs and external/public photo URLs are rejected for the hero.
- A hand-authored brand SVG fills the existing approved frame when no eligible photo exists. Caption: **“Markenillustration · kein Unternehmensfoto”**. It represents paper/content, not staff, premises, customer work or AI generation.
- Failed/deleted/denied source reads switch to the illustration with **“Bild nicht verfügbar · Markenillustration”**. The failed URL is not retried automatically; a different eligible source can load normally.
- Private source endpoints remain the authorization/hash/approval enforcement boundary. The client policy does not grant access, certify subject relevance or replace human source approval. The owner-assigned business-photo role and existing bound review are required; no semantic image classifier was added.

## Fix 2 — mobile navigation

At 375/390px labels are 14px Manrope, medium/semibold, with six unchanged destinations. Full accessible names identify each destination; visible short labels and current-page state remain. Buttons are at least 60px tall and exceed 44px width. Navigation height includes `env(safe-area-inset-bottom)`; content bottom clearance is `124px + env(safe-area-inset-bottom)`.

Keyboard activation of all six destinations passed at both narrow widths. Actual editor review/text-export/campaign-export buttons can scroll above the fixed navigation at both widths. No callback, dirty-state guard, route authorization or export review contract changed.

## Evidence and checks

Exact implementation/test/harness changes:

- `apps/marketing-saas/src/PilotApp.tsx`
- `apps/marketing-saas/src/WorkspaceHeroVisual.tsx`
- `apps/marketing-saas/src/WorkspaceOverview.tsx`
- `apps/marketing-saas/src/hero-visual.test.tsx`
- `apps/marketing-saas/src/reference.css`
- `apps/marketing-saas/src/reference.test.tsx`
- `scripts/marketing-studio-browser.mjs`

The remaining inventory entries are new, scoped screenshots and QA evidence; historical evidence is unchanged.

See [TEST-RESULTS.json](TEST-RESULTS.json), [ACCESS-CHECK.json](ACCESS-CHECK.json), [PRESERVATION.json](PRESERVATION.json) and [FILES.txt](FILES.txt).

- Focused hero, selected-project overview, exact review and thumbnail tests: **28 passed**.
- Entire Marketing frontend unit suite: **87 passed / 0 failed / 0 skipped**. The focused 28 are a subset, not additional unique tests.
- Offline browser checks: **173 passed**, five widths. Includes normal/no-image, approved-source, denied-source, empty, API error/retry, stale review, project change and mobile keyboard navigation.
- Automated axe: **0 violations** in **20 fixture state/viewport pairs** and **40 actual authenticated screen/viewport pairs**. Incomplete/manual categories are retained in JSON.
- Marketing UI TypeScript: PASS. Marketing build: PASS. Lint: 0 errors, five native-image advisory warnings; focused browser-harness lint PASS with the hero image advisory.
- Actual existing private asset: anonymous request **401**; wrong/nonexistent project path **404**. Cross-project hero rendering is denied by unit and fixture tests. No second-tenant DB fixture was created; this is not a new database-backed cross-tenant integration run.
- Actual capture used existing synthetic persisted data and an existing local session, with every external and non-GET/HEAD API request blocked: **0 attempted external or mutating API requests**. No generation, editing save, review approval, upload, seed, migration or database reconfiguration was performed by this QA.
- **117 protected Human Review files and 321 held files unchanged.** Previous evidence and independent results remain unchanged. D2, backend/API, auth, database contracts, CITYWALK and provider settings have no source diff.

### Before / after Overview

| Width | Before | After |
| --- | --- | --- |
| 1440 | [Before](before/overview-1440.png) | [After](after/overview-1440.png) |
| 1024 | [Before](before/overview-1024.png) | [After](after/overview-1024.png) |
| 768 | [Before](before/overview-768.png) | [After](after/overview-768.png) |
| 390 | [Before](before/overview-viewport-390.png) | [After](after/overview-viewport-390.png) |
| 375 | [Before](before/overview-viewport-375.png) | [After](after/overview-viewport-375.png) |

Before captures were taken on the correct port/worktree at the unchanged HEAD before the visual edits. Actual after captures are the running port-3208 application. `fixtures/` is explicitly intercepted synthetic API evidence; the approved-source fixture image is a hand-authored QA test graphic, not a customer photograph or AI result. It verifies selection/loading/failure behavior, not human approval of real business imagery.

## Remaining owner acceptance — active screens

The prior selected composition is approved. These final captures are evidence for review, not automatic approval:

| Actual screen | 1440 | 1024 | 768 | 390 | 375 |
| --- | --- | --- | --- | --- | --- |
| Content creation | [1440](after/creation-1440.png) | [1024](after/creation-1024.png) | [768](after/creation-768.png) | [390](after/creation-390.png) | [375](after/creation-375.png) |
| Content Packs | [1440](after/packs-1440.png) | [1024](after/packs-1024.png) | [768](after/packs-768.png) | [390](after/packs-390.png) | [375](after/packs-375.png) |
| Editor / review / export | [1440](after/editor-1440.png) | [1024](after/editor-1024.png) | [768](after/editor-768.png) | [390](after/editor-390.png) | [375](after/editor-375.png) |
| Business / facts | [1440](after/knowledge-1440.png) | [1024](after/knowledge-1024.png) | [768](after/knowledge-768.png) | [390](after/knowledge-390.png) | [375](after/knowledge-375.png) |
| Brand Kit | [1440](after/brand-kit-1440.png) | [1024](after/brand-kit-1024.png) | [768](after/brand-kit-768.png) | [390](after/brand-kit-390.png) | [375](after/brand-kit-375.png) |
| Media | [1440](after/media-1440.png) | [1024](after/media-1024.png) | [768](after/media-768.png) | [390](after/media-390.png) | [375](after/media-375.png) |
| Settings | [1440](after/settings-1440.png) | [1024](after/settings-1024.png) | [768](after/settings-768.png) | [390](after/settings-390.png) | [375](after/settings-375.png) |

- [ ] Owner accepts the neutral hero and its approved-photo/failure states.
- [ ] Owner accepts mobile label readability and touch/scroll behavior.
- [ ] Owner accepts the remaining actual active screens above.
- [ ] Manual screen-reader and physical iOS/Android safe-area/keyboard checks are recorded separately.

Headless Chrome checks the zero-inset case, computed clearance and action bounds. Real notched-device safe-area behavior and assistive-technology acceptance remain unverified. No new paid-provider, commercial release or full product readiness claim is made.

## Local operation

Preview is left running. Existing private startup configuration stays outside Git, permission-restricted.

- Start (only if stopped and ports are free): `node /private/tmp/mkt-final04-private/preview.mjs`
- Stop this identified preview runner: `kill -TERM 96178`
- Runtime log: `/private/tmp/mkt-final04-private/preview.log`

PIDs are the observed processes at handoff, not permanent service identifiers. Re-identify port ownership before any later stop/restart. Do not print or distribute the private environment or session files.
