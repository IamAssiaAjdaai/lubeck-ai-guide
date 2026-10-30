# IMPLEMENTATION ORDER — dependency-aware, not execution permission

> **Owner update — 28 October 2026:** S08 UX/FLOW is **APPROVED**. Implementation remains **NOT AUTHORIZED / NOT IMPLEMENTED**. The original worksheet remains REBUILD FLOW; this approval is an additional event, not a replacement selection. Technical/test and new-footer visual acceptance remain pending. D01–D14 and Screen 14 remain PENDING. See [approval record](../screen-08-flow-approval-2026-10-28/SCREEN-08-APPROVAL-RECORD.md) and [next proposal](../screen-08-flow-approval-2026-10-28/NEXT-IMPLEMENTATION-PROPOSAL.md).


Date: **28 October 2026**. Scope: owner decision import and proposed implementation specifications only. **No implementation is authorized or performed.** Screens 01–13 retain their exact design-review IDs and approved visuals except any explicitly proposed follow-up changes still awaiting review. Screen 14 remains unapproved. D01–D14 remain PENDING.

Source worksheet: `/Users/assia/Downloads/CITYWALK-review-decisions.json`; export timestamp `2026-10-28T04:20:45.479Z`; SHA-256 `c9c7ce183342f482fbb2d8a0bea98a35fa0520253fc3f6d63142351c142ece30`. The exact bytes and empty notes are preserved in [CITYWALK-review-decisions.original.json](CITYWALK-review-decisions.original.json). Current source: `codex/onboarding-global-welcome` in `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus existing uncommitted work. Base SHA alone does not identify the approved redesign; audit source snapshots/hashes remain authoritative.

Original audit files, advisory recommendations, screenshots, branches and worktrees remain untouched. This plan's imported owner-selection column supersedes the historical audit's PENDING screen selections; it does not overwrite or reinterpret the original worksheet. KEEP NEW means preferred presentation; MERGE BEST OF BOTH means a proposed feature specification; REBUILD FLOW means a proposed journey change, not UI deletion. Historical visual approval is distinct from approval of these new specifications and from functional/device acceptance.

## Stage 0 — review and no-loss baseline (now)

Deliver this specification package and imported 27-row matrix. Keep the original audit/worksheet immutable. S08 journey has explicit UX/flow approval. Obtain acceptance of its technical/test contract and the five separate feature combinations before their respective implementation. No implementation is authorized. D01–D14 and S14 remain pending; cross-flow work touching their unresolved scope needs an explicit narrow boundary or a later decision.

Before any future code: re-read exact live develop and relevant open PRs (including selected-place picker work), compare source not just ancestry, and preserve uncommitted redesign work. Do not cherry-pick, rebase, merge or move worktrees as an audit shortcut. The current stacked redesign is based on 98a1…; the earlier audit remote refs and merged #449/#450/#452 are dated evidence, not a claim that all their contracts are integrated. #424 was refreshed read-only for this planning turn; no new exact-SHA CI/deployment acceptance is claimed.

## Proposed safe order after authorization

| Order | Slice | Dependencies / required decision | Files and contained result | Regression/stop gate |
|---|---|---|---|---|
| 1 | Freeze KEEP NEW baseline: S01/S02/S05/S06/S07/S11/S13 | Owner preference imported; no new visuals requested | Keep source/screenshots. Add/adjust meaningful regression coverage only with an authorized behavior slice. | Check 01→02→guest exit, 05–08 draft values, picker, ordinary 11 and explicit-start 13. Stop for any approved-visual change. |
| 2 | Define duration integrity policy for S09/S12/S13 | Editorial/source evidence for 45-minute scope; owner filter/unknown policy | Reuse publishedRouteTiming and published public data; propose shared presentation/filter semantics, no invented durations or backend migration. | Ambiguous total cannot match a full-experience budget; verify all three screens before changing labels/filters. If evidence is missing, keep this blocked and do independent accepted slices. |
| 3 | S03 presentation/controller composition | Accept S03 feature map and scoped entry behavior; D02 broad chooser consolidation pending | Reuse AccountScreen/AccountOnboardingFrame; preserve lifecycle/provider gates and current origin intents. | Guest, email/recovery/provider-off, keyboard, management/deletion protections; no live destructive lifecycle actions in routine QA. |
| 4 | S04 selection over one existing catalog | Accept Back/entry/city-switch boundaries; do not resolve D01 launch policy implicitly | Keep selection variant and original Home; no new city selection system or forced planner launch. | Available/disabled cities, manual/denied location, query, credits, deep links and tab/back regression. |
| 5 | S10 retain approved discovery with full legacy capabilities | Accept dedicated Search retention; D06 broad merge remains pending | Preserve search/history and distinct Save/Add, missing-photo fallbacks and crash fix. | Hub and Explore tab both work; query/history/filter/map/save/add/error/city isolation; native safe-area/large-text check. |
| 6 | S08 navigation slice and retained planner controls | S08 UX/flow approved; technical/test contract and implementation authorization required; D03/D04/D05 broad consolidation remains pending | Existing NativeWalkFlow + FirstExperience callbacks; no mandatory Hub loop or repeated interests; preserve walking/categories/start/end. | Rendered Back/skip/restore/browse/no-stack/race tests, no route until Build or navigation until Start. Capture standard/small EN/DE; stop for visual review. |
| 7 | S09 premium Hub capability reconciliation | Accepted timing policy and S08 return behavior; D07 collection placement and D03 guest input choice | Keep approved Hub and actions; align honest metadata; no new guide/recommendation/store/tab system. | Dynamic city/resume/location denial/guide fallback/real route card checks; only approved collection link if separately accepted. |
| 8 | S12 route-list entry/filter reconciliation | Timing contract resolved; accepted collection-entry location; keep D09 global walking architecture pending | Same published API/graph and approved list; honest filters, preview navigation, legal credits. | Known/unknown/conflicting duration, single/no routes, stop integrity, filter/back restoration; guest and explicit Start separation. |
| 9 | Cross-screen acceptance and report | Every implemented slice individually authorized; S14 still separate | Capture actual resulting versions; compare with frozen approved baselines, source hashes and old capability checklist. | Tests/CI/Preview/device gates as scoped; owner review before any new development, commit/push or PR step. |

Steps 3–5 can proceed independently of unresolved timing after explicit implementation permission; numbers describe recommended delivery sequence, not an artificial hard dependency. S09/S12 timing work cannot be declared complete while the meaning of 45 remains unknown. No step includes implementing Screen 14 or resolving D01–D14 by default.

## Risk-driven acceptance matrix

| Area | Required automated/functional evidence | Required native/owner evidence |
|---|---|---|
| Account/guest | Intent-preserving leave, validation/submit races, configured providers, lifecycle authorization/cleanup | EN/DE keyboard/large text; real provider/email integration recorded separately |
| City/discovery | Search, available-only navigation, location denied/late result, city identity and Save/Add isolation | Standard/small iPhone; Android layout/back; real photo/source links |
| Planner/08 | No repeated question, all old constraints retained, return-by restore, retained draft and no-stack/restart behavior | New CTA semantics/placement and actual screens require owner review; optional location remains optional |
| Routes/timing | Shared semantics, complete stop graph, unknown/conflicting totals, preview only on browse | Owner/source acceptance of labels and filters; no street-routing/ETA promises |
| Navigation/shared UI | Five existing tabs, active route state, deep-link/back/retap/scroll, no duplicate entries | EN/DE/safe areas/max text, screen-reader order and physical assistive technology checks separately |
| Existing execution | Curated/custom state isolation and ordinary Place Detail unchanged | Screen 14 unapproved: no new execution UI acceptance inferred |

## Future quality gate (not run for this plan)

During authorized implementation: targeted mobile/domain/rendered regressions first, then mobile tests/lint/TypeScript and iOS/Android exports/builds as affected. Follow repository substantial-change gate: `npm run test:run`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run db:generate`, `npm run db:migrate`, `npm run db:verify`, `git diff --check`. Database commands only against an explicitly isolated disposable QA target; never production, no destructive resets/seeds/imports or unexpected schema drift. Add required integration tests for actual affected systems. An export is not physical Android/iOS acceptance. Any Preview/CI claim must match the exact future source revision.

For this documentation-only task, full application tests/builds/DB operations are **not applicable and were not run**. Decision equality, source preservation and report validation are the appropriate gates.

## Stop points / excluded work

No automatic cleanup/removal, branch deletion, auth migration, city activation, new photos, routing provider, tab rewrite, store/billing change or legal publication. Public Web/Admin unchanged. Preserve City Pass €4.99/72h one-time/no renewal. Commit, push, PR, merge and deployment require separate explicit authorization; none is included in the owner worksheet.
