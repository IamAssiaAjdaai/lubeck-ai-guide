# WIRKFADEN-DESIGN-FINAL-06 — two P2 corrections

Recommendation: **GO for owner acceptance of the corrected candidate.** This report does not declare Design Freeze, owner acceptance, commercial readiness or live-provider readiness. See the [updated checklist](DESIGN-FREEZE-CHECKLIST.md).

## Baseline and scope

Worktree `/private/tmp/mkt-dashboard-01`, branch `codex/mkt-dashboard-01`, exact clean starting HEAD `8f078c03487f675138bc5a43bfa54b43f48a7686`. One additive local commit; earlier `a06d977`, `3f3a568`, `80a212c` and FINAL-05 preserved. Final commit SHA is returned in the handoff (`git rev-parse HEAD`). [Preflight](PREFLIGHT.json), [exact inventory](FILES.txt).

### AUTH-01 — resolved

Cause: the active Better Auth form inherited preview-era 11–13px rules, with a later global identity rule reducing the provisional notice to 9px. Scoped `.pilot-auth` CSS now uses 16px main copy/inputs/primary buttons, 14px supporting text, labels, validation and password toggle, 15px back link, 44px minimum interactive targets and 48px primary controls/inputs. Explicit focus outlines include a light outline on the dark story panel. Existing composition, palette and fonts are retained. The active identity-copy wrapper no longer inherits fixed glyph dimensions; tablet editorial type scales within the same panel to avoid clipping. No AuthForm logic, password policy, rate limits, server configuration or registration gate changed.

Real browser assertions check visible auth controls/supporting text and target heights at all five widths; a separate closed-preview keyboard journey checks Tab/Space/Enter, password show/hide, validation focus, recovery navigation, visible focus, identity separation and editorial text clipping. Reproduce it with `node scripts/marketing-auth-acceptance-browser.mjs` on the closed loopback preview. Main copy and fields are 16px. Some content extends vertically on smaller screens; the page remains scrollable without horizontal overflow.

### HISTORY-01 — resolved

Cause: the editor requested `/workspace/reviews/:generation?version=N` even when intentionally reading an old immutable version. The server correctly accepts only the current revision and returned `STALE_VERSION`; the frontend displayed that intentional navigation as a conflict. Returning to current did not remove the already-set generic error.

The frontend now calls current-only review reads only for the current saved version, including the explicit review-refresh helper. A prominent read-only notice above the post tabs explains that review/download require the current version. Version changes already clear local review/image/acknowledgement state; effect cleanup rejects late responses. Current-version errors are **not** suppressed or cleared: a genuine conflict still uses the existing error mapping and export remains unavailable. No API/schema/version-check/export-authorization changes.

New regression tests cover no historical review request, read-only fields/approval/export locks, restoration of current approval/export, ignored late failure after historical navigation, and genuine current-version conflict visibility. The authenticated browser verifies the actual persisted history, absence of historical review requests/errors, current approval restoration, dirty navigation protection, stale approval rejection and manual export. Unit failure injection is not represented as a real concurrent customer session.

## Evidence and verification

- [Before/after screenshots and inspection](SCREENSHOTS.md)
- [Exact test results and limitations](TEST-RESULTS.json)
- [Canonical local CI summary](CI-SUMMARY.json)
- [Closed-preview keyboard checks](AUTH-KEYBOARD.json)
- [Current design system](../final-05/DESIGN-SYSTEM-v1.md), [active screen inventory](../final-05/SCREEN-INVENTORY.md), [capability matrix](../final-05/CAPABILITY-MATRIX.md). These remain applicable; this report supersedes only the two open P2 statuses in FINAL-05.

Local canonical CI uses a fresh disposable database and ports 3398/3399. Temporary local test registration exists only during the isolated synthetic setup; closed-access checks run after restarting it closed without clearing rate-limit state. The owner preview remains `http://127.0.0.1:3208/workspace`, API 3209, existing isolated owner database unchanged, registration closed. No production DB operations or external email/provider requests.

No D2, Overview, Sidebar, Hero, card architecture, media, backend, database, dependencies, CITYWALK, provider or billing changes. All 117 protected and 321 held files remain hash-identical. Historical QA evidence is untouched; private sessions, mail, tokens, environment files and raw downloads are excluded.

## Manual limits and decision

No remaining material defect was observed in the affected tested journeys. Automated axe checks and keyboard testing are not full WCAG conformance or screen-reader acceptance. Physical iOS/Android safe areas, virtual keyboard and assistive technologies remain unverified. All previous planned/live-model/calendar/strategy/video limitations remain in force. Owner visual acceptance of the actual active screens remains required. No push, PR, merge, deployment or provider/billing activation is authorized or performed.

## Reproduction

- `node scripts/marketing-auth-acceptance-browser.mjs` (closed synthetic loopback preview; no email submission).
- `node --import ./scripts/marketing-creative-offline-guard.mjs node_modules/vitest/vitest.mjs run apps/marketing-saas/src/history-review.test.tsx apps/marketing-saas/src/auth`.
- `node scripts/marketing-consolidate-ci.mjs` with the canonical isolated local QA configuration; see the existing [CI runbook](../../../../scripts/marketing-consolidate-ci.mjs). Never substitute production connection strings.
- Full repository units ran through the same offline guard. Host Next.js and CITYWALK migrations/builds are not applicable because no host/shared/schema code changed.
