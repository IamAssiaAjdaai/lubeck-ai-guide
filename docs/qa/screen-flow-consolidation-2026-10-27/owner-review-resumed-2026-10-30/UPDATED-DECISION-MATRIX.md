# Updated owner decision matrix —30 October 2026

All 27 original choices and empty notes are preserved verbatim. Archived worksheet SHA256 `c9c7ce183342f482fbb2d8a0bea98a35fa0520253fc3f6d63142351c142ece30`. The original Downloads file is no longer present; this is the byte-preserved import from the existing audit, not a newly invented worksheet.

S08 original REBUILD FLOW choice remains in history; later approved/implemented flow and Android guard are recorded as subsequent status events, not rewritten choices. Earlier28 Oct plan statements that S08 is unimplemented/not authorized are historical and superseded within that specific completed scope. No broader merge approval is inferred.

| ID | Screen/candidate | Original owner selection | Current review status |
|---|---|---|---|
| S01 | Global Welcome | **KEEP NEW** | Visually Approved / Functional Verification Pending |
| S02 | Product Value Story | **KEEP NEW** | Visually Approved / Functional Verification Pending |
| S03 | Account / Sign-in | **MERGE BEST OF BOTH** | Visually Approved / Functional Verification Pending |
| S04 | Choose a City | **MERGE BEST OF BOTH** | Visually Approved / Functional Verification Pending |
| S05 | Select Interests | **KEEP NEW** | Visually Approved / Functional Verification Pending |
| S06 | Available Time / Return-by | **KEEP NEW** | Visually Approved / Functional Verification Pending |
| S07 | Location Permission | **KEEP NEW** | Visually Approved / Functional Verification Pending |
| S08 | First Experience | **REBUILD FLOW** | Approved design/UX; authorized Slice01/Slice02/storage/focus guard implemented and verified within scope; broader native acceptance partial; further feature work on hold |
| S09 | City Hub | **MERGE BEST OF BOTH** | Visually Approved / Functional Verification Pending |
| S10 | Explore Places | **MERGE BEST OF BOTH** | Visually Approved / Functional Verification Pending |
| S11 | Place Detail | **KEEP NEW** | Visually Approved / Functional Verification Pending |
| S12 | Walking Routes | **MERGE BEST OF BOTH** | Visually Approved / Functional Verification Pending |
| S13 | Route Preview | **KEEP NEW** | Visually Approved / Functional Verification Pending |
| D01 | Home vs focused City Selection | **PENDING** | Await explicit owner decision; implementation not authorized |
| D02 | Ordinary Account vs onboarding Account | **PENDING** | Await explicit owner decision; implementation not authorized |
| D03 | Account interests vs per-walk interests | **PENDING** | Await explicit owner decision; implementation not authorized |
| D04 | Duration / return-by vs account defaults | **PENDING** | Await explicit owner decision; implementation not authorized |
| D05 | Location explanation vs contextual location actions | **PENDING** | Await explicit owner decision; implementation not authorized |
| D06 | Hub Places vs Explore vs Search | **PENDING** | Await explicit owner decision; implementation not authorized |
| D07 | Suggested Walks vs Walking Routes collection | **PENDING** | Await explicit owner decision; implementation not authorized |
| D08 | Custom preview vs published Route Preview | **PENDING** | Await explicit owner decision; implementation not authorized |
| D09 | Custom Active Walk vs published Active Walk | **PENDING** | Await explicit owner decision; implementation not authorized |
| D10 | Place Guide vs city assistant fallback | **PENDING** | Await explicit owner decision; implementation not authorized |
| D11 | Trips vs Saved | **PENDING** | Await explicit owner decision; implementation not authorized |
| D12 | Specific vs generic Web city/place wrappers | **PENDING** | Await explicit owner decision; implementation not authorized |
| D13 | Homepage vs landing review routes | **PENDING** | Await explicit owner decision; implementation not authorized |
| D14 | Ordinary Place Detail vs published execution mode | **PENDING** | Await explicit owner decision; implementation not authorized |

Screen 14 is a separate **PENDING** item, not a28th imported worksheet choice. Candidate D14 is not Screen 14. All01–13 design IDs remain unchanged.

## D recommendations — not decisions

| ID | Classification | Prior audit advice | Current advisory recommendation |
|---|---|---|---|
| [D01](D01.md) | Intentional entry variants; one controller | MERGE BEST OF BOTH | KEEP BOTH ENTRY VARIANTS; reuse existing HomeScreen. Decide launch/revisit policy separately. |
| [D02](D02.md) | Intentional entry intents; one authentication system | MERGE BEST OF BOTH | KEEP ONE ACCOUNT CONTROLLER; retain management and the approved onboarding frame. |
| [D03](D03.md) | Distinct state scopes; repeated question already resolved | MERGE BEST OF BOTH | RETAIN CURRENT ONCE-PER-DRAFT FLOW; keep account defaults separate; no automatic account write. |
| [D04](D04.md) | Reusable inputs; different contracts | MERGE BEST OF BOTH | KEEP APPROVED S06 AND DISTINCT DEFAULTS CONTRACT; share validated input semantics only. |
| [D05](D05.md) | Shared permission service; legitimate contextual actions | MERGE BEST OF BOTH | KEEP EXPLANATION AND CONTEXTUAL ACTIONS; reuse current adapter and avoid unsolicited/repeated prompts. |
| [D06](D06.md) | Real browsing overlap; Search has distinct history semantics | MERGE BEST OF BOTH | KEEP ALL CURRENT ROUTES/VISUALS; share selectors/state contracts where justified, retain dedicated Search initially. |
| [D07](D07.md) | Intentional summary + full collection; shared published data | MERGE BEST OF BOTH | KEEP SUMMARY AND COLLECTION; reuse published identities; decide collection entry and timing semantics separately. |
| [D08](D08.md) | Distinct domain contracts; not replacement versions | MERGE BEST OF BOTH | KEEP BOTH DOMAIN FLOWS; share only compatible display primitives without changing approved S13. |
| [D09](D09.md) | Distinct execution models; Screen 14 pending | MERGE BEST OF BOTH | DEFER EXECUTION CONSOLIDATION; preserve both implementations and Screen 14 approval gate. |
| [D10](D10.md) | Different scope and availability; not duplicate answers | KEEP OLD | KEEP PLACE GUIDE AND HONEST CITY FALLBACK; no new AI capability. |
| [D11](D11.md) | Legitimate filtered modes of one controller | KEEP OLD | KEEP BOTH TABS/MODES AND EXISTING STORES; defer migrations and curated Trips inclusion. |
| [D12](D12.md) | Platform-specific routing overlap; shared content rendering | MERGE BEST OF BOTH | PRESERVE BOTH URL CONTRACTS; prefer shared content internals, no redirects/removal in this review. |
| [D13](D13.md) | Shared component plus intentional preview/history | REMOVE CANDIDATE | KEEP APPROVED ROOT AND INTENTIONAL PREVIEW; mark legacy preview for owner-purpose review, no deletion. |
| [D14](D14.md) | Same URL with different intent; candidate mode not approved | REBUILD FLOW | KEEP ORDINARY S11 DEFAULT; DEFER PUBLISHED-MODE FLOW DECISION WITH SCREEN14. |
