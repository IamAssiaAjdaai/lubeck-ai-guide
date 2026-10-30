# CITYWALK · reference-faithful Screen 01 review

Historical visual-direction candidate. The owner approved this direction; the [final Screen 01 polish report](../onboarding-final-polish/README.md) supersedes its screenshots and behavior descriptions.

25 October 2026 · **Local implementation; awaiting owner visual approval**.

Worktree: `/private/tmp/citywalk-global-welcome` · branch `codex/onboarding-global-welcome` · base `98a1dbbda17f945a0d982eb6dbc36713bad61617`. No commit, push, PR, merge, deployment, production infrastructure or payment change.

The user's new pasted request and updated storyboard replace the previous visual interpretation. The [complete 24-screen map](SCREEN-MAP.md) records reference → current route → component → visual changes → functional dependencies and gaps. The prior [baseline audit](../onboarding-phase-1/README.md) is historical evidence, not the current screen specification. Only Screen 01 changed in this step; Screen 02 still requires approval first.

![Reference compared with native Screen 01](reference-comparison.png)

![Previous draft compared with revised native Screen 01](before-after.png)

## Visual changes

- Full-screen authentic city photograph replaces the white card/photo composition.
- Centered skyline mark reconstructed as SVG from the approved reference, with condensed CITYWALK wordmark. Scoped to Welcome; existing brand artwork elsewhere is preserved.
- Reference copy and hierarchy: “Discover cities / deeper, your way.” in Navy over the sky. No Lübeck-specific badge or city selection on the global cover.
- Primary Prague photograph plus four-photo manual gallery (Prague, Hamburg, Düsseldorf, Lübeck), each with real source/license records. No automatic slide timer. Original small Home assets were too soft at full-screen scale, so Welcome uses separately optimized 1200 × 2600 portrait derivatives of the licensed sources; other screens' images are unchanged.
- Bottom Blue rounded Get Started CTA, larger label adjusted against the reference proportions, and four compact photo dots. One 104 × 44 accessible adjustable gallery control avoids overlapping tiny touch targets; tap advances, accessibility increment/decrement changes photos. This changes photography only, never availability or routing.
- Navy chevron exits directly to existing guest discovery. The reference does not show a language or licensing control; small globe/photo-info controls are retained for localization and image credits. Credits include an explicit editorial-inspiration/actual-availability distinction.
- Reuse existing primitives/tokens/safe areas/localization/image fallback/guest router. A transparent Welcome-only locale trigger and optional PrimaryButton label style preserve all other defaults. Existing locale modal accessibility fix remains included from the prior step.
- Scrollable short/large-text layout; fixed visual logo semantics; actual font scaling retained for headline/actions. At large text sizes the headline receives a light readability surface and a smaller base type size while retaining system scaling. Dynamic Type remounts the content container to remeasure correctly. Default-size composition remains photographic/full-screen.

## Comparison and actual limits

Reference crop: **175 × 344 pixels**, extracted from the user-supplied 1536 × 1024 storyboard and enlarged only for comparison. It provides no original font files, exact photograph asset, native viewport dimensions or device specification. Native capture: **iPhone 17 Pro simulator / iOS 26.5 / 402 × 874 logical points / 1206 × 2622 pixels**, using the existing local development binary with this worktree's Metro bundle. Both comparison images use equal display widths and preserve source aspect ratios; they are **not same-viewport or pixel-identical evidence**.

Matched: full photographic canvas, skyline/condensed lockup, centered two-line headline, Navy/Blue hierarchy, bottom rounded CTA and four dots. Deliberate practical differences: authentic licensed photograph rather than extracting the reference art as a shipping asset; native safe areas/home-indicator space; accessible gallery hit area; small language/photo-credit controls. Skyline and wordmark are close reconstructions, not the unavailable original vector/font assets. The source photograph's rooflines/light and the taller physical-device aspect ratio remain visible differences. No similarity percentage or exact visual acceptance is claimed.

The current screenshot was inspected against the reference and corrected for CTA height/label scale, dot spacing, foreground sky gradient, and native-resolution photo quality. Owner approval of these remaining differences is pending.

## Exact application files in this branch

| File | Change |
|---|---|
| `mobile/src/app/welcome.tsx` | Created isolated full-screen Welcome, manual gallery, localized credits modal, existing guest exits, reduced motion and responsive text. |
| `mobile/src/lib/welcomeCopy.ts` | Created copy for the 7 supported locales plus photo provenance; no locale enabled or city added. |
| `mobile/src/components/LocaleSelector.tsx` | Modified: retained prior accessibility fix; added transparent Welcome-only trigger. Home/other variants unchanged. |
| `mobile/src/components/ui.tsx` | Modified: optional `PrimaryButton.labelStyle`; no default style/behavior change. |
| `mobile/tests/welcome.test.tsx` | Created/updated 13 behavior tests for guest exits, supported locales, manual gallery/no navigation, reduced motion, correct selected-photo licensing and failed-link recovery. Native bridges mocked. |
| `mobile/assets/images/welcome-prague.webp`, `welcome-hamburg.webp`, `welcome-duesseldorf.webp`, `welcome-holstentor.webp` | Licensed 1200 × 2600 derivatives, source/alterations documented; old Home assets untouched. |
| `mobile/assets/images/welcome-skyline.svg`, `welcome-overlay.svg`, `welcome-overlay-alternate.svg` | Code-native reference mark and layered sky/footer gradients; photographs never mirrored. |
| `mobile/assets/images/welcome-photos.LICENSE.md`, `welcome-holstentor.LICENSE.md` | Source, creator, terms and derivative records. |
| `docs/qa/onboarding-reference/` | Complete map, this report, comparison/native screenshots, checks and source SHA-256 manifest. |

Previous phase-1 audit/screenshot files remain preserved and are marked historical. No other existing application file, manifest, lockfile, migration, backend contract, auth/permission flow, launch registry, entitlement rule or payment implementation changed. The tiny shared button/locale variants are the only adjacent component modifications; neither introduces a new design system.

## Behavior, trust and surface acceptance

Open `citywalk://welcome` after connecting the local development client to this worktree's Expo server (port 8087). Existing launch `/` is not replaced before visual approval. Get Started and the chevron both enter `/?section=cities`; no forced account, city selection, location prompt, onboarding-completion state or payment action. Screen 02 is not simulated behind the button. Home still shows API/launch-gated available Lübeck and noninteractive coming-soon cities.

City Pass remains **€4.99 / 72 hours, one-time purchase, no automatic renewal**; no commerce code was modified. Native store purchase sheets and server-authoritative verification are preserved. Reference-only unsupported payment methods, offline controls, cities, weather, navigation instructions and saved-story features are documented as gaps in SCREEN-MAP.md, not fabricated.

- **iOS:** shared source implemented; English/German simulator captures, photo increment/decrement and correct credits, language radio options and guest Get Started verified. Physical-device/VoiceOver acceptance remains pending.
- **Android:** shared source and Hermes export pass. Actual Android rendering/native binary/device/TalkBack acceptance **unverified**.
- **Web:** existing landing/public traveler functionality preserved. No Web replica/landing redesign in this slice.
- **Admin:** not applicable.

## Automated checks

Raw command logs: `logs/`.

| Check | Result |
|---|---|
| `npm run test:run --prefix mobile` | **786 passed**, 94 files. |
| Focused Welcome/localization/large-text/regression checks | **29 passed**, 4 files, after final readability style adjustment; Welcome alone **13 passed**. |
| `npm run lint --prefix mobile` | **Pass**, zero warnings. |
| `npm run typecheck --prefix mobile` | **Pass**. |
| `npm run config:validate --prefix mobile` | **Pass**; no runtime config/dependency change. |
| `npm run doctor --prefix mobile` | **21/21 pass**. |
| Android `expo export --platform android` | **Pass**. Native compile/install/store acceptance not claimed. |
| iOS Metro bundle | **Pass**, actual simulator rendering. No new signed iOS binary. |
| Root `npm run test:run` | **1,902 passed, 239 skipped**; skipped DB/integration cases are not passes. |
| Root `npm run lint` | Exit 0, **15 existing warnings**, zero errors. |
| Root `npx tsc --noEmit` | **Pass**. |
| Root `npm run build` | **Pass** with synthetic local auth values and a disposable localhost DB URL; no production env files. |
| `npm run db:generate` | **Pass**, no schema changes / nothing to migrate. |
| `npm run db:migrate` | **Pass**, fresh disposable local Postgres 16 at localhost:55473. |
| `npm run db:verify` | **Pass**, 1 city / 25 places after the existing canonical fixture seed in that disposable DB. Container then stopped/removed. |
| `git diff --check` | **Pass**. |

The full mobile suite, lint, TypeScript and Android export were rerun after the final readability/typography corrections. No assertions removed, timeout raised, dependency changed, live provider invoked or CI bypassed. Full suites/gates are local evidence; there is no commit/remote check for the uncommitted diff.

Accessibility: 72-point minimum CTA, 44-point controls; photo indicators are one adjustable control, with explicit “1 / 4” text instead of a misleading slider percentage. No automatic photo motion; reduced-motion transitions disabled. White/Blue CTA contrast **6.60:1**, Navy/Off-white **15.15:1**; actual photographic text backgrounds were visually inspected with light overlays. The maximum Dynamic Type screenshot covers the top viewport only; full largest-text scroll traversal, compact/tablet rendering, physical VoiceOver/TalkBack and experimental Arabic device acceptance remain unverified. It is not a complete WCAG or device-parity certification.

## Next step

**Stop for Screen 01 visual approval.** After approval only, implement Screen 02's photo collage/value rows, using actual supported capability claims and an optional discovery skip. Guest authentication stays optional; interests/time/location stay tied to existing domain contracts. No automatic progression through Screens 02–24, commit, push, merge or deployment.
