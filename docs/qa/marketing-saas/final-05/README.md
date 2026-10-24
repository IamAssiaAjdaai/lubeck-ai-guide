# WIRKFADEN-DESIGN-FINAL-05 — final-fix commit and screen acceptance

**The two approved fixes are ready for local preservation. Complete Design Freeze v1.0 remains NO-GO.** AUTH-01 readability and HISTORY-01 misleading historical-view conflict remain material acceptance findings. No owner acceptance is inferred from test results.

## Review package

- [Design system v1 candidate](DESIGN-SYSTEM-v1.md)
- [Active screen inventory](SCREEN-INVENTORY.md)
- [Screen acceptance, findings and manual limitations](SCREEN-ACCEPTANCE.md)
- [Implemented / planned / unverified capabilities](CAPABILITY-MATRIX.md)
- [Design Freeze checklist](DESIGN-FREEZE-CHECKLIST.md)
- [Final screenshot index: every active screen, five widths](SCREENSHOTS.md)
- [Exact changed-file inventory](FILES.txt), [tested source hashes](SOURCE-HASHES.json), [test results](TEST-RESULTS.json)
- [Local canonical CI summary](CI-SUMMARY.json), [authenticated checks](AUTHENTICATED-RESULTS.json), [automated accessibility](ACCESSIBILITY.json)

## Baseline, scope and preservation

Worktree `/private/tmp/mkt-dashboard-01`, branch `codex/mkt-dashboard-01`. This is one additive local commit after exact baseline `80a212c2dbcf6850ad347e0da9c5f2a16771b695`; earlier `a06d977` and `3f3a568` remain ancestors. The exact final SHA is returned in the owner handoff and obtainable with `git rev-parse HEAD`.

Read-only remote preflight observed develop `ae03c2efeac682044ab11fa0c816cab1f0a2db7b` and main `88191e77e55a489804c49bccccf6307b5876b41d`; neither was imported or modified. This task follows the explicitly requested local branch, not a new develop checkout. Future integration remains separately authorized.

The pending Final-04 source changes were only the context-safe hero and mobile navigation/readability/clearance fixes, their tests and QA evidence. This task adds acceptance-harness coverage and documentation only. It does not patch auth typography or change historical review/API contracts. The approved layout, D2 landing/assets, Concept A architecture, backend/schema, provider/billing gates and CITYWALK source remain unchanged.

117 protected Human Review and 321 held files are hash-verified unchanged. Existing commits and historical QA evidence are preserved. Private mail/session/login/DB configuration, reviewer/coordinator materials, raw exports and credential files are excluded. The old Final-04 report describes its then-uncommitted state; it is preserved as historical evidence rather than rewritten.

## Fixes preserved

1. Tenant-context-safe hero: only a reviewed private business-photo source for the selected project may be shown; unrelated D2 florist imagery is not a workspace fallback. Missing/failed/denied/deleted/logo/other-project sources use the explicitly labeled hand-authored neutral illustration. Server authorization and source integrity remain authoritative.
2. Mobile navigation at 375/390: 14px labels, full accessible destination names, six working routes, larger tap targets and safe-area-aware content clearance. The approved desktop/tablet composition remains unchanged. Review/export and dirty-state protections are retained.

Acceptance tests add local sink recovery/reset/login, onboarding and all creation steps, real old-version selection/export lock, open mock Creative Studio, source-frame stability, mobile labels/targets/scroll bounds, reduced motion and extra loading/error captures. No product feature is introduced by these harness changes.

## Exact local verification

| Gate | Result |
| --- | --- |
| Full repository unit suite | 1,713 passed / 0 failed / 239 skipped |
| Marketing unit/security subset | 242 passed / 0 failed / 87 skipped |
| Isolated PostgreSQL integration | 118 passed / 0 failed / 0 skipped |
| Authenticated local browser journey | 1,323 checks passed |
| Closed-access checks | 30 passed |
| Unchanged D2 public demo regression | 271 passed |
| Focused source/responsive/state/keyboard fixtures | 185 checks passed |
| Automated axe | 0 violations: 145 authenticated, 20 fixture, 5 closed-auth and 20 D2 state/viewport pairs |
| Marketing UI / API / core TypeScript | PASS |
| Marketing lint/build | PASS; five native-image advisories, no lint errors |
| Additional browser-harness lint | PASS |
| Seven existing local migrations, repeat application, DB integrity | PASS in fresh isolated QA databases |
| Scope, secret-pattern and diff checks | PASS |

These counts overlap; the Marketing unit subset is part of the full suite, and mixed integration suites may repeat unit portions. Skipped tests are not database passes. All results are local, not exact-head GitHub CI or production acceptance.

Canonical QA runs on separate loopback ports 3398/3399 and fresh disposable synthetic databases. Mock-only network guards and disabled real-provider/spend gates remain active. The existing owner database and 3208/3209 preview are not repointed, seeded, migrated or reset. No credentials are provisioned and no external email/provider call is made. Existing unknown-cost fixture reservations are preserved rather than cleared to pass a test.

During harness development one test assumed history was oldest-first; it was corrected to select a real non-current version. One later run was interrupted by a browser main-frame navigation during capture; the final run with redacted navigation diagnostics passed without a product change. Those iterations are not hidden as product success. The history warning and auth typography are separately recorded actual UX findings, despite passing safety/function checks.

## Owner preview remains available

[http://127.0.0.1:3208/workspace](http://127.0.0.1:3208/workspace) — existing synthetic account/session, same isolated local API/database, loopback only. Observed frontend PID `96192`, API `96191`, runner `96178`; no restart was needed for this task. Re-identify PIDs before any later operational command.

No push, PR, merge, deployment, billing, live AI, new schema, CITYWALK change or destructive cleanup. Native Mobile Core and CITYWALK Admin/Public Web work are not part of this independent Marketing frontend task. Physical iOS/Android/assistive-technology acceptance remains unverified.

## Next acceptance action

Review the final screen index and the two P2 findings. The smallest subsequent changes are auth-only readability/touch-target adjustments and a frontend historical-mode review-fetch/message correction that retains all backend version/export guards. Those are not hidden in this focused two-fix commit. Owner screen approval, device/accessibility acceptance, name/legal/commercial decisions and any future integration/release authority remain separate gates.

## Preserved evidence whitespace

The staged default `git diff --cached --check` reports one trailing blank line in the pre-existing `final-04/LINT.txt` log. That historical evidence is preserved byte-for-byte. With only `blank-at-eof` disabled, the complete staged diff passes; no source whitespace errors remain.
