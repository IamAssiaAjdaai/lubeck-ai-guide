# OWNER DECISIONS — immutable import and interpretation

Date: **28 October 2026**. Scope: owner decision import and proposed implementation specifications only. **No implementation is authorized or performed.** Screens 01–13 retain their exact design-review IDs and approved visuals except any explicitly proposed follow-up changes still awaiting review. Screen 14 remains unapproved. D01–D14 remain PENDING.

Source worksheet: `/Users/assia/Downloads/CITYWALK-review-decisions.json`; export timestamp `2026-10-28T04:20:45.479Z`; SHA-256 `c9c7ce183342f482fbb2d8a0bea98a35fa0520253fc3f6d63142351c142ece30`. The exact bytes and empty notes are preserved in [CITYWALK-review-decisions.original.json](CITYWALK-review-decisions.original.json). Current source: `codex/onboarding-global-welcome` in `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus existing uncommitted work. Base SHA alone does not identify the approved redesign; audit source snapshots/hashes remain authoritative.

Original audit files, advisory recommendations, screenshots, branches and worktrees remain untouched. This plan's imported owner-selection column supersedes the historical audit's PENDING screen selections; it does not overwrite or reinterpret the original worksheet. KEEP NEW means preferred presentation; MERGE BEST OF BOTH means a proposed feature specification; REBUILD FLOW means a proposed journey change, not UI deletion. Historical visual approval is distinct from approval of these new specifications and from functional/device acceptance.

## Imported selections

| ID | Screen / flow | Exact owner decision | Exact note | Next interpretation |
|---|---|---|---|---|
| S01 | Global Welcome | **KEEP NEW** | Empty string | Preferred NEW version; freeze visuals and verify preserved functionality |
| S02 | Product Value Story | **KEEP NEW** | Empty string | Preferred NEW version; freeze visuals and verify preserved functionality |
| S03 | Account / Sign-in | **MERGE BEST OF BOTH** | Empty string | Detailed feature specification pending review |
| S04 | Choose a City | **MERGE BEST OF BOTH** | Empty string | Detailed feature specification pending review |
| S05 | Select Interests | **KEEP NEW** | Empty string | Preferred NEW version; freeze visuals and verify preserved functionality |
| S06 | Available Time / Return-by | **KEEP NEW** | Empty string | Preferred NEW version; freeze visuals and verify preserved functionality |
| S07 | Location Permission | **KEEP NEW** | Empty string | Preferred NEW version; freeze visuals and verify preserved functionality |
| S08 | First Experience | **REBUILD FLOW** | Empty string | Navigation redesign proposal pending review; preserve UI |
| S09 | City Hub | **MERGE BEST OF BOTH** | Empty string | Detailed feature specification pending review |
| S10 | Explore Places | **MERGE BEST OF BOTH** | Empty string | Detailed feature specification pending review |
| S11 | Place Detail | **KEEP NEW** | Empty string | Preferred NEW version; freeze visuals and verify preserved functionality |
| S12 | Walking Routes | **MERGE BEST OF BOTH** | Empty string | Detailed feature specification pending review |
| S13 | Route Preview | **KEEP NEW** | Empty string | Preferred NEW version; freeze visuals and verify preserved functionality |
| D01 | Home vs focused City Selection | **PENDING** | Empty string | No action; remains pending |
| D02 | General account chooser vs onboarding account | **PENDING** | Empty string | No action; remains pending |
| D03 | Interests/defaults across account/planner/onboarding | **PENDING** | Empty string | No action; remains pending |
| D04 | Duration/deadline entry variants | **PENDING** | Empty string | No action; remains pending |
| D05 | Location affordances | **PENDING** | Empty string | No action; remains pending |
| D06 | Hub places vs Explore vs Search | **PENDING** | Empty string | No action; remains pending |
| D07 | Embedded tour collection vs Walking Routes | **PENDING** | Empty string | No action; remains pending |
| D08 | Published preview vs custom preview | **PENDING** | Empty string | No action; remains pending |
| D09 | Published Active Walk vs custom Active Walk | **PENDING** | Empty string | No action; remains pending |
| D10 | City Assistant fallback vs place Guide | **PENDING** | Empty string | No action; remains pending |
| D11 | Trips vs Saved tabs | **PENDING** | Empty string | No action; remains pending |
| D12 | Generic vs Lübeck-specific Web city/place routes | **PENDING** | Empty string | No action; remains pending |
| D13 | Homepage / landing preview versions | **PENDING** | Empty string | No action; remains pending |
| D14 | Place detail vs published execution route mode | **PENDING** | Empty string | No action; remains pending |

## Authority and unresolved scope

- Counts: **7 KEEP NEW, 5 MERGE BEST OF BOTH, 1 REBUILD FLOW, 14 PENDING**. All 27 original values/notes are copied without normalization or inference.
- Empty notes do not grant permission for a particular navigation, persistence, metadata or visual change.
- S03/S04/S09/S10/S12 preferences are not code-merge authorization or approval of a broader D decision. Specifications below identify OLD behavior to preserve beneath NEW preferred presentation.
- S08's approved screenshot remains a valid UI asset. Only a proposed journey and targeted CTA semantics are being reviewed, not automatic removal.
- Screen 14 is outside these 27 records. It is explicitly **PENDING / not visually approved**, not inferred approved through S11 or S13.
- D01–D14 remain PENDING, including groups overlapping selected screens. Broad tab/search/store/domain consolidation cannot proceed by implication.
- Planning scope: Mobile Core (iOS/Android) required. Public Web and Admin Web receive no implementation changes; existing legal/auth/commerce and independent Marketing work remain preserved.

## What still needs owner review

[SCREEN-MERGE-SPEC.md](SCREEN-MERGE-SPEC.md): five feature combinations and shared contracts. [SCREEN-08-FLOW-REDESIGN.md](SCREEN-08-FLOW-REDESIGN.md): exact entry/exit/Back proposal. [IMPLEMENTATION-ORDER.md](IMPLEMENTATION-ORDER.md): dependencies and acceptance gates. [UPDATED-DECISION-MATRIX.md](UPDATED-DECISION-MATRIX.md): owner selection versus historical advisory recommendation.
