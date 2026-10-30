# CITYWALK screen and flow audit

Completed **28 October 2026, Europe/Berlin**; discovery began 27 October (directory name retained). Read-only product audit. Only this dedicated report directory is generated. No source edits, checkout switching, consolidation, commit, push, merge or deployment.

Current redesign: `codex/onboarding-global-welcome`, worktree `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus existing uncommitted/untracked implementation. Base SHA alone does **not** identify the approved designs; current source hashes and snapshots are preserved here. Screens **01–13 are visually approved by the owner**, with functional verification pending where documented. Candidate Active Walk (14) exists from preceding work and remains **unapproved**; this audit does not extend it.

Native is Mobile Core; Public Web is acquisition/SEO/sharing/legal/intentional existing preview, not an automatic native mirror; Admin Web is staff operations. Independent Marketing SaaS branches are excluded from CITYWALK route counts, while CITYWALK internal Admin marketing is included.

Live remote refs read: develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591`; main `88191e77e55a489804c49bccccf6307b5876b41d`. No fetch/merge was performed. Locally available refs/history may not equal every remote branch ever created. See `github-evidence.json`, `refs.json`, `worktrees.json`, branch-route indexes and source snapshots. Exact-head CI/device/deployment status is not inferred from source presence.

## Proposed canonical architecture — NOT implemented

1. Keep immutable design-review IDs 01–13 as review metadata. Use route identities and typed intent separately; internal view state does not need a standalone route simply to match the storyboard.
2. One city availability registry and published city/POI/tour API; one traveler auth provider; independent staff authorization. Preserve CITYWALK guest-first behavior.
3. One shared personalization/settings contract with explicit scopes: account defaults, guest device defaults, unbuilt city draft, generated custom journey. Do not silently promote one into another. Define consent/location lifetime separately from interests.
4. Separate **curated published** and **personalized custom** walking domain state. Reuse accessible map, stop card and control primitives, but preserve editorial order versus adaptation rules. No verified pedestrian provider means stop overview, not directions/ETA.
5. Native five-tab ownership should be decided as a distinct architecture change. Candidate policy: Home global discovery; Explore city Hub/places; Trips route collection/custom/published resume; Saved favorites; Profile settings/account/legal. This policy is advisory and differs from current `/routes` active state; do not alter approved screens by implication.
6. Public Web retains acquisition/SEO/share/legal and intentional existing traveler previews; Admin owns content/media/operations/publication. Neither is automatically replaced by native UI.

## Canonical onboarding proposal

Decide a short optional first-entry Welcome/Story journey, with guest discovery available from each step. Account remains optional. City selection opens the Hub. Keep interests/time/return-by/location contextual to Build My Walk, but decide whether First Experience's second Hub visit is useful. Preserve Back and returning active-walk entry, deep links and unavailable-city handling. A one-time completion policy requires explicit state ownership and approval; do not gate all users behind eight screens.

## Canonical discovery proposal

One selected-city context feeding Hub, Explore and Search. Reuse existing POI catalog, category/search rules, list/map and distinct Save/Add actions. Preserve Search's recent history before combining presentations. Add a route-collection entry only after owner chooses tab/Hub ownership. Preserve verified photography, fallbacks and license-specific credits; no invented POIs/photos.

## Canonical walking proposal

Published collection → published preview → explicit Start/Resume → manual curated stop execution. Personalized settings → explicit generation → custom preview → explicit start → custom execution/adaptation → finish/save/share. Return-by remains walking-estimate based; do not apply a published route's unscoped 45 minutes as full experience or derive street directions from straight lines. Provide a deliberate resume entry for curated progress before removing the older trip-context presentation.

## Retain / combine / eventual removal candidates

- Retain approved visuals 01–13; full Better Auth lifecycle; guest discovery; city availability/localization; Search history; manual planner constraints; source/exact-locale content; custom saving/adaptation/finish; both real domain models; legal/credits and commerce rules.
- Combine only after owner decisions: chooser framing, preference entry hierarchy, Hub/Explore/Search navigation ownership, route collection entry and shared map/stop presentation. Recommendations do not authorize changes.
- Eventual REMOVE CANDIDATE: obsolete experimental landing preview or dead component only after incoming links, historical behavior, owner decision and regression coverage prove safe. Keep noindex preview if it remains useful. Rejected Coming Soon is historical comparison, not a canonical replacement.
- Do not remove other-branch shared-walk, publishing, security/2FA or independent Marketing work merely because it is absent from this checkout.

## Dependency-aware implementation order after owner decisions

1. Freeze source/screenshot manifests and decision export; no-loss comparison against exact develop and open #454. Preserve worktrees/unfinished work.
2. Resolve duration semantics with editorial/source evidence, then central display/filter DTO semantics and regression tests. No invented revised durations.
3. Approve route/tab/entry ownership and onboarding/draft/return policy; define expected typed navigation intents.
4. Implement one narrow approved navigation/preference slice at a time; retain compatibility routes and state migration readers until parity is proven.
5. Integrate curated resume with its own state contract only after candidate Active Walk review; do not collapse custom/public progress automatically.
6. Run native EN/DE guest/account, standard/small/large-text, denied permission, restart and deep-link matrix, plus iOS/Android device acceptance. Recheck legal/media/provider/commerce boundaries independently.
7. Consider removal only after explicit owner keep/remove decisions, source→successor parity, tests and exact-revision acceptance; then seek separate commit/PR permission. No release authority is implied.

## Regression prerequisites before any removal

- Launch/returning user/deep links; all guest exits; city switch/availability; Back/tab retap/scroll restoration; auth callback/recovery and account lifecycle.
- Interests/time/return-by retained on Back, Skip semantics, deadline picker restoration, process-death draft policy and city/account isolation.
- Search recent history/query/categories, List/Map, save versus Add semantics, premium eligibility and missing media/locale fallbacks.
- Curated metadata/stop graph/order, incomplete route rejection, explicit Start only, progress persistence/races/failures/pause/resume/end, current stop versus browsing, no GPS completion.
- Custom generated preview/start/adaptation/shorten/add/take-back/save/reopen/finish/share with supported walking constraints; never invent street ETA/offline capability.
- EN/DE, safe areas, maximum text, screen-reader traversal, minimum touch targets and measured performance. Screenshots/tests are not physical device acceptance.
- Source/author/license/modification links, guest Legal/Photo Credits and legal publication gate; City Pass €4.99/72h one-time/no auto-renewal unchanged. Native Premium/store offerings stay a separate verified product contract.

