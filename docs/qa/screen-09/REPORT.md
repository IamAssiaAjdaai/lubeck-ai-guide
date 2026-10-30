# Screen 09 — City Hub / Today

Local visual approval candidate, 2026-10-25. Worktree `/private/tmp/citywalk-global-welcome`, branch `codex/onboarding-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617`. Existing stacked onboarding work preserved. No commit, push, PR, merge or deployment.

## Scope / audit

Mobile Core required; Public Web and Admin Web not applicable and preserved. Read architecture/workflow/mobile instructions, CITYWALK engineering/design criteria, GitHub truth preflight and Expo SDK 57 Router guidance. Targeted upstream refresh: develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591`, isolated Preview policy #448. Continued the explicitly requested stacked worktree; no rebase or overwrite of unfinished work.

| Dependency | Before | Screen 09 result |
| --- | --- | --- |
| Native city hub | Existing city-scoped virtualized list, old artwork/editorial hero | Scoped navy/photo hero and larger photographic route cards |
| City switching | Back/global discovery available, no explicit city switch in hero | Named accessible city switch opens existing `/?section=cities` |
| Guest / availability | Public summary API, established city launch rules, no account gate | Preserved; no future cities activated |
| Build My Walk | Existing `/city/[citySlug]/walk`; Screen 08 retained-planner return override | Preserved verbatim, covered by component tests and native normal-entry/back checks |
| Places / nearby | Measured scroll target, categories, explicit foreground GPS, distance ordering, list/map | Preserved; no new data/query/location system |
| Guide | Existing city assistant route and capability fallback | Preserved; local city-wide answers unavailable, honestly reported by existing guide |
| Tours | Actual API tours, first-stop image fallback, published duration/stops/tags | Preserved; larger cards, no invented routes/distances/metadata |
| Preferences | Account-owned traveler style; guest onboarding preferences local to mounted planner | Account interests rank real tours using canonical `interestScore`; guests retain editorial order |
| Web navigation | `GenericCityContent` → `CityExperience`; launch checks, public snapshot, existing builder/places/tours | Audited and untouched |
| Native tabs | Home / Explore / Trips / Saved / Profile; city hub belongs to Explore; dedicated Explore root | Destinations, active state, reselection/back behavior untouched |

`usePublicCity` / public summary contracts remain the source for city/places/tours. No changes to backend, API contracts, schema, imports, availability, authentication provider, purchases, weather or guide capabilities. No duplicate store or selection system. City Pass remains €4.99 / 72 hours / one-time payment / no automatic renewal.

## Implementation and exact changed files

Production files changed for Screen 09:

- `mobile/src/app/city/[citySlug]/index.tsx`: scoped new hero, brand-blue builder CTA, account-owned preference hydration/ranking, photographic route cards, remove generic Hanseatic/UNESCO subtitle that incorrectly applied to every city, hub-only accessibility adaptation. Screen 08's `returnToPlanner` override remains unchanged from the task baseline.
- `mobile/src/components/CityHubHero.tsx` (new): dynamic city identity/switch, localized editorial copy, correctly mapped licensed city photo and reused attribution modal. Text sits on solid navy rather than varying photography for reliable contrast. Future cities use their own published media; missing images produce no unrelated city art.
- `mobile/src/lib/cityHubRecommendations.ts` (new): rank supplied published tours by actual stop tags with the existing planner interest scorer. Stable editorial order without preferences; no mutation of tour metadata.
- `mobile/src/components/ui.tsx`: optional VirtualizedScreen navigation label scale setting. Defaults remain unchanged. Older PrimaryButton `labelStyle` work predates Screen 09.
- `mobile/src/components/NativeChrome.tsx`: optional bounded tab-label sizing used only by Screen 09, preserving full accessible labels and destinations. Explicit sizing avoids native line-height growth at the largest system scale; other screens retain their defaults.

Tests changed:

- `mobile/tests/city-hub-actions.test.tsx`: auth bridge mock, owner-specific preference hydration plus existing guest/location/action/planner-return checks.
- `mobile/tests/city-hub-editorial-v1.test.ts`: replace superseded hero assertions; real-tour ranking, canonical tags, ties, missing stops, nonmutation and city/media boundaries.
- `mobile/tests/native-city-experience.test.ts`: new scoped hero integration assertion.
- `mobile/tests/native-v2-regressions.test.tsx`: real new hero, updated vertical-card assertions, native bridge mocks; preserve locale/large-text/place-link coverage. Replace NodeList spread with Array.from for test TypeScript compatibility.
- `mobile/tests/membership-screens.test.tsx`: auth/credits bridge mocks only; membership behavior assertions retained.
- `mobile/tests/native-screen-chrome.test.tsx`: verifies optional hub label sizing and unchanged defaults/destinations.
- `mobile/tests/walk-flow.behavior.tsx`: stabilize the Screen 08 return-by navigation test at noon. It used 23:15 against the real clock and failed during the late-evening repeat; no approved implementation changed.

Evidence files: this report, `before-city-hub.tsx.txt`, frozen/source hashes, logs and screenshots in this folder. Other dirty files belong to previous approved onboarding work.

## Native evidence

Before and after screenshots are actual native simulator captures, not browser renders:

- Standard iPhone 17 Pro, iOS 26.5, 402×874 points: [before DE](screenshots/ios-standard-before-de.png), [after EN](screenshots/ios-standard-after-en.png), [after DE](screenshots/ios-standard-after-de.png).
- Small iPhone SE (3rd generation), iOS 26.5, 375×667 points: [before EN](screenshots/ios-small-before.png), [after EN](screenshots/ios-small-after-en.png), [after DE](screenshots/ios-small-after-de.png), [published route](screenshots/ios-small-published-route-de.png).
- Largest accessibility size, small iPhone, German: [heading](screenshots/ios-small-accessibility-de-top.png), [primary action](screenshots/ios-small-accessibility-de-actions.png). Content scrolls; shortcuts become full-width. System text size was restored afterward. Tab labels grow up to 1.4× only on this hub while spoken labels remain complete.

Verified natively: city switch → approved guest city picker → available Lübeck; future cities disabled; photo info opens accurate Christian Wolf / source / CC BY-SA 3.0 DE credits and closes; builder → guest interests and Back → hub; Explore Places → measured real-content section; List/Map selection; published card → actual five-stop route detail and Back. At maximum German text size, the builder remains reachable and functional and Explore Places reaches actual controls/content. Accessibility-tree navigation scrolls offscreen actions into view. Mouse-wheel/drag simulation did not produce reliable touch scrolling; a physical-device swipe/VoiceOver audit is still an external acceptance step.

Native guest checks do not create accounts, generate paid/provider requests or start routes. Saved-account preference ordering is tested with native bridges mocked; no live account session was created. Existing denied-location behavior and real-coordinate sorting are covered by component tests. Location remains opt-in.

## Verification

| Gate | Actual result |
| --- | --- |
| Mobile full suite | **865 passed**, 100 files |
| Root full suite | **1,902 passed / 239 skipped**, 268 passed / 27 skipped files |
| Mobile lint | Passed, zero warnings |
| Root lint | Passed, zero errors / 15 existing warnings |
| Mobile / root TypeScript | Passed |
| Next build | Passed with synthetic local auth settings and isolated local QA DB |
| Expo config | Passed |
| Expo Doctor | **21/21 passed** |
| Final iOS / Android Hermes exports | Passed, `/private/tmp/citywalk-screen09-final` |
| db:generate | No schema changes / no generated migration |
| db:migrate | Passed against task-owned local disposable DB only |
| db:verify | Passed: 1 city, 25 places |
| Frozen Screens 01–08 | All 16 source hashes match |
| Diff check | Passed |

DB checks used only task-owned `citywalk_qa` on localhost:55604. No production DB/storage/env modifications. No schema/RBAC/server-trust changes; public DTO and server availability boundaries remain intact. Existing optional native shell settings retain their default behavior elsewhere. React review: hooks unconditional, stale preference loads canceled and owner-guarded, no auth gate, city URLs remain dynamic, media credits outside route links, no default changes to shared screens.

## Remaining gaps / differences from storyboard

- Android native device visuals and physical-device/VoiceOver acceptance remain unverified. Android bundling passes; iOS simulator evidence is recorded separately.
- Guest onboarding interests/duration stay in the retained planner, not a hub preference store. Guest hub tours therefore use published editorial order; Build My Walk returns to the preserved guest choices. No claim of guest-personalized hub ranking.
- City-wide Ask CITYWALK answers are unavailable in the local environment; its existing honest fallback remains. Individual-place functionality is not reimplemented here.
- Local content supplies one published tour, not the storyboard's illustrative multiple route cards. Displayed 45-minute estimate and five stops come directly from existing content; no additional routes or distance claims were fabricated.
- Retained native CITYWALK header and Home/Explore/Trips/Saved/Profile tabs differ from the storyboard's chrome. No fabricated weather, traveler avatar or decorative search was added. Explore Places uses the actual city content flow.
- Photograph subject/crop reflects available licensed city media. Route metadata sits on a solid white card beneath photography for dependable contrast and larger text rather than over the image.

Stop: **Screen 09 visual approval**. Screens 01–08 remain frozen. No Screen 10 work, commit, merge or deployment.
