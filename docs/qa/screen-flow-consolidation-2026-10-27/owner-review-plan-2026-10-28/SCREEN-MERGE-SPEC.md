# SCREEN MERGE SPEC — S01–S13

> **Owner update — 28 October 2026:** S08 UX/FLOW is **APPROVED**. Implementation remains **NOT AUTHORIZED / NOT IMPLEMENTED**. The original worksheet remains REBUILD FLOW; this approval is an additional event, not a replacement selection. Technical/test and new-footer visual acceptance remain pending. D01–D14 and Screen 14 remain PENDING. See [approval record](../screen-08-flow-approval-2026-10-28/SCREEN-08-APPROVAL-RECORD.md) and [next proposal](../screen-08-flow-approval-2026-10-28/NEXT-IMPLEMENTATION-PROPOSAL.md).


Date: **28 October 2026**. Scope: owner decision import and proposed implementation specifications only. **No implementation is authorized or performed.** Screens 01–13 retain their exact design-review IDs and approved visuals except any explicitly proposed follow-up changes still awaiting review. Screen 14 remains unapproved. D01–D14 remain PENDING.

Source worksheet: `/Users/assia/Downloads/CITYWALK-review-decisions.json`; export timestamp `2026-10-28T04:20:45.479Z`; SHA-256 `c9c7ce183342f482fbb2d8a0bea98a35fa0520253fc3f6d63142351c142ece30`. The exact bytes and empty notes are preserved in [CITYWALK-review-decisions.original.json](CITYWALK-review-decisions.original.json). Current source: `codex/onboarding-global-welcome` in `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus existing uncommitted work. Base SHA alone does not identify the approved redesign; audit source snapshots/hashes remain authoritative.

Original audit files, advisory recommendations, screenshots, branches and worktrees remain untouched. This plan's imported owner-selection column supersedes the historical audit's PENDING screen selections; it does not overwrite or reinterpret the original worksheet. KEEP NEW means preferred presentation; MERGE BEST OF BOTH means a proposed feature specification; REBUILD FLOW means a proposed journey change, not UI deletion. Historical visual approval is distinct from approval of these new specifications and from functional/device acceptance.

## Preferred version and exact implementation boundary

The five MERGE selections mean **NEW presentation + explicitly enumerated existing OLD capabilities**. Do not duplicate controllers, state stores, authentication, API catalogs or location providers. No speculative redesign is proposed for KEEP NEW screens. Planned file boundaries below are prospective, not modifications performed.

OLD means the audit's original source/baseline or retained presentation; it does not imply a second runnable native screen exists. Archived Web screenshots are supplemental evidence, not native OLD. Current/base source snapshots and all branch variants remain in the parent audit.

## Per-screen action map

| ID | Owner choice | Precise proposed implementation scope | Owner/functional gate |
|---|---|---|---|
| S01 | KEEP NEW | Freeze WelcomeScreen carousel/credits/CTAs/locales. Keep /welcome; do not rewire launch automatically. | First-run/revisit policy is D01, still pending. |
| S02 | KEEP NEW | Freeze IntroductionScreen composition, capability disclaimer, Next/account and Explore Cities. | Verify provider/audio/Guide claims remain conditional; no new claims. |
| S03 | MERGE BEST OF BOTH | NEW optional chooser frame around existing Better Auth/controller/forms/lifecycle. | Detailed specification below; no provider or management replacement. |
| S04 | MERGE BEST OF BOTH | NEW selection variant over existing Home/catalog/search/location/availability; keep original Home entry. | Back/launch and city-switch draft policy pending. |
| S05 | KEEP NEW | Freeze SelectInterests, canonical taxonomy/multiselect and optional Skip; preserve one controller-owned selection. | Remove a repeated interests question only as part of approved S08/D03 flow scope, not a new S05 visual redesign. |
| S06 | KEEP NEW | Freeze AvailableTime and picker; use same minutes/returnBy builder values. | Preserve 60/120/180/240 planner choices and hydrated 90; account defaults support a narrower set—do not silently save 240 into TravelerStyle. Skip/default and draft lifetime still need review. |
| S07 | KEEP NEW | Freeze LocationPermission illustration/copy; reuse explicit foreground locate and Not now/manual fallback. | No auto-request, required GPS or permission escalation. |
| S08 | REBUILD FLOW | Preserve FirstExperience presentation; propose a planning handoff instead of mandatory Hub round-trip. | Flow/CTA semantics approved by owner; technical tests and actual footer/layout acceptance remain pending. |
| S09 | MERGE BEST OF BOTH | NEW premium Hub with existing city/tour/place/builder/Guide fallback capabilities. | Duration semantics, guest preference ownership and collection entry pending. |
| S10 | MERGE BEST OF BOTH | NEW Explore cards/header with existing Search/history, List/Map, guest Save and distinct Add. | Dedicated Search retained first; broad search consolidation requires D06. |
| S11 | KEEP NEW | Freeze ordinary PlaceContent, real sources/audio/eligibility/actions and centralized credits. | Preserve ordinary place versus published-trip execution dispatch; S14 not approved by implication. |
| S12 | MERGE BEST OF BOTH | NEW dedicated route list over original published source/preview identity and real stops; align truthful filtering. | Scoped duration evidence and collection entry approval required. |
| S13 | KEEP NEW | Freeze RoutePreview title/map/ordered stops/visit-only disclosure/explicit Start. | Never convert dashed stop sequence into street directions; unapproved S14 successor remains separate gate. |

## S03 — Account / Sign-in: MERGE BEST OF BOTH specification

Exact existing source: `mobile/src/app/account/index.tsx`; component `AccountScreen + AccountOnboardingFrame`; route `/account?onboarding=1`. Baseline `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus current approved source snapshots in the parent audit.

### From OLD — retain these capabilities

- Keep AccountScreen email validation, submit locks, Better Auth session/signIn.email/signUp.email, locale header, verification notice/resend, recovery and network/error mapping.
- Keep configured-provider detection and real OAuth callback/error handling; show Apple/Google only when configured.
- Keep authenticated profile editing, traveler defaults, password management, export/reset/deletion safeguards, account-scoped cleanup and entitlement status.
- Keep returnToWalk and normal back/home return semantics for non-onboarding account entry; preserve existing direct account/deletion links.

### From NEW — retain this presentation

- Use AccountOnboardingFrame and approved Create your account editorial composition for optional onboarding entry.
- Retain prominent email sign-up, intentional Sign in hierarchy, guest reassurance and Explore Cities.
- Reuse existing locale, keyboard-aware scroll and large-text/safe-area patterns.

### Composition / navigation contract

Keep one AccountScreen controller and Better Auth provider. Treat entry intent (onboarding, account management, return-to-walk, deletion) separately from form mode. Do not force authenticated management into the introductory chooser. Onboarding guest leave → /?section=cities; ordinary account leave → valid origin/back, else Home. Preserve current callback URLs until a reviewed return-intent contract is tested; no arbitrary redirect input.

### Prospective file boundary

- `mobile/src/app/account/index.tsx`
- `mobile/src/components/AccountOnboardingFrame.tsx`
- `mobile/src/lib/accountOnboardingCopy.ts`
- `mobile/src/lib/auth/client.ts`
- `mobile/src/lib/auth/accountLocalData.ts`

No permission to edit these files is granted by this document. Existing helpers remain owned in place; shared edits require regression coverage for approved screens.

### Remaining owner decision / excluded changes

Confirm whether the premium chooser should also appear for ordinary guest /account entry (D02 remains pending). Authenticated account layout is preserved; a dynamic city-pass account refactor is not implied. The existing lubeck-specific pass card requires separate scoping approval, not a new global destination.

### Acceptance and regression coverage

Same sign-up/sign-in/recovery/deletion behavior as existing controller; guest exit never authenticates; provider-off hides buttons; keyboard actions remain reachable; returning to a retained walk does not discard settings. Live provider acceptance must be recorded separately.

Existing test targets to extend only when behavior is implemented:

- `mobile/tests/account-onboarding-frame.test.tsx`
- `mobile/tests/account-guest-flow.test.tsx`
- `mobile/tests/account-lifecycle.test.ts`
- `mobile/tests/account-data-export.test.ts`

### Current comparison for review

OLD retained native variant (not a fresh baseline checkout):

![S03 OLD](../images/03-old.png)

NEW approved current presentation; combination not yet implemented:

![S03 NEW](../images/03-new.png)

## S04 — Choose a City: MERGE BEST OF BOTH specification

Exact existing source: `mobile/src/app/index.tsx`; component `HomeScreen + HomeCityCard(size=selection)`; route `/?section=cities`. Baseline `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus current approved source snapshots in the parent audit.

### From OLD — retain these capabilities

- Keep current HomeScreen catalog loading/retry, query/filter behavior, optional explicit location and actual city availability registry.
- Preserve original Home/featured discovery and its tab entry until D01 is decided; preserve city and marketing deep links.
- Preserve available-city navigation and disabled/unselectable Coming Soon cities.

### From NEW — retain this presentation

- Use approved focused city selection presentation at /?section=cities: editorial title, search/location controls, consistent photo cards/gradient and distinct availability treatment.
- Keep accessible attribution controls, author/source/license metadata, scroll reachability and localized card names.

### Composition / navigation contract

Keep one HomeScreen + HomeCityCard(size=selection) and one city data/availability source. Selection of an available city → its /city/:citySlug Hub as today. No automatic forced interests/account/location flow. Preserve normal Home as a retained entry variant, not a deleted duplicate.

### Prospective file boundary

- `mobile/src/app/index.tsx`
- `mobile/src/lib/citySelectionCopy.ts`
- `mobile/src/lib/routing.ts`
- `mobile/src/components/NativeChrome.tsx`

No permission to edit these files is granted by this document. Existing helpers remain owned in place; shared edits require regression coverage for approved screens.

### Remaining owner decision / excluded changes

D01/D05 must decide launch/revisit and city-switch-with-draft policy. Proposed Back returns to a valid origin; a no-stack fallback must be explicitly chosen (recommend Home for ordinary discovery, Welcome only for an explicit welcome journey). Do not silently discard another city draft or activate future cities.

### Acceptance and regression coverage

Search and location remain optional; denied location still allows manual city choice; unavailable city cannot open an enabled Hub; selected city remains dynamic; ordinary Home and onboarding-selection Back are both tested.

Existing test targets to extend only when behavior is implemented:

- `mobile/tests/home-presentation.test.tsx`
- `mobile/tests/native-tab-navigation.test.tsx`
- `mobile/tests/city-hub-actions.test.tsx`

### Current comparison for review

OLD retained native variant (not a fresh baseline checkout):

![S04 OLD](../images/04-old.png)

NEW approved current presentation; combination not yet implemented:

![S04 NEW](../images/04-new.png)

## S09 — City Hub: MERGE BEST OF BOTH specification

Exact existing source: `mobile/src/app/city/[citySlug]/index.tsx`; component `CityScreen + CityHubHero`; route `/city/:citySlug`. Baseline `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus current approved source snapshots in the parent audit.

### From OLD — retain these capabilities

- Retain real published tours and POIs, city availability/loading/retry, city-scoped category/list/map behavior and supported Add-to-Walk actions.
- Retain Build My Walk restoring an existing preview/active journey and the existing returnToPlanner stack handoff until S08 transition is explicitly changed.
- Keep honest city-assistant fallback and place-scoped Guide eligibility; retain supported optional Near me behavior.

### From NEW — retain this presentation

- Keep approved official logo/header, city-switch hero, licensed photography, prominent Build my walk and three Quick Actions.
- Keep compact Suggested Walk cards, real route title/stop count/themes, About city and approved Places composition.
- Preserve selected-city text, source-backed descriptions and accessible credit handling.

### Composition / navigation contract

One city Hub, not another city selector or route builder. Existing account interest scoring remains account-scoped. Guest draft interests must not be advertised as applied to recommendations until an approved input ownership contract exists. Preserve existing five tabs. Align duration presentation with S12/S13 once semantics are verified; do not relabel 45 as walking-only or experience time.

### Prospective file boundary

- `mobile/src/app/city/[citySlug]/index.tsx`
- `mobile/src/components/CityHubHero.tsx`
- `mobile/src/lib/cityHubRecommendations.ts`
- `mobile/src/lib/cityHubPhotography.ts`
- `mobile/src/lib/tabNavigation.tsx`

No permission to edit these files is granted by this document. Existing helpers remain owned in place; shared edits require regression coverage for approved screens.

### Remaining owner decision / excluded changes

Review the exact entry for Walking Routes (propose a small explicit collection link; D07/tab ownership still pending), guest preference input ownership (D03), and S08 browse/resume intent. Never change tab architecture under a screen-merge selection.

### Acceptance and regression coverage

Available city switch works without login, Build resumes correct city journey, Near me denial remains browseable, Ask does not claim unsupported city-wide answers, route labels/filters do not contradict Preview and no mock data appears.

Existing test targets to extend only when behavior is implemented:

- `mobile/tests/city-hub-actions.test.tsx`
- `mobile/tests/city-hub-editorial-v1.test.ts`
- `mobile/tests/city-hub-photography.test.ts`
- `mobile/tests/native-tab-navigation.test.tsx`

### Current presentation for review

Native OLD screenshot unavailable. Exact OLD source is preserved; any archived Web reference in the original gallery is supplemental. This screenshot shows the existing approved NEW screen, **not a completed merge**.

![S09 approved current](../images/09-new.png)

## S10 — Explore Places: MERGE BEST OF BOTH specification

Exact existing source: `mobile/src/app/city/[citySlug]/explore.tsx`; component `ExploreScreen / ExploreContent`; route `/city/:citySlug/explore`. Baseline `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus current approved source snapshots in the parent audit.

### From OLD — retain these capabilities

- Keep ExploreContent public city hook, full POI list, existing categories/List-Map and map interaction.
- Preserve SearchScreen recent city-scoped searches, clear-history action, result behavior/cap and place-open handling; do not replace it with only Hub filtering.
- Keep guest saved-place storage, reload/error handling and locking, and Add/Remove-to-Walk as a distinct route-builder action.
- Keep navigation crash regression and city/POI identity validation.

### From NEW — retain this presentation

- Keep approved compact navy header, logo treatment, editorial title and category controls.
- Keep premium POI card hierarchy, separately labeled Save and Add actions, genuine verified image and polished missing-photo placeholder.
- Preserve localized card content, large text and safe-area scrolling.

### Composition / navigation contract

Preferred first slice keeps Explore → dedicated Search navigation, preserving recent-history behavior instead of a search rewrite. Use the same city data and route identities. Save persists a favorite; Add modifies/selects the walk using existing contracts. Neither action silently starts navigation or requires auth for basic discovery.

### Prospective file boundary

- `mobile/src/app/city/[citySlug]/explore.tsx`
- `mobile/src/app/city/[citySlug]/search.tsx`
- `mobile/src/lib/searchHistory.ts`
- `mobile/src/lib/explorePhotography.ts`
- `mobile/src/lib/walkStorage.ts`

No permission to edit these files is granted by this document. Existing helpers remain owned in place; shared edits require regression coverage for approved screens.

### Remaining owner decision / excluded changes

Inline-vs-dedicated search and Hub/Explore overlap are D06 decisions, not resolved by S10. Confirm whether to change existing result caps only as a separate requirement. Keep 20 missing and four unverified legacy photos as documented gaps; no substitute/unlicensed assets. Credit placement changes remain per-license, not a blanket icon/text removal.

### Acceptance and regression coverage

Hub and bottom tab both open Explore without crash; Search history/query/city isolation preserved; filters and map agree; save versus Add works independently; rejected writes show recoverable feedback; placeholders and legal source links remain accessible.

Existing test targets to extend only when behavior is implemented:

- `mobile/tests/explore-p1.test.ts`
- `mobile/tests/explore-photography.test.ts`
- `mobile/tests/native-tab-navigation.test.tsx`
- `mobile/tests/native-v2-regressions.test.tsx`

### Current presentation for review

Native OLD screenshot unavailable. Exact OLD source is preserved; any archived Web reference in the original gallery is supplemental. This screenshot shows the existing approved NEW screen, **not a completed merge**.

![S10 approved current](../images/10-new.png)

## S12 — Walking Routes: MERGE BEST OF BOTH specification

Exact existing source: `mobile/src/app/city/[citySlug]/routes.tsx`; component `WalkingRoutesScreen / RoutesContent / PublishedRouteCard`; route `/city/:citySlug/routes`. Baseline `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus current approved source snapshots in the parent audit.

### From OLD — retain these capabilities

- Keep City Hub published-tour source, exact tour identities, complete ordered editorial stop graph, existing preview navigation and city availability gates.
- Keep builder, Saved Walks and Hub exits and existing guest access; preserve embedded Hub route entry until a collection-entry decision is made.
- Keep published data values unmodified until source evidence establishes their meaning.

### From NEW — retain this presentation

- Keep approved dedicated WalkingRoutesScreen / RoutesContent / PublishedRouteCard at /city/:citySlug/routes.
- Keep editorial heading, real duration/stop/themes presentation, licensed tour/verified first-stop photo with accurate location identification, scroll and accessible filters.
- Keep clear preview action and unknown/no-routes/loading/error states; no fake route favorite.

### Composition / navigation contract

Continue using published tour APIs and canonical time choices, not another catalog. Define a single verified duration-display/filter policy reused by Hub/list/Preview. Current estimate 45 has no verified scope; 120 is summed visit time, not total experience. Do not use either as a full-trip budget without evidence. Proposed interim policy: show visit-only label with unknown walking/total; keep ambiguous total-duration routes in All, outside timed total-experience matches; if no route has valid scoped totals, disable/explain timed filtering rather than imply a match. This behavior change is a proposal requiring acceptance.

### Prospective file boundary

- `mobile/src/app/city/[citySlug]/routes.tsx`
- `mobile/src/lib/publishedRoutes.ts`
- `mobile/src/lib/publishedRouteTiming.ts`
- `mobile/src/app/city/[citySlug]/tour/[tourSlug].tsx`
- `mobile/src/app/city/[citySlug]/index.tsx`

No permission to edit these files is granted by this document. Existing helpers remain owned in place; shared edits require regression coverage for approved screens.

### Remaining owner decision / excluded changes

Owner/source decision on duration semantics and filter behavior is a prerequisite; no invented corrected duration or backend field. D07 must choose Hub → collection entry; D09 controls broader trip/active architecture. No catalog replacement or curated Save action until supported.

### Acceptance and regression coverage

Only real published city routes; full verified stop graph; same semantics on Hub/list/Preview; unknown totals never match a timed full-experience promise; preview opening never starts a walk; filter/back restoration and guest exits work.

Existing test targets to extend only when behavior is implemented:

- `mobile/tests/walking-routes.test.tsx`
- `mobile/tests/published-routes.test.ts`
- `mobile/tests/published-route-timing.test.ts`
- `mobile/tests/route-preview.test.tsx`

### Current presentation for review

Native OLD screenshot unavailable. Exact OLD source is preserved; any archived Web reference in the original gallery is supplemental. This screenshot shows the existing approved NEW screen, **not a completed merge**.

![S12 approved current](../images/12-new.png)

## Shared components / contracts and risks

| Boundary | Reuse existing source / contract | Proposed constraint and regression risk |
|---|---|---|
| City identity / availability | mobile/src/lib/routing.ts; public city hooks/contracts; shared city availability registry | Validate citySlug/placeSlug/tourSlug and publication/availability; no global Lübeck fallback or new cities. |
| Account identity | mobile/src/lib/auth/client.ts; AccountScreen; accountLocalData | One Better Auth provider. Preserve server identity/entitlements and deletion cleanup. No arbitrary redirect/callback contract. |
| Planner state | NativeWalkFlow; packages/traveler-core/src/walkPlanner.ts WalkSettings/Interest | One mounted controller; do not copy settings into S05/06/07/08 local stores. Preserve deadline, walking/start/finish/loop/category behavior. |
| Account defaults vs drafts | mobile/src/lib/travelerStyle.ts | Account-scoped durations are 60/90/120/180; AvailableTime offers 60/120/180/240 and hydrates non-card values. Draft minutes can be 240; do not coerce or auto-persist as account defaults. No new guest store or version migration without approval. |
| Built custom journey | mobile/src/lib/walkStorage.ts; NativeWalkFlow CurrentWalk/WalkJourney | Preserve preview/active phase and saved/current/account/legacy reads. Do not clear current journey to show onboarding. |
| Published timing | PublicTour.estimatedDurationMinutes; mobile/src/lib/publishedRouteTiming.ts | DTO does not declare walking/total scope. 45 is ambiguous; 120 is visits only. No invented full-time estimate; schema/API expansion requires separate agreed scope. |
| Published execution | mobile/src/lib/tripNavigation.ts; activePublishedTrip.ts; curatedProgressStorage.ts | Preserve ordered editorial identities and separate progress model; S14/D08/D09/D14 remain pending. No new progress UI in this plan. |
| Maps / location | NativeCityMap; existing NativeWalkFlow locate handler | Optional permission, manual fallback, point/sequence map. No verified street geometry, turn instructions, GPS completion or offline navigation claims. |
| POI search / saves | SearchScreen/searchHistory; ExploreContent; walkStorage | Preserve city-scoped recent history, query/result semantics and independent Save/Add. Avoid duplicated requests/stores and asynchronous stale-city writes. |
| Recommendations | cityHubRecommendations + canonical interest tags | Current Hub reads authenticated account interests. Guest-draft handoff is unresolved; leave generic real routes honest until ownership is agreed. No coordinates/preferences in URLs. |
| Media / legal | explorePhotography, cityHubPhotography, photoCredits; Legal/Photo Credits | Verified source/creator/license/modifications and adjacent exceptions remain. 20 missing + four unverified legacy images are not new asset authority. |
| UI/navigation/locales | AppText/PrimaryButton/Screen/VirtualizedScreen; NativeChrome/tabNavigation; LocaleSelector | Preserve Navy #09234D, Blue #155CAF, Off-white #FBFDFF, EN/DE, safe areas, keyboard, large text, RTL/reduced motion where supported. Five-tab ownership is not changed until D decisions. |
| Commerce | Existing City Pass/native premium rules and server entitlement gates | €4.99 / 72h, one-time/no auto-renewal unchanged. Do not conflate separate native Premium offerings or alter purchases/paywalls. |

## Review checklist still open

- S03: approve entry-intent behavior without losing account management; no new visual layout proposed.
- S04: approve launch/Back/available-city transition policy; preserve existing Home.
- S08: approved journey/CTA semantics now gate technical contract tests, retained-state proof, and new-footer device/accessibility acceptance.
- S09: approve collection-link placement and whether guest settings may influence recommendations; confirm truthful duration policy.
- S10: approve retaining dedicated Search as first slice, preserving history and current result rules.
- S12: approve scoped/unknown-time filter treatment and collection entry, using actual content evidence.
- S14 and all D groups: still PENDING; screenshots do not imply approval.
