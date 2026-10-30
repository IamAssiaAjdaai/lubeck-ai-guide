# CITYWALK Screen 02 — new reference implementation

25 October 2026. **Local implementation; awaiting owner visual approval.** Same worktree `/private/tmp/citywalk-global-welcome`, branch `codex/onboarding-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617`. No commit, push, PR, merge or deployment.

![New native Screen 02](screenshots/after-ios-en.png)

## Design reference and comparison

The new owner-supplied “More Than Just Sightseeing.png” supersedes the earlier small-collage direction. It is retained unmodified as `reference.png` **for QA comparison only**, not as shipping photography or UI artwork. [Side-by-side comparison](comparison.html). Images use equal display widths and preserve their original aspect ratios.

Reference: 850 × 1850 pixels. Actual: iPhone 17 Pro, iOS 26.5, 402 × 874 points / 1206 × 2622 pixels, existing local development binary with this worktree's Metro bundle. This is actual native rendering, not an HTML recreation or pixel-identical claim.

| Reference element | Implemented / remaining difference |
|---|---|
| Wide, immersive photo composition | Full content-width collage replaces inset thumbnail composition. Main image 72% width, supporting right images 31% / 38%, overlapping with white separators and 26–28-point radii. Licensed source scenes differ: Prague skyline instead of the reference's warm river/bridge scene; Hamburg and Holstentor crops/lighting also differ. |
| Sky extending behind top navigation | Reuses the licensed Prague photo with a separate code-native light-blue/off-white wash. Real photo content is unchanged. Softer, less cloud-rich than reference. |
| Dominant main photograph | Full-bleed 72%-width left panel. Height adapts to viewport, ~226 points on the captured standard iPhone; reference's photo region is taller. This accommodates real native safe areas, all four cards and disclaimer while retaining fixed actions. |
| Editorial headline | Exact English wording, two lines, Navy Georgia 36/40 on iOS; Android native serif. Platform font metrics and line shapes can differ from the reference's unavailable original font. |
| Supporting description | Exact English reference copy: “Curated experiences, local stories / and hidden gems – all in one app.” Existing seven-locale contract extended with translations; EN/DE inspected natively. |
| Four detailed feature cards | Light-blue icon tiles, titles and exact English short descriptions. 50-point minimum rows, 6-point gaps, 14-point radii; text may expand/wrap. SF Symbols / Android material icons can differ slightly from reference artwork. |
| Card chevrons | Intentionally omitted: these rows are informational, with no fabricated navigation or misleading touch affordance. Decorative icons are hidden from assistive technology. |
| Primary and secondary actions | Existing Next and Explore Cities behavior retained; primary minimum height 48, secondary 48, Blue #155CAF and Navy #09234D. Reference's exact brighter gradient is not substituted for approved brand Blue. Both actions stay above the bottom safe area. |
| Compact / larger text | Story content uses a separate ScrollView; footer remains visible. The small-device initial viewport shows the first three cards and requires scrolling for the remainder. This differs from the tall reference and avoids shrinking text/photography into an unreadable all-at-once layout. |

## Implementation boundary

| File | Change |
|---|---|
| `mobile/src/app/introduction.tsx` | Screen 02 composition, decorative sky treatment, immersive collage, supporting description, detailed informational cards, responsive dimensions and button proportions. Existing navigation and attribution handlers preserved. |
| `mobile/src/lib/introductionCopy.ts` | Supporting description and four card descriptions for all seven existing locale contracts. English matches reference; German adapts the copy. No locale enabled. |
| `mobile/assets/images/introduction-sky-wash.svg` | New code-native brand-color wash; no extracted reference photograph. |
| `mobile/assets/images/introduction-holstentor.jpg`, `introduction-photos.LICENSE.md` | Original licensed Holstentor photo for wider framing and explicit source/license record. Existing photos preserved. |
| `mobile/tests/welcome.test.tsx` | All-locale description checks; asserts cards expose no misleading action controls. Native bridges remain mocked. |
| `docs/qa/onboarding-screen-02-redesign/` | This report, preserved reference, comparison, screenshots, patch, source hashes, preservation checks and raw logs. |

[Exact route/copy patch](changes.diff), [current source hashes](source-sha256.json), [preserved-file checks](preservation.json). Approved Screen 01, shared UI/locale components, bundled photographs/license records, auth, city availability, domain/backend and City Pass implementation remain unchanged. No new dependencies, lockfiles, schema, public/admin Web or production settings changed. The new original photo adds about 3.4 MiB to bundled assets; image optimization can be reviewed separately without changing its source/attribution. Mobile Core scope only.

Live develop refreshed to `4a74395838d0064e1fabf21f0f4ac3b9f951ecad` (#446: isolated Preview synthetic-fixture tooling); this owner-authorized worktree remains at its existing base rather than importing unrelated work. Local uncommitted validation is not exact-head GitHub CI or latest-base integration evidence.

## Content and licensing integrity

The same licensed source photographs are used; existing Welcome assets remain byte-identical. Screen 02 reuses the wider existing Hamburg derivative and adds an unmodified original Holstentor JPEG for full-landmark framing. [Screen 02 provenance](../../../mobile/assets/images/introduction-photos.LICENSE.md). [Provenance](../../../mobile/assets/images/welcome-photos.LICENSE.md): Prague / Jean Paul Montanaro / Pexels License; Hamburg / Avda / CC BY-SA 3.0; Lübeck / Christian Wolf / CC BY-SA 3.0 DE. Existing functional attribution modal retains author, source, exact license and resized/cropped disclosure for all three, plus the travel-inspiration/available-cities distinction. No photo confers destination availability.

The [prior capability audit](../onboarding-screen-02-polish/README.md) remains applicable: published curated tours, place stories, exact-locale approved audio with entitlement, curated Hidden Gems and eligible place-scoped Guide. The new short descriptions do not enable universal city-wide chat, offline behavior or unlimited/free premium services. Existing “Features vary by city and language” disclaimer is retained. Guest discovery, optional account behavior, readiness gates and €4.99 / 72-hour one-time City Pass with no automatic renewal are unchanged.

## Native verification and limits

- [Standard English iOS](screenshots/after-ios-en.png): all four feature cards, supporting copy, disclaimer and both actions visible.
- [Small iPhone English initial viewport](screenshots/after-ios-small-en-top.png), 375 × 667 points: immersive photo retained, text reflows, both actions visible; lower story content continues below the fold.
- [Small iPhone German initial viewport](screenshots/after-ios-small-de-top.png): translated headline, supporting copy and descriptions render; text wraps without truncation and both actions remain visible.
- [Maximum accessibility text / German](screenshots/after-ios-small-max-text-de.png), scale 3.571: both action labels wrap fully and remain above the safe area. System text size restored to `large` afterward.
- Attribution control hit area and accurate three-photo modal verified on iPhone SE; Close works. Navigation contracts and source/license link dispatch/error recovery verified in focused tests. Next and Explore Cities retain the same existing discovery handler; no account/location/purchase gate added.

Full small-device / maximum-text touch-scroll traversal and VoiceOver acceptance were **not conclusively verified by the automation**. Attempts to drag/scroll did not provide reliable observed traversal evidence. The implementation uses native ScrollView with content growth and a separate fixed footer; manual touch/assistive-technology acceptance remains a handoff check. Android shares source and passes Hermes export; actual Android rendering, TalkBack and physical-device acceptance remain unverified. No complete WCAG or release-readiness claim.

## Automated verification

Logs in `logs/`.

| Check | Actual result |
|---|---|
| Full mobile suite | **803 passed**, 94 files. |
| Focused Welcome / Screen 02 | **30 passed**, including seven-locale descriptions, informational cards without extra actions, guest navigation, back/fallback, reduced motion and credits/link failure. |
| Mobile lint / TypeScript / public config | **Pass**, lint zero warnings. |
| Expo Doctor | **21/21 pass**. |
| Android Hermes export | **Pass**. Not Android device acceptance. |
| Root tests | **1,902 passed / 239 skipped**, 268 passed files / 27 skipped. Skipped cases are not passes. |
| Root lint / TypeScript | Lint **0 errors / 15 existing warnings**; types **pass**. |
| Root production build | **Pass**, 785 generated pages with synthetic local auth settings. |
| `db:generate` | **Pass**, no schema changes. |
| `db:migrate`, canonical fixture seed, `db:verify` | **Pass**, fresh disposable localhost Postgres 16 only; verified 1 city / 25 places. Task-owned container stopped/removed afterward. |
| `git diff --check` | **Pass**. |

No production credentials/database, live AI/audio-generation provider, payment or deployment operation used. React review preserves stable feature identities, local-only modal state, reduced motion, native semantic controls and existing domain/navigation contracts. No fetch waterfall, new shared state or dependency introduced.

## Approval checkpoint

Stop after Screen 02. Owner visual approval of this new reference implementation is pending; Screen 03 remains untouched. No commit/push, merge or deployment performed.
