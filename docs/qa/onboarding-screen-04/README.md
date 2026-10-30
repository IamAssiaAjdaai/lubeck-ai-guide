# Screen 04 — Choose a City

25 October 2026. **Local implementation, awaiting visual approval.** Existing isolated `/private/tmp/citywalk-global-welcome`, branch `codex/onboarding-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617`. No commit, push, PR, merge or deployment. Screens 01–03 are approved and frozen; no edits made to their implementation in this pass. Screen 05 not started.

![Screen 04 English iOS](screenshots/ios-standard-en.png)

## Audit and implementation boundary

Mobile Core required; Public Web and Admin Web not applicable. iOS simulator evidence below; Android shares native source and exports successfully, but device acceptance remains unverified.

Targeted live GitHub preflight: develop `84a8a570389bb8bcf85250f1b528fd7b2687ebd8`, #452, selected-place preservation in `walkPlanner.ts` and its tests. No selection UI overlap. Owner-requested stacked worktree retained without rebasing or importing unrelated work. Local uncommitted verification is not exact-head GitHub CI, merged or deployed evidence.

| Capability | Baseline and result |
|---|---|
| City selection | Already existed in `mobile/src/app/index.tsx`, selected by existing `section=cities`. Redesigned this presentation in place, without a second route/store/selection engine. |
| Publication/content | Existing `usePublicCities(locale)` and public API responses remain authoritative. No new backend, DTO, content imports or city data. |
| Launch eligibility | Existing `cityLaunches` filter unchanged. API presence cannot activate coming-soon cities. Unconfirmed API content remains unavailable and non-navigable. |
| Search | Same query state, localized/original city-name matching and empty state. Native search verified by filtering to Hamburg. |
| Location | Same explicit permission request, adapter, optional denial/error and distance sort; available cities stay ahead of upcoming cities. No auto-select or permission request on mount. |
| Localization | Existing locale selector, messages and city-name resolution. Added seven-locale heading/reassurance copy; EN/DE inspected on both devices. |
| Guest entry | Same city Link and prefetch. Native selection opened the existing Lübeck experience without account creation/sign-in. No city-selection persistence or duplicate destination system added. |
| Failure/loading | Existing public-content loading/retry and no-results behavior reused. Tests verify no selectable city when API confirmation is unavailable. |
| Authentication / City Pass | Untouched. Guest-first, €4.99 / 72 hours, one-time payment, no automatic renewal retained. |

The normal Home presentation remains unchanged. `preservation.json` asserts its JSX and existing style section match the before-source snapshot. The same HomeCityCard now accepts a focused stacked-card presentation; its legacy modes retain their UI. Screen 04 suppresses the root tab bar to follow the onboarding reference's focused city-choice composition; existing Back/history or Welcome fallback remains available. Normal Home retains its bottom navigation.

One narrow existing localization issue was found during permission testing: location help was stored as translated text, so switching locale afterward retained the old language. It now stores the same nearest/optional status and renders current localized text. Permission, distance, availability and routing logic are unchanged. A regression test covers switching EN→DE after denial.

## Visual reference and licensing

Follows the approved 24-screen reference: Navy editorial question, pale rounded search field, full-width city photography cards, clear availability badges and an arrow only on navigable cities. Adds a guest reassurance and preserves the existing optional location action. The real registry supplies Lübeck, Hamburg and Düsseldorf; reference-only Regensburg was not introduced. Countries are not invented for API cities without country data. The German headline wraps to three normal-size lines. Lower cards continue in native ScrollView on small devices.

CITYWALK stays a global brand: heading and copy name no default destination. Lübeck is the first currently available result. Hamburg/Düsseldorf are disabled Coming Soon cards, including native disabled accessibility state. New headline uses Georgia on iOS and Android serif; controls retain existing components and Navy #09234D / Blue #155CAF / Off-white #FBFDFF identity.

No new photos downloaded. Reuses licensed assets already in the worktree:

- Lübeck: existing original `introduction-holstentor.jpg`, Christian Wolf (c-w-design.de), **CC BY-SA 3.0 DE**.
- Hamburg: existing `home-hamburg.webp`, Avda, **CC BY-SA 3.0**.
- Düsseldorf: existing `home-duesseldorf.webp`, Turmfalke, **CC0 1.0**.

Existing `welcomePhotos` provenance supplies source/license URLs. Existing MediaAttribution renders author, resized/cropped disclosure and functional source/license links beneath each card. The exact DE license label and URL are retained. Future API cities use their existing remote image and media attribution. [Existing provenance](../../../mobile/assets/images/welcome-photos.LICENSE.md), [original Holstentor record](../../../mobile/assets/images/introduction-photos.LICENSE.md). No image implies launch readiness.

## Native evidence and limits

Existing development binary + current Metro bundle, iOS 26.5; not signed release or physical-device evidence.

| Device | English | German |
|---|---|---|
| iPhone 17 Pro, 402×874 pt | [Standard EN](screenshots/ios-standard-en.png) | [Standard DE](screenshots/ios-standard-de.png) |
| iPhone SE 3, 375×667 pt | [Small EN](screenshots/ios-small-en.png) | [Small DE](screenshots/ios-small-de.png) |

- [Native search](screenshots/ios-small-search.png): Hamburg-only result remains disabled. Activating the disabled card did not navigate.
- [Location denial](screenshots/ios-location-denied.png): denied the system prompt, optional help appeared and city search/entry remained available.
- [Guest city entry](screenshots/ios-guest-city-entry.png): existing city experience rendered without authentication.
- [Maximum German text](screenshots/ios-small-de-max-text.png), scale 3.571: adaptive headline base size avoids splitting words, text reflows, cards have growing minimum heights rather than fixed text clipping. The selection Screen remounts its presentation when font scale changes to force native text-layout remeasurement; query/location state stays in its existing parent. Simulator text restored to normal afterward.

Native accessibility tree confirms labeled city search, available city action, source/license links and disabled upcoming-city descriptions. Existing Screen retains safe areas, keyboard-aware scrolling and keyboard dismissal on drag. Full maximum-text touch-scroll traversal, VoiceOver/TalkBack, small/Android keyboard and physical-device acceptance remain manual checks; this is not a full WCAG or device-release sign-off.

The first guest entry attempt reached existing unavailable-content UI because the local API had stopped. Local HTTP checks confirmed the endpoint was unreachable. A fresh task-owned localhost fixture database and local Next API preview restored it; city detail returned HTTP 200 and guest entry then succeeded. The standard npm predev hook tried shared local Compose startup and failed; Next was run directly against the disposable database instead. No production DB/infrastructure changes or application-flow workaround. The task-owned preview on localhost:3000 and database container `cw-screen04-qa` remain running for local review.

## Verification

Logs in `logs/`; exact local sources in `source-sha256.json`.

| Gate | Actual result |
|---|---|
| Full mobile suite | **826 passed**, 95 files. Existing auth/approved-screen/Home tests retained; new coverage includes EN/DE search, publication-vs-launch conflict, API error/retry, loading, denied/available location, distance sorting, live feedback translation, provenance and a second published test-city route. |
| Mobile lint / TypeScript / public config | **Pass**, lint zero warnings. |
| Expo Doctor | **21/21 pass**. |
| Android Hermes export | **Pass**, `/tmp/cw-screen04-final-android`; device acceptance unverified. |
| Root tests | **1,902 passed / 239 skipped**, 268 passed / 27 skipped files. Skips are not passes. |
| Root lint / types / build | **Pass**; root lint 0 errors / 15 existing warnings. Build used synthetic auth settings and disposable localhost DB. |
| `db:generate` | **Pass**, no schema changes. |
| `db:migrate`, canonical seed, `db:verify` | **Pass**, fresh task-owned localhost Postgres 16; 1 city / 25 places. No production data/credentials. |
| Diff / frozen-screen checks | **Pass**. `locked-screens.sha256` confirms Screens 01–03 remain byte-identical to start of this pass. |

No backend/schema/package/lockfile/authentication/payment changes. React review: existing stable city keys/state/hooks retained; no nested component definitions, conditional hooks, duplicate network source, destination persistence or new global store.

## Exact files changed in this pass

- `mobile/src/app/index.tsx`: focused selection presentation; same card supports stacked visual mode; original licensed-photo reuse/attribution; adaptive type; narrow location-feedback translation fix.
- `mobile/src/lib/citySelectionCopy.ts`: new localized heading and guest reassurance.
- `mobile/tests/home-presentation.test.tsx`: discovery regression matrix, native mocks and provenance coverage.
- `mobile/tests/native-screen-chrome.test.tsx`: Platform mock required by the native font selection.
- This QA directory: before-source, hashes, screenshots and logs.

Earlier uncommitted Screen 01–03/shared UI/photo files are preserved, not edits from this pass. Stop at Screen 04 visual approval. No Screen 05 implementation, commit/push, merge or deployment.
