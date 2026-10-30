# CITYWALK Screen 02 — optional product value story

25 October 2026. **Screen 01 owner-approved; Screen 02 locally implemented, awaiting visual approval.**

Worktree `/private/tmp/citywalk-global-welcome` · branch `codex/onboarding-global-welcome` · base develop `98a1dbbda17f945a0d982eb6dbc36713bad61617`. Continuing the same owner-authorized isolated worktree and preserving all existing Screen 01 and unrelated checkouts. No commit, push, PR, merge, deployment or production operation.

![Screen 02 iOS preview](screenshots/after-ios-en.png)

## Scope and source of truth

Targeted GitHub refresh confirmed develop remains `98a1dbbda17f945a0d982eb6dbc36713bad61617` and main `88191e77e55a489804c49bccccf6307b5876b41d`. [Develop revision](https://github.com/IamAssiaAjdaai/lubeck-ai-guide/commit/98a1dbbda17f945a0d982eb6dbc36713bad61617). Onboarding-title PR search returned the independent Marketing work and city-content imports, not a dedicated CITYWALK traveler value-story implementation. Existing map/source review found no standalone value-story route. This continuation implements only Screen 02 against the supplied revised storyboard and today's owner authorization; no new release/merge readiness claim.

Mobile Core required: shared iOS/Android implementation. Public Web and Admin not applicable; existing functionality preserved. Current local changes have source hashes in `source-sha256.json`; local gates are not GitHub exact-head CI for the uncommitted diff.

## Experience and navigation

- Three-photo editorial collage, Navy Georgia/Android-serif headline “More than / just sightseeing,” four compact static feature rows and Blue Next action. Palette, spacing, UI buttons, locale selector, image loading/placeholder, safe areas and reduced-motion behavior reuse existing primitives.
- Four claims map to existing native capabilities: curated tour/walk routes, place stories and exact-locale audio, Hidden Gems, and the existing city Guide. “Features vary by city and language” avoids promising universal content/Guide/audio coverage. No claim of offline functionality or unlimited AI, new city readiness, or included premium access.
- Screen 01's approved visuals remain unchanged. Its Get Started now pushes `/introduction`. Screen 01 Explore Cities still skips directly to `/?section=cities`.
- Screen 02 Next and Explore Cities both replace with existing guest discovery until Screen 03 is separately approved. No simulated account step, forced authentication, location request or completion persistence. Back uses real navigation history, falling back to `/welcome` when unavailable.
- Footer remains outside the scroll view and above the bottom safe area. Collage height adapts to available height. Long translations/larger text can reflow without truncation; footer remounts when Dynamic Type changes so label measurements update correctly. No font scaling disabled.
- Licensed Prague / Hamburg / Lübeck assets reused unchanged from Screen 01. No new downloads or imagery license added. [Provenance](../../../mobile/assets/images/welcome-photos.LICENSE.md). Photo credits opens all three creators, exact licenses, source/license actions and the editorial-inspiration availability notice. Close remains fixed; failed link feedback remains visible beside it.

No schema/API/auth/RBAC/city-scope, media trust, audio fallback, registry, backend, dependency, Web, Admin or infrastructure changes. The guest discovery and launch readiness rules remain authoritative. City Pass is unchanged: **€4.99 / 72 hours, one-time payment, no automatic renewal**.

## Modified file boundary

| File | Change |
|---|---|
| `mobile/src/app/introduction.tsx` | New optional Screen 02, collage, feature rows, navigation, persistent footer and functional credits. |
| `mobile/src/lib/introductionCopy.ts` | Localized copy for all 7 existing locale contracts, including experimental Arabic without enabling it. |
| `mobile/src/app/welcome.tsx` | Only Get Started navigation and its explanatory comment change. Visual styles/copy/assets are preserved. |
| `mobile/tests/welcome.test.tsx` | Guest skip, Screen 01→02 navigation, all locales, Next/back/fallback, reduced motion, photo attribution/link failure and close coverage. |
| `docs/qa/onboarding-screen-02/` | This report, screenshots, raw logs and exact source hashes. |
| `docs/qa/onboarding-final-polish/README.md`, `docs/qa/onboarding-reference/SCREEN-MAP.md` | Record Screen 01 owner approval and link the current Screen 02 continuation. Historical evidence retained. |

Earlier shared `LocaleSelector.tsx` and `ui.tsx` branch changes remain untouched in this step. No manifest/lockfile, migration, production credential or unrelated application change.

## Native observations

Local pre-existing development binary with the current isolated worktree Metro bundle, **iOS 26.5**. No new signed native binary or physical-device acceptance claimed.

| Check | Evidence/result |
|---|---|
| iPhone 17 Pro, 402 × 874 points | [English preview](screenshots/after-ios-en.png); all four rows and both bottom actions visible at default text size. |
| iPhone SE 3rd generation, 375 × 667 points | [English](screenshots/after-ios-small.png), [German](screenshots/after-ios-small-de.png); all rows and both actions visible. |
| Welcome → Screen 02 | Get Started verified in actual simulator; navigation is optional, not a replacement for the root launch. |
| Next and skip | Both verified on iPhone SE opening existing guest city discovery without sign-in; [Next](screenshots/next-guest.png), [skip](screenshots/skip-guest.png). Lübeck remains available, Hamburg/Düsseldorf coming soon. |
| Photo information | [German credits](screenshots/credits-ios-small-de.png); all three photo identities/links exposed; modal Close works. Individual link dispatch and recovery tested automatically. |
| Maximum Dynamic Type | [Small iPhone German footer](screenshots/large-text-footer-ios-small-de.png), scale 3.571. Both labels are visible and wrap above the safe area after remeasurement. Only the top content viewport is captured; full scroll traversal/manual VoiceOver is unverified. Text-size setting restored to original `large` afterward. |

Accessibility review: semantic heading and native button/link roles; clear localized names and guest hints; decorative feature icons hidden from assistive technology; 44-point back/credits/locale targets, 48-point skip and 56-point primary minimum height; no automatic motion; reduced-motion image/route/modal transitions disabled. Navy on off-white contrast **15.15:1**, white primary label on Blue **6.60:1**, Blue skip on off-white **6.47:1**. This is not complete WCAG certification.

Android shares the implementation and passes Hermes export. Actual Android rendering, physical iOS/Android, VoiceOver/TalkBack, RTL native acceptance and full maximum-text scroll traversal remain unverified. No unsupported locale or city was activated.

## Automated verification

Raw results in `logs/`. Full mobile suite: **802 passed, 94 files**. Welcome/Screen 02 behavior coverage: **29 tests** (16 Welcome + 13 value story). Mobile lint: **zero warnings**. Mobile TypeScript and config validation: **pass**. Expo Doctor: **21/21 pass** after retrying official schema/directory checks with network access; initial sandbox DNS request failed. Android Hermes export: **pass**.

Root tests: **1,902 passed, 239 skipped**; 268 passed files / 27 skipped. Root lint: **0 errors / 15 existing warnings**. Root TypeScript: **pass**. Root build: **pass**, 785 generated pages with synthetic local auth settings. `db:generate`: **pass**, no schema changes. `db:migrate`: **pass** on a fresh disposable local Postgres 16; canonical fixture seeded there only; `db:verify`: **1 city / 25 places**. The task-owned disposable container was stopped/removed after verification. `git diff --check`: **pass**. Skipped integration tests are not claimed as passes; no live AI/payment/provider or production database used.

Root gates cover the unchanged Web/backend; final native typography/measurement corrections additionally received focused/mobile checks and native rendering. React review found no new fetch waterfalls, effects, dependencies or shared mutable state; assets and static features stay outside render, state is local, errors are recoverable and domain rules are reused.

## Approval checkpoint

Stop at **Screen 02 visual review**. Screen 03 is not implemented or activated. Proposed next work after approval: reuse the existing traveler account/sign-in route as an optional step, preserving guest discovery and existing identity boundaries. No commit/push, merge or deployment performed.
