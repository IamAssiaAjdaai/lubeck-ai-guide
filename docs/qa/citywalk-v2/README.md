# CITYWALK V2 implementation and verification

Branch: `feat/citywalk-v2`, based on fetched `origin/develop`. No commit or push.

## Scope and architecture

This implementation updates the **public Next.js web app**. The separate Expo app and the unrelated nested checkout are untouched. The initial implementation used the written V2 specification. Eight reference screenshots were supplied for the subsequent visual polish pass documented below; they are now the visual comparison source.

The existing App Router, published content repository, locale handling, MapLibre map, audio approval/paywall checks, verified RAG provider, and shared traveler-core route builder remain in use. No database schema changes, new runtime dependencies, imports, migrations, or city-specific UI implementations were introduced.

- Central visual tokens, responsive wordmark/header, waterfront artwork and five-item bottom navigation.
- Searchable data-driven city selector; optional geolocation orders known city coordinates by distance. Launch availability is independent of CMS publication. Hamburg and Düsseldorf are coming-soon configuration entries; unpublished entries are filtered and coming-soon routes cannot enter the web traveler experience.
- Shared city hub with published editorial suggestions, optional nearby map, place discovery, saved walks and Ask CITYWALK.
- Three-step planner: duration or return-by time; city-supported interests and walking preference; GPS or manual start and anywhere/loop/manual finish.
- Optional exact budget/finish fields extend the existing shared route builder compatibly. The finish leg is reserved while selecting stops; UI totals include it. Extra interest tags participate in scoring. Easy and balanced preferences constrain walking time.
- Indeterminate route-building state, friendly error handling, no-route state, compact itinerary, map preview and calculated summaries.
- Active walk with navigation, exact-locale place audio/read links, contextual assistant, visited history and explicit confirmation for skip, shorten, add and return changes.
- Active trips use sessionStorage, survive place-detail navigation and are isolated to their city. Saved walks and feedback use device-local storage. Saved routes are re-resolved against current eligible published places; old deadlines are not reused.
- Finish screen uses marked visits, elapsed time and explicitly estimated distance. Sharing uses the Web Share API with a safe fallback message.
- Place detail links into the planner. Source verification cards use the independent verified-knowledge provider, with source type and actual check date, and do not imply live opening hours.
- New interface copy is centralized for EN/DE/AR. Other existing locales retain their existing translations and the new copy is explicitly marked as English fallback. Authored place/city fallback language and direction remain distinct.
- Traveler AI navigation metadata is bounded and checked server-side against the current published city and eligible stops. It is included as self-reported navigation context, never factual evidence or authorization. Model responses do not execute route mutations.

## Components and files

New reusable UI: `src/components/walk/` — AppHeader, BottomNavigation, CitySelector, CityHubActions, WalkPlanner, WalkOverlay, WalkStates (LoadingProgress/WalkError), RouteSummary/Itinerary, WalkMap, WalkJourney, RouteChangeReview, TripDestinationPicker, FinishWalkScreen, SavedWalks, PlaceWalkAction and VerifiedInfo.

Domain/storage/trust: `src/lib/walk/`; launch configuration: `src/data/cityAvailability.ts`; copy: `src/translations/walk/`; saved/trips route: `src/app/[locale]/walks/page.tsx`.

Existing integration points changed: global stylesheet and Home, generic city/place routes, Lübeck place route, CityExperience, PlaceExperience, PlaceDiscovery, TourCard, CityMap, AskGuide and `/api/guide`, traveler-core route builder, account shortcut and associated tests.

Two necessary adjacent fixes: optional analytics no longer throws during client startup when PostHog settings are missing; lint, TypeScript and Vitest exclude the separate nested checkout, which otherwise produced duplicate tests and unrelated dependency/type failures.

## Validation

| Check | Result |
| --- | --- |
| Full Vitest suite | 134 files passed, 5 skipped; **786 tests passed, 21 skipped** |
| Final focused regression run | 3 files / 24 tests passed after saved-duration and entry-link corrections |
| Deadline boundary regression | 5 planner tests passed, including a future deadline under one minute |
| ESLint | Passed on final code |
| TypeScript (`--noEmit --incremental false`) | Passed on final code |
| Production build | Compilation and TypeScript passed; page collection blocked by missing `BETTER_AUTH_SECRET` at `/api/account/link-guest` |
| `db:generate` | Passed; no schema changes |
| `db:migrate` | Blocked: no `DATABASE_URL` configured |
| `db:verify` | Failed: no configured PostgreSQL target; no database was mutated |
| `git diff --check` | Passed |

Browser checks used the running local Next.js server at `http://localhost:3100`. Verified EN planning with manual start/return, preview, active controls, explicit change confirmation, marked visits, finish and local saving; reopening a saved walk from Saved now loads the correct itinerary. Saved route metadata uses the reusable route estimate rather than elapsed session time. A future deadline below one minute produces an empty route rather than a generic error. Friendly errors were checked with a temporary browser-only injected failure; loading was inspected by temporarily holding animation frames, then restoring them.

German Home and city hub, 390px mobile, 768px tablet and 320px Arabic RTL were visually inspected. Arabic and tablet document widths matched their viewports. Hamburg and Düsseldorf render from shared availability configuration without duplicated city components. Coming-soon cards do not open traveler routes.

Place-detail runtime acceptance is **blocked**: the existing auth initialization throws without `BETTER_AUTH_SECRET`. Thus real audio/playback, auth/Profile, verified-source rendering and place-to-walk round trips are not claimed as browser-verified. The associated unit/regression suite passed. Live external map tiles, GPS, model responses, cloud storage and PostgreSQL integration were not validated here. The active screenshot shows route controls and markers while external tiles were unavailable.

Screenshots in this directory are local verification artifacts, not supplied design references: [Home](home-de.png), [planner](planner-time.png), [preview](preview.png), [active](active.png), [finish](finished.png), [loading](loading.png), [error](error.png), [empty](empty.png), [Arabic mobile](arabic-320.png), [German tablet](tablet-de.png).

Review found no new database writes, RBAC changes, privileged DTO exposure or weakening of existing source/audio trust. New route context is validated server-side against city scope and eligible published places. Guest planning remains available without login. No migration, import, commit, push or deployment was performed.

## Remaining external acceptance / backend work

- Street-level pedestrian routing, traffic/closure-aware timing and guaranteed arrival are not provided by the existing engine. Distances are straight-line geographic estimates and walking time uses the shared walking-speed calculation. Maps show an explicitly approximate dashed route; external navigation opens the walking route in Google Maps. No fabricated ETA/buffer values are used.
- Return-by input uses the device's local date/time. It rejects past times rather than guessing a next-day target.
- Saved walks, current trips, ratings and time-fit feedback are device-local; cross-device cloud synchronization and feedback collection need backend persistence.
- Hotel/train-station return shortcuts appear only if represented in eligible city content; arbitrary external destinations are not fabricated. Manual destination selection uses existing published city places.
- Live AI answering still requires the existing configured Groq/rate-limit/knowledge services. Local trip adaptation works without a model. No live AI response is claimed as verified without those services.
- PostgreSQL migration/verification needs an explicitly configured non-production `DATABASE_URL`. No database target was configured in this checkout.
- Preview deployment, real-device GPS/audio/media testing and exact screenshot comparison remain external acceptance steps. No native Expo redesign or deployment was performed.

## Reference-based visual polish pass — 2026-09-24

This pass refines the existing implementation on `feat/citywalk-v2`. The eight supplied PNGs were compared as visual references, not as instructions or a source of factual city/route content. No routing, eligibility, authentication, database, entitlement, or AI trust logic was changed.

### Before / after

- Home: stronger image proportions, higher-resolution image size requests, shorter two-line descriptions, icon-plus-text availability, descriptions for both configured coming-soon cities, tighter hero spacing and reference-style navigation icons. Compare [initial Home](home-de.png) with [polished Home](polish-home-430.png).
- City hub: two-column outlined shortcut buttons became four pale-blue icon tiles. Suggestions now use larger side photos, restrained shadows and a compact text/chevron action. City description remains available below the quick actions. Compare [initial tablet](tablet-de.png) with [polished tablet](polish-de-tablet-768.png).
- Planner: step dots, illustrated clock cards, unmistakable selected borders/checkmarks, first-class return-by panel, compact icon chips and segmented walking choices. Continue remains reachable while scrolling; focus moves to the new heading and scroll resets on step transitions.
- Preview: labeled icon metrics, a calm return-by estimate, an itinerary heading/map control, compact numbered white rows and consistent thumbnails/placeholders. Compare [initial preview](preview.png) with [polished preview](polish-preview-390.png).
- Active trip: map and navigation bar have clearer prominence; Listen/Read/Ask use pale-blue tiles; four compact trip controls match the visual family. At 320px these controls use two columns to preserve readable labels and touch targets.
- Assistant/adaptation: integrated panel treatment and a focused confirmation card. The stop list is expandable so confirm/cancel stay close together without hiding access to the proposed itinerary.
- Loading: replaced the horizontal bar and generic art-first layout with a circular indeterminate walker indicator, real processing stages and a reassurance card. No numeric completion percentage is invented.
- Error/empty: centered map/compass composition, calmer text hierarchy, primary recovery and pale secondary action. Empty state omits the irrelevant connection warning. Compare [initial error](error.png) with [polished error](polish-error-390.png).
- Saved/finished: shared branding, restrained saved cards, compact completion metrics, consistent itinerary highlights and navigation.

### Screenshots and viewports

Dimensions below are CSS viewport pixels. Screenshots show the web application, without copying the reference's phone bezel or system status bar. Longer pages intentionally scroll; bottom navigation and Continue respect CSS safe-area insets. Real hardware inset/GPS/audio acceptance remains separate.

| Screen | Viewport | Screenshot |
| --- | --- | --- |
| Multi-city Home | 390 × 844 | [Home](polish-home-390.png) |
| Multi-city Home, all configured cities | 430 × 932 | [Large mobile](polish-home-430.png) |
| City hub | 390 × 844 | [Hub](polish-hub-390.png) |
| Time selection | 390 × 844 | [Time](polish-planner-time-390.png) |
| Return-by selection, scrolled | 390 × 844 | [Return by](polish-return-by-390.png) |
| Interests and walking preference | 390 × 844 | [Interests](polish-interests-390.png) |
| Manual start and return to start | 390 × 844 | [Start / finish](polish-start-finish-390.png) |
| Route generation | 390 × 844 | [Loading](polish-loading-390.png) |
| Generated itinerary and ETA | 390 × 844 | [Preview](polish-preview-390.png) |
| Active walk | 390 × 844 | [Active](polish-active-390.png) |
| Assistant and trip controls, scrolled | 390 × 844 | [Assistant](polish-assistant-390.png) |
| Adaptive confirmation, scrolled | 390 × 844 | [Confirmation](polish-confirmation-390.png) |
| Friendly error | 390 × 844 | [Error](polish-error-390.png) |
| No fitting route | 390 × 844 | [Empty](polish-empty-390.png) |
| Saved walks | 390 × 844 | [Saved](polish-saved-390.png) |
| Finished trip | 390 × 844 | [Finished](polish-finished-390.png) |
| Small mobile planner | 320 × 740 | [Small mobile](polish-planner-320.png) |
| Arabic RTL hub | 320 × 740 | [Arabic](polish-ar-320.png) |
| Arabic RTL planner | 320 × 740 | [Arabic planner](polish-ar-planner-320.png) |
| German tablet hub | 768 × 1024 | [Tablet](polish-de-tablet-768.png) |
| German tablet planner | 768 × 1024 | [Tablet planner](polish-de-planner-768.png) |

### Interaction and verification results

- City selection, available/coming-soon semantics and Saved reopening verified. Both upcoming city cards have no destination links.
- Duration/return-by, interest multi-selection, walking selection, manual start/finish, generation, Customize, Save and Start Walk exercised.
- Skip proposal retained six stops until confirmation. Confirmed shortening changed six remaining stops to four; confirmed Skip changed four to three; confirmed Add stop changed three to four. Take me back displayed review before mutation. A marked visit was retained on finishing.
- Assistant “I'm tired” opened a proposal and required explicit confirmation. This tested local adaptation, not an unconfigured live model response.
- Temporary browser-only animation-frame interception allowed inspection of the fast loading state, then normal frames were restored. A temporary thrown error exercised friendly error handling; Try again successfully produced a preview after restoration.
- A genuine short future deadline produced the no-route screen. Customize returned to step one with scroll position zero.
- Document/dialog widths matched 320, 390, 430 and 768px viewports; Arabic dialog computed direction was RTL. No horizontal overflow observed.
- Fresh isolated browser session reported **zero uncaught errors** on the city/planner flow. The older browser buffer retained historical missing-PostHog/auth errors from the initial implementation; those were not treated as current failures.
- Focused suite: **42 tests passed in 6 files**, including the final route-review presentation.
- Full suite: **786 passed, 21 skipped; 134 files passed, 5 skipped**.
- Final TypeScript (`--noEmit --incremental false`), ESLint and `git diff --check`: passed.

### Files changed in this visual pass

`src/app/globals.css`; Home and `src/app/[locale]/walks/page.tsx`; `CityExperience.tsx`, `TourCard.tsx`; walk components `CitySelector`, `CityHubActions`, `BottomNavigation`, `WalkPlanner`, `WalkOverlay`, `WalkStates`, `RouteSummary`, `WalkJourney`, `WalkMap`, `RouteChangeReview`, `FinishWalkScreen`, `SavedWalks`; EN/DE/AR walk copy; these QA screenshots and report. Prettier normalized the existing walk component directory. No dependencies or schema changes were introduced.

### Remaining mismatches / intentional differences

- The existing decorative waterfront illustration is reused. It is not an exact copy of the references' skyline, bespoke illustrations or logo mark. Error art uses the existing skyline plus vector map/compass icons.
- Only published/approved real content appears. Missing place photos use neutral map-pin placeholders; existing city photos differ from the reference. Fictional suggestions, seven-stop fixtures, reference timings and guaranteed return claims were not introduced.
- The existing three-step interaction remains. Start/finish retain accessible native selects rather than recreating the reference's combined long radio form. On narrow screens, scrolling is intentional; tablet content keeps a comfortable mobile-app reading width.
- Home retains the language selector. Suggested editorial tours retain their own identity and expandable stop list. No nonfunctional “See all” control was added when the complete available list is already shown.
- External map tiles were unavailable in this environment; screenshots therefore show the existing map controls/markers on a blank base. This prevents acceptance of the reference's detailed street-map appearance. No fabricated map was substituted.
- Backend configuration blockers from the implementation pass remain: missing production auth configuration blocks production page collection/place-detail acceptance; no `DATABASE_URL` is configured. No secrets were hardcoded and auth was not weakened. These checks were not rerun for this presentation-only pass.
- Preview deployment and real-device GPS/audio/auth/live-assistant acceptance remain external steps. No commit, push or deployment was performed.

## Artwork and image provenance

`public/images/citywalk-waterfront.webp` is a 1200px-wide decorative illustration (about 61 KB), generated using the built-in image-generation tool and optimized to WebP with the existing Sharp dependency. It is not a factual representation of the selected city and does not supply places or routes.

Generation prompt:

> Create a production website decorative header asset for CITYWALK, matching a calm premium European walking travel app. Wide landscape 3:2 composition, pure white background and generous empty white space throughout the left 55 percent and upper half for separately rendered UI headings (DO NOT render any text). On far right: elegant illustrated northern European riverside skyline with slender blue-gray gothic spires, pastel cream and pale terracotta houses, mature muted sage-green trees, a low stone arch bridge, pale blue water reflection, a soft pale peach sun and two tiny blue birds. Clean sophisticated editorial travel illustration, subtle watercolor-like soft edges, crisp architectural details, subdued navy and light blue palette. Skyline rises on right edge and fades softly into white on left, water along lower right only. No people, no lettering, no logos, no frame, no device, no UI, no gradients outside subtle illustration washes. This is decorative artwork, not a factual city map.

City photos were resized and converted to WebP; visible attribution/license links accompany the selector:

- `public/images/city-hamburg.webp`: [Avda, Hamburg Elbphilharmonie](https://commons.wikimedia.org/wiki/File:Hamburg_-_Elbphilharmonie_-_2016-2.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). The resized photo retains that license.
- `public/images/city-duesseldorf.webp`: [Turmfalke, Rheinturm](https://commons.wikimedia.org/wiki/File:Rheinturm,_Duesseldorf.jpg), [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
