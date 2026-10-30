# CITYWALK screen and flow audit

Completed **28 October 2026, Europe/Berlin**; discovery began 27 October (directory name retained). Read-only product audit. Only this dedicated report directory is generated. No source edits, checkout switching, consolidation, commit, push, merge or deployment.

Current redesign: `codex/onboarding-global-welcome`, worktree `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus existing uncommitted/untracked implementation. Base SHA alone does **not** identify the approved designs; current source hashes and snapshots are preserved here. Screens **01–13 are visually approved by the owner**, with functional verification pending where documented. Candidate Active Walk (14) exists from preceding work and remains **unapproved**; this audit does not extend it.

Native is Mobile Core; Public Web is acquisition/SEO/sharing/legal/intentional existing preview, not an automatic native mirror; Admin Web is staff operations. Independent Marketing SaaS branches are excluded from CITYWALK route counts, while CITYWALK internal Admin marketing is included.

Live remote refs read: develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591`; main `88191e77e55a489804c49bccccf6307b5876b41d`. No fetch/merge was performed. Locally available refs/history may not equal every remote branch ever created. See `github-evidence.json`, `refs.json`, `worktrees.json`, branch-route indexes and source snapshots. Exact-head CI/device/deployment status is not inferred from source presence.

## Duplicate and overlapping flows

## Counts and definitions

- **68 current route-file entries**: 19 native, 21 Public Web, 28 Admin Web. Dynamic parameters and query/state variants are not multiplied into imaginary routes.
- **15 additional historical/other-branch route paths**; **83 distinct discovered CITYWALK route-file paths** in the audited local history/ref scope. Not all are active simultaneously; static/dynamic route overlaps need precedence analysis.
- **41 embedded state/capability groups** separately inventoried, not added to route totals; in addition to the official 05–08 states mapped in the registry; these groups include auth forms, preview/active/finish and settings-related modes.
- **14 duplicate/overlap candidate groups**; these are advisory comparisons, including legitimate reuse—not 14 deletions.
- **0 confirmed completely unreachable current file routes**. This is not a claim of complete reachability. 01 and 02 are confirmed bypassed by normal launch; 12 has reverse collection discovery. Deep links, feature/permission/auth gates and Admin acceptance remain conditional/unverified.
- **15 findings** (flow inconsistencies and functional/evidence gaps), individually identified F01–F15.
- **13 screen choices + 14 flow choices = 27 review decisions**, all PENDING. The 13 design IDs remain unchanged.

## Evidence limits

13 fresh current native captures at 402×874 points; language/scale and original pixel dimensions recorded in `screenshot-provenance.json`. Four OLD native comparisons are available: two retained current legacy variants (03/04), two archived before captures (11/13). Other native OLD captures are unavailable or no original equivalent exists. Supplemental Web screenshots are explicitly marked Web and never substituted as native. Earlier report links to absent screenshots are not evidence of a present image. No fabricated legacy renders or screenshot-based performance claims. Archived capture provenance does not establish an exact binary hash. Current source snapshots are hash-identified; visual approval remains the owner's historical decision.

Audit-only verification: file/source/hash/link/gallery checks and observational simulator navigation. Historical tests in prior reports are retained evidence, not rerun or new end-to-end acceptance. No DB, provider, payment, server-write or full product test gate was run for this documentation-only task.

| ID | Screen / flow | Exact implementations | Classification | Recommendation | USER DECISION |
|---|---|---|---|---|---|
| D01 | Home vs focused City Selection | / and /?section=cities; same HomeScreen | Overlap candidate; preserve distinct contracts | MERGE BEST OF BOTH | PENDING |
| D02 | General account chooser vs onboarding account | /account vs /account?onboarding=1 | Overlap candidate; preserve distinct contracts | MERGE BEST OF BOTH | PENDING |
| D03 | Interests/defaults across account/planner/onboarding | Account preferences, NativeWalkFlow steps, SelectInterests | Overlap candidate; preserve distinct contracts | MERGE BEST OF BOTH | PENDING |
| D04 | Duration/deadline entry variants | AvailableTime + planner/time picker + account defaults | Overlap candidate; preserve distinct contracts | MERGE BEST OF BOTH | PENDING |
| D05 | Location affordances | Explanation, manual builder, map controls, Near me | Overlap candidate; preserve distinct contracts | MERGE BEST OF BOTH | PENDING |
| D06 | Hub places vs Explore vs Search | Hub list/map; Explore list/map; Search recent history | Overlap candidate; preserve distinct contracts | MERGE BEST OF BOTH | PENDING |
| D07 | Embedded tour collection vs Walking Routes | Hub TourCard vs /routes | Overlap candidate; preserve distinct contracts | MERGE BEST OF BOTH | PENDING |
| D08 | Published preview vs custom preview | /tour/:tourSlug vs /walk stage preview | Overlap candidate; preserve distinct contracts | MERGE BEST OF BOTH | PENDING |
| D09 | Published Active Walk vs custom Active Walk | PublishedActiveWalk vs NativeWalkFlow active | Overlap candidate; preserve distinct contracts | MERGE BEST OF BOTH | PENDING |
| D10 | City Assistant fallback vs place Guide | /assistant vs /guide/:placeSlug | Overlap candidate; preserve distinct contracts | KEEP OLD | PENDING |
| D11 | Trips vs Saved tabs | /saved?view=trips vs /saved | Overlap candidate; preserve distinct contracts | KEEP OLD | PENDING |
| D12 | Generic vs Lübeck-specific Web city/place routes | /[locale]/[citySlug] vs /[locale]/lubeck; analogous place routes | Overlap candidate; preserve distinct contracts | MERGE BEST OF BOTH | PENDING |
| D13 | Homepage / landing preview versions | / vs /landing-next-preview vs /landing-preview; history Coming Soon | Overlap candidate; preserve distinct contracts | REMOVE CANDIDATE | PENDING |
| D14 | Place detail vs published execution route mode | Same /place URL; ordinary vs published trip context | Overlap candidate; preserve distinct contracts | REBUILD FLOW | PENDING |

## Legitimate reuse that should not be mistaken for duplication

- 05–08 are views in one `NativeWalkFlow` owner; extracting their visuals did not create new APIs or stores.
- `/saved` query modes share implementation, not two saved stores. Account/local/legacy data coexist intentionally and need migration tests before simplification.
- Curated published stop order and personalized builder adaptation are different domain concepts; do not collapse them into one route schema.
- Public Web versus iOS/Android is a deliberate architecture boundary (#136); no automatic native parity rebuild on Web.
- CityExperience/PlacePageContent reuse across generic and local Web wrappers is distinct from duplicate backend content.
- Staff CMS identity is separate from traveler Better Auth, and independent Marketing SaaS is a different product.

## Candidate components with no proven rendered entry

`component-usage.json` records current tracked source references to CustomTourPlanner, TourBuilder, WalkPlanner, WalkJourney, CityExperience and PublishedActiveWalk. A file without a proven incoming rendered reference is a component investigation candidate, not a confirmed unreachable user-facing file route. Do not delete it based on text search alone.

