# Screen 12 — Walking Routes

Status: implemented locally; awaiting visual approval. No commit, push, merge or deployment.

## Scope and baseline

- Branch: `codex/onboarding-global-welcome`; HEAD `98a1dbbda17f945a0d982eb6dbc36713bad61617`.
- Read-only remote preflight: develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591`, main `88191e77e55a489804c49bccccf6307b5876b41d`.
- Mobile Core: required, implemented. Public Web and Admin Web: unchanged/not applicable.
- Audit found published city-scoped tour cards and an existing tour preview, but no dedicated native walking-route list. Existing public summary API, `usePublicCity`, public DTOs, route preview and shared time budgets are reused. No schema, API, planner, entitlement, authentication or city-availability changes.
- Screens 01–11 source snapshots remain unchanged, verified by `frozen-sources.sha256`. The existing tour-preview route has only a new localized entry/back link to this list; its screen design and tour-start behavior were not redesigned. `preview-entry.patch` records that narrow dependency.

## Exact implementation files

Created:

- `mobile/src/app/city/[citySlug]/routes.tsx`
- `mobile/src/lib/publishedRoutes.ts`
- `mobile/tests/published-routes.test.ts`
- `mobile/tests/walking-routes.test.tsx`

Modified:

- `mobile/src/app/city/[citySlug]/tour/[tourSlug].tsx`: localized “All walking routes” entry using `dismissTo`, preserving a list already in the navigation stack.

Evidence is in this directory. `source.sha256` identifies the final source tested. Earlier uncommitted onboarding/product work was preserved.

## Behavior and content integrity

- New `/city/[citySlug]/routes` screen: dynamic city context, Navy editorial heading, duration radio filters, licensed photography, real route metadata/themes, preview action, credits and existing Saved Walks/Build My Walk/City Hub exits.
- Current canonical code catalog: one published Lübeck route, `historic-center-walk`: “Lübeck Historic Center” / “Historisches Zentrum von Lübeck”, 45 minutes, five stops. `catalog-en.json` records the local API evidence. No extra route names, ratings, durations or stops were invented.
- Filters use supported shared 60/120/180-minute budgets and actual published duration <= budget. All includes routes with unknown duration; timed filters exclude unknown durations. This 45-minute catalog route legitimately matches all three filters. Synthetic boundary/unknown-duration cases exist only in tests.
- Themes come from real stop tags. Approved tour media takes precedence; otherwise a verified first-stop photo is used and identified as that place. Holstentor uses the existing Christian Wolf licensed asset and exact centralized Photo Credits record. No new imagery or unverified legacy URLs were introduced. Unknown CMS license credits remain adjacent via existing attribution handling.
- Published-tour favorites have no existing storage/API contract. No nonfunctional heart or duplicate saving model was added. The existing Saved Walks destination and state remain available. Existing guest saving regressions pass.
- City response identity is checked; no cross-city bundled photo fallback. Publication and availability contracts remain server-owned. No staff/auth/RBAC or payment logic changed.

## Verification

| Check | Actual result |
| --- | --- |
| Mobile tests | 105 files / 901 tests passed |
| Mobile lint | Passed, zero warnings |
| Mobile TypeScript | Passed |
| Expo export | iOS, Android and Web passed; `/private/tmp/citywalk-screen12-verified` |
| Root tests | 268 files passed, 27 skipped; 1,902 tests passed, 239 skipped |
| Root lint | Passed; 15 existing warnings |
| Root TypeScript | Passed |
| Root build | Passed with synthetic localhost-only configuration; canonical code content |
| db:generate | Passed; no schema changes |
| db:migrate / db:verify | Not rerun: isolated Docker database unavailable because Docker daemon is stopped |
| Frozen source hashes | Passed |
| git diff --check | Passed |

Logs are in `logs/`. No migrations/imports were created or run against production. Root checks preceded the final native-only padding/accessibility-label refinements; the complete mobile checks and exports were rerun afterward. No new dependencies, secrets, destructive SQL or unrelated source changes were introduced for this screen.

### Native observations

iOS simulator checks: iPhone 17 Pro (402×874pt), iPhone SE (375×667pt), iOS 26.5.

- Guest access to the route list and existing preview works; no sign-in requirement added.
- Duration selection changes the radio state and retains the matching real route.
- Preview opens the selected city/route. Returning through All walking routes restores the selected filter without another list stack entry.
- Existing preview still displays the five real stops and its existing start flow.
- City Hub exit returns to the selected city; native Back restores the scrolled list.
- Saved Walks exit opens the existing guest Trips empty state.
- Small-device scrolling exposes card content, credits and footer actions. Photo Credits opens the exact Holstentor record and Back restores the list.
- English and German content/layout inspected. All four German duration controls fit the small initial viewport. Controls have 44pt minimum targets, radio roles/selected states and descriptive route accessibility labels including duration, stop count and themes. Text and filter layout can wrap; no fixed screen-height clipping is used.

Android bundle validation passed; Android device visual acceptance, physical VoiceOver/TalkBack and maximum accessibility-size runtime acceptance remain unverified. Database-backed content/integration acceptance was not claimed from the code-catalog simulator session.

## Screenshots and reference differences

- `screenshots/standard-de.png`: final standard iPhone composition.
- `screenshots/small-de.png`: final small iPhone composition.
- `screenshots/small-scroll-de.png`: small-device scrolled route, credit and actions.
- `screenshots/standard-scroll-en.png`: English scrolled content.
- `screenshots/comparison.png`: storyboard versus standard screen at matched presentation size.
- `screenshots/standard-en.png`: earlier English initial viewport, before the final minor header/filter padding refinement; not an exact final-layout artifact.

The storyboard's multiple image-overlay route cards are adapted to the actual one-route catalog and a text-rich accessible card. Its fictional route titles/timings are not copied. The current licensed first-stop photo represents Holstentor rather than an invented route photograph. There is no curated-route favorite control because that capability is not supported. Existing published duration is displayed verbatim; it is not recalculated from individual stop visit-time fields.

Stop point: Screen 12 visual approval. Screen 13 design work has not started.
