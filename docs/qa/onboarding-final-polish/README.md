# CITYWALK Screen 01 — final visual polish

25 October 2026. Screen 01 visually approved by the owner on 25 October 2026. This historical report records its approval candidate. Screen 02 continuation: [current report](../onboarding-screen-02/README.md). Isolated worktree `/private/tmp/citywalk-global-welcome`, branch `codex/onboarding-global-welcome`, base develop `98a1dbbda17f945a0d982eb6dbc36713bad61617`. No commit, push, PR, merge or deployment.

![Final Welcome on iPhone](screenshots/final-ios-en.png)

## Targeted changes

- Preserved the approved full-screen photographic composition, centered CITYWALK logo, headline and primary CTA.
- Restored visible localized **Explore Cities** beneath **Get Started**. Both enter the existing guest city discovery route `/?section=cities`. Until Screen 02 is approved, Get Started intentionally takes the same short guest path.
- Removed the top-left chevron: this entry has no meaningful back destination.
- Retained the real four-photo manual carousel: Prague → Hamburg → Düsseldorf → Lübeck → Prague. Tap the indicator group to advance; accessible increment/decrement also work. It has four positions and four distinct bundled photographs, with no automatic motion or destination activation.
- Added a feathered off-white wash behind the headline to maintain contrast across photos. The secondary action has a dark translucent Navy surface. The original primary Blue remains unchanged.
- Photo information opens the current photo's author, license and original source links, with a travel-inspiration notice distinguishing imagery from supported destinations. Added explicit “resized and cropped” modification disclosure to every credit. Link failure feedback and dismissal remain functional.

Sources and licenses: [complete asset provenance](../../../mobile/assets/images/welcome-photos.LICENSE.md). Prague: Jean Paul Montanaro, Pexels License; Hamburg: Avda, CC BY-SA 3.0; Düsseldorf: Turmfalke, CC0 1.0; Lübeck: Christian Wolf, CC BY-SA 3.0 DE. Existing license URLs, bundled photographs and derivative license records are preserved.

## iOS verification

Actual local development binary with the current worktree Metro bundle, iOS 26.5 simulators:

| Check | Observed result |
|---|---|
| iPhone 17 Pro, 402 × 874 points | Full-screen composition; both CTAs, credits and indicators above bottom safe area. [Final capture](screenshots/final-ios-en.png). |
| iPhone SE (3rd generation), 375 × 667 points | All actions and indicators fit without scrolling at default Dynamic Type. [Small iPhone capture](screenshots/final-ios-small.png). |
| Carousel | All four distinct images visually inspected; accessibility value advances 1/4–4/4 and wraps to 1/4. No navigation when changing images. |
| Credits | Selected Hamburg photo opens Avda / CC BY-SA 3.0, source/license links and editorial-inspiration notice. [Capture](screenshots/credits-ios-small.png). All four source/license actions additionally verified in automated behavior tests. |
| Get Started | Opens existing guest Explore Cities screen without authentication. [Result](screenshots/get-started-guest.png). |
| Explore Cities | Opens the same existing guest discovery. [Result](screenshots/explore-cities-guest.png). |
| Availability | Guest discovery still exposes Lübeck as available and Hamburg/Düsseldorf as coming soon. Gallery does not change city readiness. |

The [previous approved-direction screenshot](../onboarding-reference/screenshots/after-ios-en.png) remains the before evidence. These captures are simulator evidence, not physical-device or store acceptance. Android export passes; Android device/TalkBack remains unverified. Full VoiceOver traversal, maximum Dynamic Type traversal and experimental Arabic device acceptance are not claimed. Localization behavior is tested across all seven existing locales; no locale was enabled.

Contrast calculations use sRGB luminance and worst-case photographic backgrounds beneath the local surfaces: Navy headline over 85% off-white on black **10.72:1**; white primary label over #155CAF **6.60:1**; white secondary label over 82% Navy on white **8.86:1**. The feathered edges sit outside the normal headline area. Larger text retains its existing 90% light surface and scrolling. Primary minimum height 72 points; secondary minimum 48; photo/credits controls 44. No full accessibility certification is claimed.

## Exact files changed in this polish step

| File | Change |
|---|---|
| `mobile/src/app/welcome.tsx` | Remove chevron; restore secondary guest CTA; add headline contrast wash and secondary-action styles. |
| `mobile/src/lib/welcomeCopy.ts` | Localized secondary-action key/English capitalization and accurate crop disclosure for all photo credits. |
| `mobile/assets/images/welcome-headline-wash.svg` | New feathered contrast surface. |
| `mobile/tests/welcome.test.tsx` | Verify both CTAs, all locales, four distinct sources and each photo's source/license actions. 16 Welcome behavior tests. |
| `docs/qa/onboarding-final-polish/` | This report, screenshots, raw verification logs and source hashes. |
| `docs/qa/onboarding-reference/README.md` | Mark previous candidate as historical and link this final polish evidence. |

The earlier branch also contains the Welcome assets and small shared `LocaleSelector.tsx` / `ui.tsx` extensions enumerated in the [previous implementation report](../onboarding-reference/README.md); neither shared component was edited during this polish. Source hashes are in `source-sha256.json`. No launch routing, auth, location, registry, domain, commerce, Web, Admin, dependency, schema or infrastructure implementation was changed. City Pass remains €4.99 for 72 hours, one-time payment, no automatic renewal.

## Verification results

Raw logs: `logs/`. Mobile suite **789 passed / 94 files**, including **16 Welcome tests**. Mobile lint **zero warnings**, TypeScript **pass**, Android Hermes export **pass**. Actual iOS Metro rendering and native CTA/carousel observations above.

Root suite **1,902 passed / 239 skipped** (268 passed files, 27 skipped). Root lint **0 errors / 15 pre-existing warnings**; root TypeScript **pass**. Root production build **pass** (785 static pages); `db:generate` **pass**, no schema changes; `db:migrate` **pass**; `db:verify` **pass**, 1 city / 25 places after canonical fixture seed; `git diff --check` **pass**. The sandboxed build initially stalled before compilation; rerunning with local worker permissions passed. Database checks use only a fresh disposable local Postgres 16 instance at localhost:55473 with synthetic local credentials. The disposable container was stopped/removed after checks. No production environment files or resources used. Skipped integration tests are not counted as passes.

## Stop point

Screen 01 only. Final owner visual approval is pending. Screen 02 remains proposed next, requiring capability-accurate value copy, licensed collage assets and an optional guest skip. Existing root launch remains intact; this is the isolated `citywalk://welcome` review route. No Screen 02, commit/push/PR, merge or deployment is authorized by this handoff.
