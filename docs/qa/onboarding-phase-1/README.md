# CITYWALK onboarding · Phase 1 / Screen 01

> Historical first-draft audit. The updated user storyboard/request supersedes this visual composition; see [current 24-screen map and Screen 01 review](../onboarding-reference/README.md). Earlier screenshots and results are preserved as historical evidence.

Date: 25 October 2026 (Europe/Berlin). Status: local implementation; visual approval pending. No commit, push, PR, merge, deployment, production infrastructure, auth, city availability or payment change.

## Evidence and scope

- Branch: `codex/onboarding-global-welcome`
- Worktree: `/private/tmp/citywalk-global-welcome`
- Freshly fetched `develop` / base: `98a1dbbda17f945a0d982eb6dbc36713bad61617`.
- `main`: `88191e77e55a489804c49bccccf6307b5876b41d`; untouched.
- The original checkout is dirty on `codex/project-skills-bootstrap`; its tracked/untracked files and all other worktrees were preserved. In-flight Android Auth0, Marketing, Preview and commerce branches were not integrated or modified.
- User's attached 24-screen storyboard is a visual reference, not authority to require account creation, activate Regensburg, change pricing or implement all screens. This handoff implements only Screen 01. Screen 02 requires visual approval first.
- Mobile Core: iOS + Android required; shared React Native implementation. Public Web: not applicable to implementation; existing acquisition/SEO/share/legal/preview preserved. Admin Web: not applicable.

Read-only GitHub audit refreshed branch inventory (all pages), the 100 most recently updated PRs, #136 and owner comments, #387 including latest founder direction, and #424. Recent PR snapshots with exact head SHAs are in `github-evidence.json`. No exact-base check runs were returned for `98a1dbb`; this is not a CI pass. Uncommitted changes have no remote CI status. Merged source is not evidence of deployment or device acceptance.

Relevant observed merged work:

| Evidence | Existing implementation / implication |
|---|---|
| [#333](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/333) | Approved native editorial Home (`269f7e7` integration commit); retain it as the discovery destination. |
| [#344](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/344), [#345](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/345) | City Hub and Places UI already exist. |
| [#352](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/352), [#353](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/353), [#356](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/356) | Interests/pace, return-by time and manual/location start/finish choices already exist. |
| [#357](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/357), [#363](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/363) | Walk preview and active walk already exist. |
| [#421](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/421) | Expo 57 compatibility patch merged; independent Android Auth0 work remains untouched. |
| [#427](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/427), [#428](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/428), [#430](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/430) | Approved Web landing/homepage/legal integration exists; no landing redesign needed. |
| [#419](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/419), [#422](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/422), [#389](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/389), [#375](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/pull/375) | Separate open Preview, mobile readiness and commerce work; no incidental integration. |

[ARCH-01 #136](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/136) defines native-first surfaces. Latest [#387 founder direction](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/issues/387#issuecomment-6318994868) keeps guest Free + real native Premium launch and approved landing/legal. This task explicitly authorizes the isolated Welcome design, but gives no release permission. City Pass remains €4.99 / 72 hours, one-time payment, no automatic renewal; subscription products and entitlements remain untouched.

## Baseline screen implementation matrix

“Implemented” describes functional source availability, not storyboard equivalence, approved new visuals or physical-device acceptance. Shared iOS/Android source exists for the existing native routes; each device acceptance remains separate.

| Reference | Native baseline | Reuse / gap | Web baseline | This slice |
|---|---|---|---|---|
| 01 Global Welcome | **Missing** dedicated welcome; `/` is working multi-city discovery | Reuse brand, palette, native primitives, locale selector | Approved acquisition landing exists | **Implemented locally** at `/welcome`; launch `/` deliberately unchanged pending approval |
| 02 Product Value Story | **Partial** value copy on Home and city surfaces; no optional standalone value story | Optional short story, skip directly to discovery; avoid eight forced screens | Value sections on approved landing | Deferred |
| 03 Account / Sign-in | **Implemented** optional email/account/social-provider UI, recovery and deletion | `mobile/src/app/account/index.tsx`, existing Better Auth provider flags; live provider acceptance separate | Localized `/[locale]/account` and recovery | Unchanged; no gate before discovery |
| 04 Choose a City | **Implemented** API-published cards plus launch registry and disabled upcoming states | `mobile/src/app/index.tsx`, `usePublicCities`, shared `cityAvailability.ts`; retry/search/location already exist | `/explore`, localized city routes | Both Welcome actions enter existing discovery; no city selected automatically |
| 05 Interests Personalization | **Implemented** in planner and account-scoped travel style; not onboarding | `NativeWalkFlow`, `NativeTourPlanner`, `travelerStyle`, shared planner rules; do not duplicate defaults or silently persist guest preferences | Existing planner/preferences | Unchanged |
| 06 Available Time | **Implemented** walking durations/return-by controls; storyboard multi-day presets not equivalent | Existing shared minutes/return-by model and native picker; multi-day semantics need product decision | Existing planner | Unchanged |
| 07 Location Explanation | **Partial** contextual request, denied/unavailable/manual fallback; no dedicated illustrated onboarding screen | `location.ts`, `location.expo.ts`, planner start choices; only request on explicit action | Existing geolocation controls/fallback | No location request on Welcome |
| 08 First Experience / City Entry | **Partial** functional city hub/entry already implemented; no dedicated “all set” interstitial | Generic `/city/[citySlug]`, publication/launch gating; interstitial may be unnecessary | Existing city pages | Unchanged |

Source audit also inspected `mobile/src/app/_layout.tsx`, design tokens/RTL helpers, localization provider, image fallback, button primitives, auth configuration and Web routes. No routing/auth/planner/domain/API/schema replacement is needed.

## Implemented slice and acceptance

`citywalk://welcome` opens the isolated screen. From the Expo development client, connect to this worktree first; `citywalk://welcome` then navigates to the screen. Launch is not rewired and no onboarding-completion storage is introduced before approval.

- Global brand/message: “Walk any city. Your way.” / “Your personal city experience, at your own pace.” Lübeck is only the photo caption “Our first destination”. No destination or entitlement is inferred from imagery.
- Navy `#09234D`, Blue `#155CAF`, Off-white `#FBFDFF`; reuse existing brand SVG and UI tokens. Native Georgia on iOS / serif on Android, native Arabic type and RTL copy.
- Authentic Holstentor photography by Christian Wolf (www.c-w-design.de), licensed CC BY-SA 3.0 DE. Local WebP with visible attribution/source/license links. Provenance and derivative terms: `mobile/assets/images/welcome-holstentor.LICENSE.md`. No generated city photo.
- Both “Get started” and “Explore cities” replace with existing `/?section=cities`; same temporary destination is intentional until Screen 02 approval. Home/city deep links, readiness, localization, native auth and all purchases remain unchanged.
- Local bundled media requires no network to show Welcome. `NativeContentImage` supplies loading/failure placeholder. A failed external credit link shows a localized alert without blocking discovery. No fake loading timer, provider call or permission request.
- Reuse `PrimaryButton`, `PressableSurface`, `AppText`, `LocaleSelector`, `NativeIcon`, `NativeContentImage`, `useNativeLocale`, safe-area layout and `useReducedMotion`. Reduced motion disables image/route fade. Flexible scroll container supports short/landscape screens and larger text without forced truncation.

Exact created files: this report, GitHub evidence snapshot, screenshots and verification logs under this directory; `mobile/src/app/welcome.tsx`; `mobile/src/lib/welcomeCopy.ts`; `mobile/tests/welcome.test.tsx`; `mobile/assets/images/welcome-holstentor.webp`; `mobile/assets/images/welcome-holstentor.LICENSE.md`. The only modified existing application file is `mobile/src/components/LocaleSelector.tsx`: its backdrop no longer groups language choices into a single accessible element, and the menu supports the iOS accessibility escape action. This narrowly fixes an observed accessibility problem in the reused Welcome control; layouts, locale selection and surrounding flows are unchanged. The simulator accessibility tree verified separate checked/unchecked radio options after this fix.

## Visual and verification evidence

See `verification.md` for exact results and coverage limits. iOS simulator evidence uses an existing local native development binary with this worktree's Metro bundle; it is not a newly signed release binary. Android native compile/device acceptance is not established by a shared TSX component or tests. Physical VoiceOver/TalkBack and owner visual approval remain pending.

## Next screen and dependencies

Next proposed: **02 — Product Value Story**, only after approval of 01. One optional editorial value screen with a persistent discovery skip; account entry stays optional and downstream. Reuse existing Home/city capability copy and verified imagery; do not invent offline/AI/audio coverage. Before implementation: agree short content hierarchy, skip/continue destinations and first-run/revisit policy. Choose completion storage and launch wiring together, preserving returning travelers and deep links. Interests/time stay contextual to planning unless a separately approved guest preference contract makes onboarding useful. Do not create new cities or activate current “coming soon” cards.

Next safe priorities: visual approval of 01 → optional story scope/skip agreement → implement only 02 with iOS/Android evidence. Release/Preview/store acceptance remains owned by existing tickets.
