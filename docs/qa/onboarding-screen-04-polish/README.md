# Screen 04 final visual polish — awaiting approval

25 October 2026. Isolated `/private/tmp/citywalk-global-welcome`, branch `codex/onboarding-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617`. No commit, push, PR, merge, deployment or Screen 05 implementation.

![Final standard iPhone](screenshots/ios-standard-en.png)

## Targeted changes

- Each photo has an independent 48-point information button. It is a sibling of the city navigation target, so activating credits never activates a disabled destination.
- Credits open in a native modal with the source file title, author, resized/cropped disclosure, exact license and source/license links. Close is outside the scroll area and remains visible at large text. Dismissal also supports Android modal Back and accessibility escape. Link failure shows existing localized feedback.
- A selection-only Navy gradient strengthens the bottom photo shading; approved/shared gradients and normal Home imagery are unchanged.
- Coming Soon cards use a Navy lock badge, subdued photo tint, no navigation arrow and disabled native accessibility state. The information control remains enabled.
- Standard-size city cards share a 2:1 aspect ratio and 20-point corners. At large text they grow beyond that ratio to retain all text and controls.
- English/German wording, heading, search, optional location action and layout hierarchy are preserved. No destination, publication or launch data changed.

## Preservation and scope

Mobile Core only; Public Web and Admin Web not applicable. iOS simulator evidence below; Android source/bundle verified, Android device acceptance unverified.

Live develop preflight refreshed to `c4c4eb2cb0a6697d18749f1c3561b17014d26ad7`, #453 admin publishing review queue. Existing user-requested branch retained; no rebase/integration operation. No current-head CI or deployed readiness claim.

`preservation.json` asserts the complete HomeScreen function, including city fetching, query, location handling, availability filters, distance sorting, existing links and selection layout, is unchanged from the beginning of this polish pass. Normal Home styles are unchanged. `locked-screens.sha256` and `logs/preservation.log` prove Screens 01–03 are byte-identical. No auth, purchases, City Pass (€4.99 / 72h, one-time, no renewal), schema, backend, config or dependency changes.

Exact files changed in this pass:

- `mobile/src/app/index.tsx`: selection-card information controls, stronger gradient, Coming Soon appearance, consistent standard aspect ratio and flexible large-text heights.
- `mobile/src/components/CityPhotoCredits.tsx`: isolated native credits presentation and source/license link handling; no city-selection or account logic.
- `mobile/assets/images/selection-card-gradient.svg`: code-native shading asset used only by the selection cards.
- `mobile/tests/home-presentation.test.tsx`: credits UI/native bridge mocks, exact source/license dispatch, independent dismissal/failure and generic API creator/source preservation.
- This QA directory: before-source snapshot, screenshots, source hashes, preservation assertions and logs.

All earlier uncommitted work is preserved. This remains the same discovery system; no second selection state/store and no future city activation.

## Attribution and licenses

The photo files and licenses are unchanged. A clearly labeled one-tap information button is associated with every credited photo. Full author, source title, source link, exact license link and crop/resize disclosure remain together in that photo's dialog. API-supplied creator and source information are retained for additional published cities without a city allowlist.

Official [CC BY-SA 3.0 DE deed](https://creativecommons.org/licenses/by-sa/3.0/de/deed.en), [German legal code §4(c)](https://creativecommons.org/licenses/by-sa/3.0/de/legalcode.de), and [CC BY-SA 3.0 deed](https://creativecommons.org/licenses/by-sa/3.0/deed.en) allow attribution in an appropriate/reasonable form for the medium while requiring the applicable credit and license details. The adjacent, accessible information button implements that presentation; this is a design interpretation of those terms, not new release/legal clearance. CC0 attribution remains voluntarily preserved. Existing photo provenance and derivative/license files remain intact.

Verified details:

- Lübeck: Christian Wolf (c-w-design.de), `Holstentor in Lübeck Frontseite.jpg`, CC BY-SA 3.0 DE.
- Hamburg: Avda, `Hamburg - Elbphilharmonie - 2016-2.jpg`, CC BY-SA 3.0.
- Düsseldorf: Turmfalke, `Rheinturm, Duesseldorf.jpg`, CC0 1.0.

## Native evidence

Existing local development binary and current Metro bundle, iOS 26.5. Not a signed release or physical-device acceptance.

- [Standard English](screenshots/ios-standard-en.png), iPhone 17 Pro, 402×874 pt.
- [Standard German](screenshots/ios-standard-de.png).
- [Small German initial viewport](screenshots/ios-small-de.png), iPhone SE 3, 375×667 pt.
- [Small-device lower scroll viewport](screenshots/ios-small-scrolled-cards-de.png): all three cards and information controls are visibly reachable in the native scroll content.
- [English credits](screenshots/ios-credits-en.png) and [small German Düsseldorf credits](screenshots/ios-small-credits-de.png).
- [Maximum German text credits](screenshots/ios-small-credits-max-text-de.png), scale 3.571: long text continues in the scroll area; Close wraps fully and remains visible. Close activation verified. Text size restored afterward.

Observed actions: Lübeck, Hamburg and Düsseldorf information controls open their respective credits; dismissing credits retains city selection; original-photo and license controls launch Safari; Düsseldorf remains disabled; source/license URL values also verified in automated tests. Search/location/guest routing logic is byte-identical to the immediately preceding verified pass and its regression tests remain green.

### Scrolling distinction

Native accessibility activation of the final information control scrolled the underlying city list to the lower viewport, where all three city cards were captured. The last card's credits, license and Close were verified on the small device. This establishes native accessibility activation and scroll-to-control reachability.

Direct pointer swipes/scroll-wheel attempts were rejected by the computer-use tool with `windowNotFoundAtPosition`; recentering, raising and rebinding the simulator did not resolve that input-tool error. Manual touch swiping and full VoiceOver/TalkBack traversal remain unverified. No claim that pointer swipes passed. Android device, physical-device and full assistive-technology acceptance remain manual checks.

## Automated verification

- Full mobile suite: **831 passed**, 95 files.
- Focused city-discovery/location suite: **41 passed**, 2 files.
- Mobile lint: **pass, zero warnings**. TypeScript: **pass**.
- Android Hermes export: **pass**, `/tmp/cw-screen04-polish-final-android`.
- Diff and frozen-screen checks: **pass**.
- Root build/tests, database verification and Expo Doctor were not rerun for this presentation-only follow-up. The preceding Screen 04 report records their passing results; this pass changes no backend/schema/config/dependencies.

No production operation, real payment, provider login, permission escalation or city-data mutation. The prior task-owned local preview runtime remains available for review.

## Approval stop

Stop here for final Screen 04 visual approval. Screens 01–03 remain frozen; Screen 05 untouched. The direct-touch scrolling/manual device checks above remain acceptance limits. All changes stay isolated and uncommitted.
