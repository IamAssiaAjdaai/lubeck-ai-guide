# CITYWALK — Confirmed Owner UX Decisions

**Date:** 30 October 2026  
**Scope:** Consolidation Owner Review — D01–D14  
**Authority:** UX and architecture decisions ONLY. No implementation authorization.

Provenance: recorded from the owner's pasted decision record in this chat on 30 October 2026. The named attachment was unavailable; the owner supplied the authoritative text directly. The original 27-choice worksheet remains historical evidence, unchanged.

## Confirmed Decisions

### D01 — Welcome / Introduction / City Selection
**Decision: APPROVED — First-launch onboarding**

- First launch: Welcome (S01) → Introduction (S02) → Choose City (S04).
- Returning travelers: Home remains available.
- Preserve guest access, city catalog and availability restrictions.
- First-run detection, completion and reset policy require a separate technical specification.
- No automatic navigation implementation is authorized.

### D02 — Ordinary Account vs Onboarding Account
**Decision: APPROVED — Premium Onboarding + Ordinary Account**

- Keep the premium Account Onboarding presentation.
- Keep ordinary Account entry and signed-in Account Management.
- Both use the same Better Auth controller and existing authentication infrastructure.
- Preserve verification, recovery, deletion/export and return-to-walk behavior.
- Do not introduce a second authentication system.

### D03 — Account Interests vs Walk Interests
**Decision: APPROVED — Keep Separate**

- Account preferences remain explicit traveler defaults.
- Walk interests remain selections for the individual walking session.
- Ask interests once per new draft, except when explicitly revisited through Back/Edit.
- Do not automatically write Walk Interests into Account Preferences.
- Guest draft interests do not automatically become City Hub recommendation inputs.

### D04 — Duration / Return-by vs Account Defaults
**Decision: APPROVED — Keep Distinct**

- Keep walking duration and Return-by as trip-specific settings.
- Keep Account duration defaults under their existing supported contract.
- Do not coerce a 240-minute walking selection into an unsupported account default.
- Midnight/time-zone handling and published-route timing remain separate unresolved work.

### D05 — Location Explanation vs Contextual Actions
**Decision: APPROVED — Keep Both Optional**

- Retain optional onboarding location explanation (S07).
- Retain separate Near Me, Map Locate and planner location actions.
- Request location permission only through appropriate explicit user actions.
- Preserve manual start/end choices and denied/error fallbacks.
- No mandatory GPS, repeated unsolicited permission prompts or automatic location-based stop completion.

### D06 — Hub Places vs Explore vs Search
**Decision: APPROVED — Keep Dedicated Search**

- Keep City Hub, Explore Places and dedicated Search as distinct user-facing surfaces.
- Preserve existing POI search and city-scoped recent-place history.
- Preserve Save/Favorite and Add-to-Walk as different actions.
- Preserve existing independent filtering/navigation behavior; no new cross-surface filter synchronization is authorized.
- Maintain approved S09/S10 visuals.

### D07 — Suggested Walks vs Walking Routes Collection
**Decision: APPROVED UX DIRECTION — Add "See all walks" to City Hub**

- Keep Suggested Walks as a summary on City Hub.
- Keep the existing Walking Routes collection as the full listing.
- Add a "See all walks" entry pointing to that existing collection.
- Preserve the current five-tab architecture and published-route data.
- CTA placement and exact visual design remain subject to separate visual approval.
- Do not implement this link yet.

### D08 — Custom Preview vs Published Route Preview
**Decision: APPROVED — Keep Both Domain Flows**

- Keep personalized/custom Walk Preview and published editorial Route Preview as separate flows.
- Preserve customized WalkSettings, adaptation, Return-by, start/end controls and guarded storage for custom walks.
- Preserve published ordered stops, editorial content and honest timing disclosure.
- Share only genuinely compatible display components after separate review.
- Do not combine storage identities or confuse Build with Start.

### D09 — Custom Active Walk vs Published Active Walk
**Decision: DEFERRED — PENDING**

- Defer final decision until Screen 14 visual and functional approval.
- Preserve both existing execution implementations.
- No automatic convergence, deletion or storage migration.

### D10 — Place Guide vs City Assistant
**Decision: APPROVED — Keep Place Guide + Honest City Fallback**

- Preserve the place-scoped Guide and its existing eligibility/source-trust requirements.
- Preserve the truthful city assistant unavailable/fallback experience.
- Do not claim that full city-wide AI assistance is operational.
- No new AI provider or backend functionality authorized.

### D11 — Trips vs Saved
**Decision: APPROVED — Keep Both Modes**

- Trips represents walking execution, progress and history.
- Saved represents bookmarked places/routes and reopening or replaying saved content.
- Preserve the existing account/local/legacy storage boundaries.
- Do not merge tabs or stores.
- Any published-trip progress integration remains dependent on D09 and Screen 14.

### D12 — Specific vs Generic Web City/Place Routes
**Decision: APPROVED — Preserve Both URL Contracts**

- Preserve existing Lübeck-specific and generic city/place Web routes.
- Do not remove or redirect existing routes.
- Preserve locale, SEO, editorial, analytics, audio and purchasing-related contracts.
- Any canonical/redirect consolidation requires a separate compatibility review.
- Native screens are not replacements for Public Web routes.

### D13 — Homepage vs Landing Preview Routes
**Decision: APPROVED — Keep Approved Homepage + Review Previews**

- Preserve the approved LandingNext homepage.
- Preserve intentional review/preview routes for now.
- Keep legacy preview routes available for future purpose/archival review.
- Do not restore previously rejected Coming Soon designs.
- No preview deletion, route removal or homepage replacement authorized.

### D14 — Ordinary Place Detail vs Published Execution Mode
**Decision: DEFERRED — PENDING**

- Defer final decision until Screen 14 visual and functional review.
- Preserve ordinary S11 Place Detail and its features, links and legal/photo attribution.
- Preserve the unapproved published execution candidate for comparison.
- Do not change Details, Back or return-to-execution behavior without an approved specification.

## Decision Summary

- **12 decisions confirmed:** D01–D08 and D10–D13.
- **2 decisions deferred:** D09 and D14.
- D07 is an approved UX direction, with exact visual placement still pending.
- Screen 14 remains unapproved.
- S01–S13 original visual decisions remain preserved.
- Screen 08 implemented work remains protected.

## Strict Restrictions

These UX decisions do not authorize application changes, test changes, screen deletion, route migration, authentication or payment changes, Git commits, pushes, merges or deployment.

The subsequent urgent Git-backup instruction separately authorizes safe backup commits/pushes and gated integration. It does not approve Screen 14 or D09/D14, or authorize D07 implementation.

Screen 14 comparison preparation was interrupted by the owner's higher-priority urgent backup request. No Screen 14 implementation or approval was performed.
