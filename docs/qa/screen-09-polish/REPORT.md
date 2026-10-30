# Screen 09 — targeted visual polish

2026-10-25, local visual approval candidate. Branch `codex/onboarding-global-welcome`, worktree `/private/tmp/citywalk-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617`. Continued the approved stacked implementation; no commit/push/merge/deployment. Mobile Core required; Public Web/Admin Web unchanged.

## Audit and scope

Targeted GitHub refresh confirmed develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591` (#448 isolated Preview policy), with no overlapping native changes. Read existing CITYWALK architecture/workflow, engineering/design skills, native instructions, navigation sources and Expo SDK 57 Link guidance. Original storyboard and prior native implementation were the visual references. Baseline sources are saved in `baseline/`; `implementation.patch` records only this polish's production delta, rather than combining it with previous onboarding work.

Screens 01–08 are untouched: all 16 frozen source hashes match `logs/frozen-screens.log`. No shared styles, navigation helpers, city data, preference contracts, recommendation logic, planner logic, authentication, GPS provider, API/schema, payments, asset or license files changed in this polish. City Pass remains €4.99 / 72h / one-time / no automatic renewal.

## Exact modified files

- `mobile/src/components/CityHubHero.tsx`: remove generic greeting, reduce copy padding and headline from 31/38 to 28/34, reduce photographic panel from 174 to 128 points. Dynamic city identity, switcher, photography source and credit control remain. Normal-text hero drops from approximately 323 to 226 points (97 points / 30%). Text flows naturally at larger scales; no fixed total hero height or text truncation.
- `mobile/src/app/city/[citySlug]/index.tsx`: reduce suggested-tour photo height from 164 to 112 points; preserve all existing real route text/metadata/links. Carry the existing `returnToPlanner` entry flag into the Guide route so its fallback preserves the retained planner.
- `mobile/src/app/city/[citySlug]/assistant.tsx`: keep honest city-wide-unavailable explanation; add existing localized Explore Places CTA only when published city places exist. It dismisses back to the same hub with `section=places` and preserves the retained-planner flag. No fake place context, generated answer or provider call.
- `mobile/tests/native-v2-regressions.test.tsx`: localized supported fallback route and retained-planner dismissal assertions, with the real route component and native bridges mocked.
- `mobile/tests/city-hub-actions.test.tsx`: retained-planner flag propagation into Guide, alongside existing city/GPS/guest/action checks.

Documentation/evidence: this folder. All other dirty files predate this polish.

## Navigation audit

`activeNativeTab` maps `/` to Home (or Explore for `section=cities`), city routes to Explore, walk/tour routes to Trips, and saved/profile routes to their respective tabs. `NativeBottomNavigation` owns the existing global Home and dedicated city Explore destinations. The City Hub's Explore state therefore matches current route ownership; no tab state or destinations were changed to imitate the storyboard.

A native check of the initially considered dedicated Explore fallback exposed an **existing crash** in `/city/[citySlug]/explore`: its linked search control passes an array style to Expo Router Slot. That source predates this task. It is outside the requested Screen 09 polish and remains unchanged, as does the Explore tab's destination. The new Guide fallback uses the already working hub Places section instead. This is an unresolved navigation gap for the separate Explore screen, not a passing full-app navigation acceptance claim. Screen 10 was not implemented or restyled.

## Matched native screenshots

Actual simulator screenshots, not browser previews:

| Device / locale | Before | After |
| --- | --- | --- |
| iPhone 17 Pro, iOS 26.5, 402×874 pt, German | [Before](screenshots/ios-standard-before-de.png) | [After](screenshots/ios-standard-after-de.png) |
| iPhone SE 3, iOS 26.5, 375×667 pt, German | [Before](screenshots/ios-small-before-de.png) | [After](screenshots/ios-small-after-de.png) |

Standard iPhone initial viewport now visibly includes the first tour's **complete German title, 45 Min., and 5 Stopps** without scrolling. These values come directly from the published API tour; the editorial estimate was not recalculated or replaced. Small iPhone shows Suggested Walks and the first photo; details remain scroll-accessible.

Additional evidence: [English small iPhone](screenshots/ios-small-after-en.png), [largest German text](screenshots/ios-small-accessibility-de.png), [large-text primary action](screenshots/ios-small-accessibility-actions-de.png), [retained Food preference after Guide fallback](screenshots/ios-retained-preferences-after-guide.png). Task QA text settings were restored after testing. Standard-device automation later timed out during device switching; its screenshots were captured successfully and remaining interaction checks were completed on the responsive small simulator.

## Actual interaction checks

- City switch → approved guest picker → available Lübeck → hub. Hamburg and Düsseldorf remained disabled / Coming Soon.
- Photo information opens Christian Wolf attribution, original source and CC BY-SA 3.0 DE license information, then closes. Same licensed asset and existing credit modal; no new media or license assumptions.
- Build My Walk enters the guest interest flow and Back returns to hub, including at maximum German text size.
- Explicit Near Me opens native foreground permission only after tap. Denial displays the existing localized message and leaves discovery working; no location was shared.
- Suggested card opens the real published route with the same 45-minute estimate and five stops; Back returns to hub. No walk was started.
- Ask CITYWALK → honest unavailable state → Explore Places → same hub's working Places section → Holstentor. The real place detail exposes the existing place-specific Ask CITYWALK action; no provider request was made.
- Guest state retention: select Food → continue through time → Not Now for location → approved Screen 08 → hub → Guide fallback → hub → Build My Walk. Returned to the retained planner with Food checked, rather than opening a fresh planner.
- EN/DE native copy inspected; automated locale tests also cover other existing native locales. Largest-text hero, CTA wrapping, safe-area shell and accessibility scrolling inspected on small iPhone. Quick Actions retain 20-point icons, consistent spacing, 64-point minimum targets and adaptive full-width wrapping. City/credit controls retain 48-point targets; primary CTA minimum remains 56 points. White/navy contrast is 15.45:1 and white/brand-blue CTA contrast is 6.60:1; headings stay on solid navy.

Mouse-wheel/touch-drag simulation remains unreliable; offscreen controls were reached through native accessibility scrolling and the working measured Places shortcut/status-bar return-to-top. Physical swipe and VoiceOver acceptance are not claimed. Android native visuals remain unverified; both native platform bundles pass.

## Automated verification

| Check | Result |
| --- | --- |
| Mobile suite | **867 passed**, 100 files |
| Root suite | **1,902 passed / 239 skipped**, 268 passed / 27 skipped files |
| Mobile lint | Passed, zero warnings |
| Root lint | Passed, zero errors / 15 existing warnings |
| Mobile / root TypeScript | Passed |
| Expo config | Passed |
| Expo Doctor | **21/21 passed** |
| iOS / Android Hermes exports | Passed: `/private/tmp/citywalk-screen09-polish-final` |
| Next build | Passed with synthetic auth settings and task-owned local QA DB |
| db:generate | No schema change / no migration generated |
| db:migrate | Passed on disposable local QA DB only |
| db:verify | Passed: 1 city / 25 places |
| Frozen Screens 01–08 | All 16 hashes match |
| Diff check | Passed |

DB checks used only `citywalk_qa` on localhost:55604. No production state, schema, RBAC, DTO, import, entitlement or provider capability changes. React review: hooks remain unconditional, Link children retain object styles, fallback remains city-scoped and content-gated, stale preference handling and guest planner ownership are preserved.

## Remaining reference differences and acceptance gaps

- Retained existing CITYWALK header and Explore-owned hub, rather than changing the storyboard's Home/Guide tab arrangement. The separate Explore tab still exposes the pre-existing Slot crash described above.
- Real local content provides one published route, with 45 minutes / five stops, rather than the storyboard's illustrative routes/metadata. Guest routes remain editorial; account-owned interests still rank actual tours using existing logic.
- Route title and metadata remain on solid off-white beneath the photograph for contrast and text reflow; they are not overlaid on the photograph as in the storyboard. City photography crops reflect the licensed available asset. No fabricated weather, avatar, search or city-wide Guide capability.
- Small screens and large text require scrolling; Android device, physical swipe and VoiceOver acceptance remain external checks.

Stop for **final Screen 09 visual approval**. No Screen 10 implementation, commit, merge or deployment.
