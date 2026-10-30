# CITYWALK screen and flow audit

Completed **28 October 2026, Europe/Berlin**; discovery began 27 October (directory name retained). Read-only product audit. Only this dedicated report directory is generated. No source edits, checkout switching, consolidation, commit, push, merge or deployment.

Current redesign: `codex/onboarding-global-welcome`, worktree `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus existing uncommitted/untracked implementation. Base SHA alone does **not** identify the approved designs; current source hashes and snapshots are preserved here. Screens **01–13 are visually approved by the owner**, with functional verification pending where documented. Candidate Active Walk (14) exists from preceding work and remains **unapproved**; this audit does not extend it.

Native is Mobile Core; Public Web is acquisition/SEO/sharing/legal/intentional existing preview, not an automatic native mirror; Admin Web is staff operations. Independent Marketing SaaS branches are excluded from CITYWALK route counts, while CITYWALK internal Admin marketing is included.

Live remote refs read: develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591`; main `88191e77e55a489804c49bccccf6307b5876b41d`. No fetch/merge was performed. Locally available refs/history may not equal every remote branch ever created. See `github-evidence.json`, `refs.json`, `worktrees.json`, branch-route indexes and source snapshots. Exact-head CI/device/deployment status is not inferred from source presence.

## Functional gaps and flow inconsistencies

These distinguish observed defects, designed limitations and evidence gaps. No unsupported numbers or features have been added.

### F01 · P1 · Launch bypass / missing onboarding policy

Normal launch is / Home. Welcome is explicitly a visual-review route; no persisted first-run/revisit gate. This is a confirmed bypass, not proof Welcome is unreachable.

Evidence: `mobile/src/app/welcome.tsx:27`.

Advisory next step: Decide optional first-entry policy; preserve deep links and returning walks.

### F02 · P1 · Numbered flow differs from actual flow

04 → 09 → Build → 05–08 → 09 → retained planner. Design IDs must remain unchanged. This is not an eight-screen mandatory wizard.

Evidence: `mobile/src/components/NativeWalkFlow.tsx:965`.

Advisory next step: Decide whether confirmation detour should remain; no automatic flow rewrite.

### F03 · P1 · Duration semantics inconsistent across discovery and preview

Live Hub and Walking Routes advertise 45 min; Preview correctly shows 120 min at stops and unverified walking/total. List filters consume the ambiguous 45-minute field.

Evidence: `mobile/src/lib/publishedRoutes.ts:8`.

Advisory next step: Editorial/source owner must establish scoped duration; then shared display/filter contract regression.

### F04 · P1 · Guest personalization not used in Hub recommendations

Hub reads accountInterests only when userId matches. NativeWalkFlow holds guest selections in its own mounted state; no durable guest preference handoff to recommendations.

Evidence: `mobile/src/app/city/[citySlug]/index.tsx:114`.

Advisory next step: Choose ownership of guest defaults and recommendation inputs without duplicating planner state.

### F05 · P1 · Unbuilt drafts are not durable

Screen 08 retains draft via native stack. Build/resume journeys persist; unbuilt interests/return-by/location and completion flags do not have a durable draft contract.

Evidence: `mobile/src/components/NativeWalkFlow.tsx:205`.

Advisory next step: Accept session-only draft or authorize a tested shared draft contract; never describe as process-safe.

### F06 · P2 · Collection entry inversion

Only /tour preview contains a navigation reference to /routes in current native code. Hub can open a specific preview; collection discovery comes afterward.

Evidence: `mobile/src/app/city/[citySlug]/tour/[tourSlug].tsx:109`.

Advisory next step: Decide explicit route-collection entry while preserving approved visuals.

### F07 · P1 · Active-walk modes share Place route and differ in persistence

Published trip context dispatches to unapproved PublishedActiveWalk. Ordinary places remain Screen 11; custom journeys use NativeWalkFlow. Saved/Trips loads custom/legacy saved walks, not curatedProgressStorage.

Evidence: `mobile/src/app/city/[citySlug]/place/[placeSlug].tsx:61`.

Advisory next step: Review unapproved candidate and resume/Trips discovery before consolidation; do not merge models blindly.

### F08 · P2 · Repeated preferences and Skip semantics

Confirmed repeated question: Screen 05 selects interests, but after 08 returns through Hub, the retained planner step 2 renders the legacy interests grid again (same state), plus categories/walking pace. Step 3 then asks manual/GPS start/end. Available Time Skip advances with current/default budget; rebuild resets interests/time.

Evidence: `mobile/src/components/NativeWalkFlow.tsx:1070`.

Advisory next step: Decide whether the second interests entry should be editing-only; preserve categories/walking controls and choose Skip/default semantics.

### F09 · P2 · Home / Explore tab semantics are conditional

/ has Home; /?section=cities and /city/:citySlug have Explore. /walk and /tour have Trips. /routes currently falls through to Explore. This differs from catalog/preview tab expectations but is not a proven crash.

Evidence: `mobile/src/lib/tabNavigation.tsx:9`.

Advisory next step: Approve tab ownership before any route/active-tab changes.

### F10 · P2 · Multiple search/filter presentations

Hub places filters, Explore list/map and dedicated Search/recent history overlap. Search limits visible matches to 12; Explore is full catalog. Removal would lose capabilities.

Evidence: `mobile/src/app/city/[citySlug]/search.tsx:99`.

Advisory next step: Merge best capabilities only after search/history/category/map regression matrix.

### F11 · P1 · Guide/audio claims remain availability bounded

City Assistant is explicitly unavailable with a place-discovery fallback. Real Guide is place-scoped. English Holstentor capture has no English audio; no substituted-locale playback.

Evidence: `mobile/src/app/city/[citySlug]/assistant.tsx:32`.

Advisory next step: Keep honest capability-specific paths; verify deployed provider/locale integration separately.

### F12 · P1 · Photography and attribution coverage incomplete

Recorded audit: 20 missing POI images + four unverified legacy assets, all excluded/fallbacks. Current Explore still contains adjacent licensed text; Detail uses central Photo Credits. No new license compliance opinion established by this audit.

Evidence: `mobile/src/app/city/[citySlug]/explore.tsx:35`.

Advisory next step: Preserve source/license metadata and per-license handling; approved asset acquisition is a separate task.

### F13 · P1 · Snapshot is behind current integration branches

Redesign base 98a1… differs from live develop 9f847…; #449/#450/#452 merged separately. Some #450 progress was locally reused, but branch ancestry and partial copies do not prove all backend/shared/native contracts are integrated. #454 remains a separate open selected-place UI PR.

Evidence: `github-evidence.json; refs.json; branch-route-versions.json`.

Advisory next step: No-loss source→successor comparison and exact revision regression required before any merge; preserve independent worktrees.

### F14 · P2 · Legacy selected-city assumptions remain outside redesigned flow

Authenticated /account has a city pass card/link explicitly for lubeck. Dynamic city context in 04/09/10 does not make that legacy account area globally city-aware.

Evidence: `mobile/src/app/account/index.tsx:543`.

Advisory next step: Choose account/pass scoping independently; do not modify commerce in this audit.

### F15 · P1 · Product-wide device/back/provider acceptance is incomplete

Historical reports document tests/simulator evidence with unverified Android devices, physical VoiceOver/TalkBack, live OAuth/email/purchases, process-death draft behavior and full back-stack traversal. Audit captures do not close these gates.

Evidence: `docs/qa/screen-14/REPORT.md; docs/qa/onboarding-screen-03-polish/README.md`.

Advisory next step: Require explicit per-platform, guest/account, locale, restart and provider acceptance before removal or release.

## Old capability retention checklist

- Email/OAuth/recovery/deletion/password/account defaults remain in the old account source and must survive chooser consolidation.
- Manual start/end/loop, walking preference, categories, deadline/return-leg estimation and custom route adaptation remain after 05–08. Do not replace the controller with visual-only onboarding.
- Search recent history/result behavior is absent from simple Hub filtering; preserve it before merging.
- Custom route save/reopen/completion/feedback/share are not reproduced by curated Active Walk. Preserve both state contracts.
- Original place sources, exact-locale audio and provider/entitlement eligibility are retained; an empty locale/photo is not evidence of a redesign deleting content.
- No blanket parity claim: see F13/F15 and baseline/current snapshots. No runtime test of every original action was performed.

