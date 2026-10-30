# Screen 02 — final visual polish

25 October 2026. Owner-approved visual direction; **final visual acceptance pending**. Same isolated worktree `/private/tmp/citywalk-global-welcome`, branch `codex/onboarding-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617`. GitHub develop rechecked this turn and remains at that revision. No commit/push/PR, merge, deployment or infrastructure mutation.

![Final iOS Screen 02](screenshots/final-ios-en.png)

## Focused refinements

Only application file edited: `mobile/src/app/introduction.tsx`. New evidence files live in this folder. [Exact before/after patch](changes.diff) and [source hash](source-sha256.json). [Preservation checks](preservation.json) verify the previous Welcome, copy, shared components, tests and licensed assets remain unchanged.

- Collage aligned to content edges, replacing negative offsets. Consistent 3-point white separators, 20/16/18-point proportional corner radii, wider foreground card and reduced overlap. Explicit image focal positions retain the Prague skyline, Hamburg roofline and Lübeck gate. Attribution button stays inside the main photo, preserving its clean outline and a 44-point control.
- Four static feature rows: normal minimum height 56 → 52 points; compact 48 → 46. Vertical gap 8 → 6; content can grow with translated/scaled text. These are informational rows, not pretend buttons. Interactive targets retain their existing dimensions.
- Headline line-height 40 → 38 points, compact 36 → 34; normal headline bottom spacing 24 → 20. Existing large-text headline treatment preserved. Collage-to-headline spacing is 20 points.
- Adaptive collage receives a little of the recovered vertical room. Original primary/secondary actions, colors, serif typography, four feature labels, availability disclaimer and all navigation handlers preserved. Explore Cities is the single explicit guest exit; no redundant Skip control added.
- No authentication, city data, route definitions/destinations, purchases, other screen or copy change. €4.99 / 72-hour one-time City Pass remains unchanged.

The three bundled photos and their attribution/license data are byte-identical. [License/provenance records](../../../mobile/assets/images/welcome-photos.LICENSE.md): Jean Paul Montanaro / Pexels License (Prague), Avda / CC BY-SA 3.0 (Hamburg), Christian Wolf / CC BY-SA 3.0 DE (Lübeck). Source/license and crop disclosures remain available through the functional credits modal. No featured-city availability is inferred from imagery.

## Four-claim capability audit

This is a source/contract audit, not a new live provider or all-content certification. No entitlement/locale/publication boundary changed. The existing “Features vary by city and language” disclaimer is retained verbatim in English and German.

| Claim | Current support and limit |
|---|---|
| Curated walking routes | Existing city tour list and tour/walk screens use published tours and ordered stops. `mobile/src/app/city/[citySlug]/index.tsx` renders tours; `src/data/tours/lubeckHistoricTour.ts` supplies the existing historic-tour guidance. This is curated content, not a promise that every city/locale has a tour. |
| Local stories & audio | Existing place story/audio sections. `mobile/src/app/city/[citySlug]/place/[placeSlug].tsx` uses `selectExactLocaleAudio` from `mobile/src/lib/api/media.ts`: exact requested locale, approved API media path, no masquerading fallback. Playback additionally requires active entitlement; missing audio has an explicit unavailable state. The audio registry prioritizes EN/DE but does not itself establish approval or entitlement for every place. |
| Hidden gems | Existing curated `hidden-gem` tags/fixtures in `src/data/places.ts` and `src/data/hiddenGems.test.ts`, with shared preference/planner relevance in `packages/traveler-core/src/walkPlanner.ts`. Availability and actual translated content remain city/content dependent. |
| A personal city guide | Existing place-scoped Guide in `mobile/src/app/city/[citySlug]/guide/[placeSlug].tsx` uses `useGuideEligibility`, requested locale, source-grounded context and allowance/failure handling. This does **not** promise unrestricted city-wide chat: the separate city assistant explicitly displays unavailable because its deployed contract requires a real place. No new chat, source trust, provider call or unsupported language was enabled. |

Current shared launch registry (`packages/traveler-core/src/cityAvailability.ts`) still lists Lübeck available and Hamburg/Düsseldorf coming soon. English/German city introductions exist; authored/fallback content distinctions and exact-locale audio remain intact. This audit does not assert that every place has EN/DE approved audio or verified Guide knowledge, nor that optional premium capabilities are free.

## Native evidence

Existing local development binary with this worktree's Metro bundle, iOS 26.5; standard Dynamic Type unless stated. Preview reconnected to the isolated server on port 8089 after the old bundle/server session became unavailable. No application routing change was needed.

- [iPhone 17 Pro / English](screenshots/final-ios-en.png), 402 × 874 points.
- [iPhone SE 3 / English](screenshots/final-ios-small-en.png), 375 × 667 points.
- [iPhone SE 3 / German](screenshots/final-ios-small-de.png), 375 × 667 points.
- [Small iPhone / maximum accessibility text / German](screenshots/final-ios-small-max-text-de.png), font scale 3.571: both bottom actions fully visible above the safe area. Content reflows in the separate scroll region; capture shows its top viewport only. Full maximum-text scroll traversal and VoiceOver acceptance remain unverified. Original text-size setting restored afterward.

All four rows, disclaimer and both actions are visible without scrolling at standard text sizes in the captured EN/DE states. Repositioned photo control opens accurate three-photo credits; modal Close works. Explore Cities was verified again on the small iPhone opening existing guest discovery without authentication, with the same city availability states. No redundant Skip action exists.

Before screenshots are preserved in [the initial Screen 02 report](../onboarding-screen-02/README.md). This report supersedes that visual candidate, not its historical validation evidence.

## Relevant verification

Raw logs: `logs/`.

| Check | Actual result |
|---|---|
| Full mobile suite | **802 passed**, 94 files. |
| Focused Welcome + Screen 02 behavior suite | **29 passed** after final presentation changes; guest routes, seven locale contracts, photo attribution/link failure, back and reduced motion. |
| Mobile lint | **Pass**, zero warnings. |
| Mobile TypeScript | **Pass**. |
| Android Hermes export | **Pass**. Android runtime/device visual acceptance not claimed. |
| iOS runtime | Actual current Metro bundle rendered on both simulators and screenshots inspected. |
| Diff/preservation | `git diff --check` pass; only this screen's layout/image framing differs from its prior application source. |

No tests were added to mirror style constants. No dependency/config/schema/backend change, so root build/database gates were not repeated for this presentation-only polish; their earlier actual results remain in the historical Screen 02 report. No full WCAG certification, physical-device, TalkBack or release readiness claim. Mobile Core scope only; Public Web and Admin not applicable.

## Stop point

Screen 02 final visual approval required. Screen 03 remains untouched. No commit, push, merge or deployment performed.
