# UPDATED DECISION MATRIX — imported owner selections

Date: **28 October 2026**. Scope: owner decision import and proposed implementation specifications only. **No implementation is authorized or performed.** Screens 01–13 retain their exact design-review IDs and approved visuals except any explicitly proposed follow-up changes still awaiting review. Screen 14 remains unapproved. D01–D14 remain PENDING.

Source worksheet: `/Users/assia/Downloads/CITYWALK-review-decisions.json`; export timestamp `2026-10-28T04:20:45.479Z`; SHA-256 `c9c7ce183342f482fbb2d8a0bea98a35fa0520253fc3f6d63142351c142ece30`. The exact bytes and empty notes are preserved in [CITYWALK-review-decisions.original.json](CITYWALK-review-decisions.original.json). Current source: `codex/onboarding-global-welcome` in `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus existing uncommitted work. Base SHA alone does not identify the approved redesign; audit source snapshots/hashes remain authoritative.

Original audit files, advisory recommendations, screenshots, branches and worktrees remain untouched. This plan's imported owner-selection column supersedes the historical audit's PENDING screen selections; it does not overwrite or reinterpret the original worksheet. KEEP NEW means preferred presentation; MERGE BEST OF BOTH means a proposed feature specification; REBUILD FLOW means a proposed journey change, not UI deletion. Historical visual approval is distinct from approval of these new specifications and from functional/device acceptance.

## All 27 decisions

The prior recommendation column is historical audit advice, not an owner decision. The exact owner column below is authoritative for this planning task. New feature/flow specifications have not yet been accepted or implemented.

| ID | Screen / flow | Prior advisory recommendation | Exact owner decision | Original note | Planning status / next gate |
|---|---|---|---|---|---|
| S01 | Global Welcome | KEEP NEW | **KEEP NEW** | Empty string | Preferred existing version; functional gates remain |
| S02 | Product Value Story | KEEP NEW | **KEEP NEW** | Empty string | Preferred existing version; functional gates remain |
| S03 | Account / Sign-in | MERGE BEST OF BOTH | **MERGE BEST OF BOTH** | Empty string | PENDING |
| S04 | Choose a City | MERGE BEST OF BOTH | **MERGE BEST OF BOTH** | Empty string | PENDING |
| S05 | Select Interests | MERGE BEST OF BOTH | **KEEP NEW** | Empty string | Preferred existing version; functional gates remain |
| S06 | Available Time / Return-by | MERGE BEST OF BOTH | **KEEP NEW** | Empty string | Preferred existing version; functional gates remain |
| S07 | Location Permission | MERGE BEST OF BOTH | **KEEP NEW** | Empty string | Preferred existing version; functional gates remain |
| S08 | First Experience | REBUILD FLOW | **REBUILD FLOW** | Empty string | PENDING |
| S09 | City Hub | MERGE BEST OF BOTH | **MERGE BEST OF BOTH** | Empty string | PENDING |
| S10 | Explore Places | MERGE BEST OF BOTH | **MERGE BEST OF BOTH** | Empty string | PENDING |
| S11 | Place Detail | KEEP NEW | **KEEP NEW** | Empty string | Preferred existing version; functional gates remain |
| S12 | Walking Routes | MERGE BEST OF BOTH | **MERGE BEST OF BOTH** | Empty string | PENDING |
| S13 | Route Preview | KEEP NEW | **KEEP NEW** | Empty string | Preferred existing version; functional gates remain |
| D01 | Home vs focused City Selection | MERGE BEST OF BOTH | **PENDING** | Empty string | PENDING — no consolidation decision inferred |
| D02 | General account chooser vs onboarding account | MERGE BEST OF BOTH | **PENDING** | Empty string | PENDING — no consolidation decision inferred |
| D03 | Interests/defaults across account/planner/onboarding | MERGE BEST OF BOTH | **PENDING** | Empty string | PENDING — no consolidation decision inferred |
| D04 | Duration/deadline entry variants | MERGE BEST OF BOTH | **PENDING** | Empty string | PENDING — no consolidation decision inferred |
| D05 | Location affordances | MERGE BEST OF BOTH | **PENDING** | Empty string | PENDING — no consolidation decision inferred |
| D06 | Hub places vs Explore vs Search | MERGE BEST OF BOTH | **PENDING** | Empty string | PENDING — no consolidation decision inferred |
| D07 | Embedded tour collection vs Walking Routes | MERGE BEST OF BOTH | **PENDING** | Empty string | PENDING — no consolidation decision inferred |
| D08 | Published preview vs custom preview | MERGE BEST OF BOTH | **PENDING** | Empty string | PENDING — no consolidation decision inferred |
| D09 | Published Active Walk vs custom Active Walk | MERGE BEST OF BOTH | **PENDING** | Empty string | PENDING — no consolidation decision inferred |
| D10 | City Assistant fallback vs place Guide | KEEP OLD | **PENDING** | Empty string | PENDING — no consolidation decision inferred |
| D11 | Trips vs Saved tabs | KEEP OLD | **PENDING** | Empty string | PENDING — no consolidation decision inferred |
| D12 | Generic vs Lübeck-specific Web city/place routes | MERGE BEST OF BOTH | **PENDING** | Empty string | PENDING — no consolidation decision inferred |
| D13 | Homepage / landing preview versions | REMOVE CANDIDATE | **PENDING** | Empty string | PENDING — no consolidation decision inferred |
| D14 | Place detail vs published execution route mode | REBUILD FLOW | **PENDING** | Empty string | PENDING — no consolidation decision inferred |

## Additional explicit hold

| Item | Owner status | Permitted action now |
|---|---|---|
| Screen 14 — existing Active Walk candidate | **PENDING / not visually approved**; not present in imported worksheet | Inventory/reference screenshot only; no development or inferred approval |
| Code consolidation / implementation | **NOT AUTHORIZED** | Plan only |
| Legacy deletion / branch deletion / merge / commit / push / deploy | **NOT AUTHORIZED** | Preserve all existing versions |

## Remaining review gates

- S03/S04/S09/S10/S12: accept the exact OLD-capability/NEW-presentation specification, resolving only explicitly scoped behavior; broad D groups remain pending.
- S08: accept proposed primary/secondary/Back behavior and draft policy. UI stays preserved; copy/secondary placement requires final visual acceptance after any future implementation.
- S09/S12 timing: verify source semantics or explicitly approve unknown-total filtering; no revised numbers are invented.
- D01–D14: await separate explicit owner decisions. No completion or removal implied by the selected screen versions.

Original [CONSOLIDATION-DECISIONS.md](../CONSOLIDATION-DECISIONS.md) and review page remain historical audit artifacts. This updated matrix and its JSON companion contain the imported worksheet without rewriting that history.
