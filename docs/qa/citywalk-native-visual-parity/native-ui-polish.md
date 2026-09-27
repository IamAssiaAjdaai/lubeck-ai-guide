# Native UI acceptance polish — 2026-09-27

> **Historical report; status reconciled 2026-09-27.** Later owner passes cover Tour starten alignment, list/placeholder and membership behavior; later overlay heroes, full-width controls and compact audio notice supersede the earlier presentation described below. See the [current acceptance ledger](README.md#current-checkpoint-status--2026-09-27). Implementation is now in Commit 1; no new device/build/deployment evidence is claimed by this documentation cleanup.

Local implementation on `fix/citywalk-native-device-acceptance`; existing staged/unstaged/untracked work preserved. Mobile presentation only. No commit, push, build, deployment, CMS publication, Web edit, dependency or service-configuration change. Post-change visual results were initially unverified; later scoped owner passes and superseding design decisions are identified in the ledger. No Android acceptance.

## Reference evidence

Inspected these files actually present on this Mac (filenames do not establish their capture/build identity):

- `ChatGPT Image Sep 27, 2026, 12_16_47 AM.jpg`: annotated suggested tour and filters; “Tour starten” text sits below the arrow; category and map controls are bulky.
- `ChatGPT Image Sep 27, 2026, 12_16_42 AM.jpg`: annotated place cards; no-photo card lacks a thumbnail region, images/action areas are unbalanced.
- `ChatGPT Image Sep 27, 2026, 12_16_36 AM.png`: Holstentor card chrome and secondary button with blank labels.
- `ChatGPT Image Sep 27, 2026, 12_16_55 AM.png`: German Holstentor detail without a visible audio state in the shown area.

No current City Hub hero screenshot was located among these four files. Its source asset and container were inspected directly; its final crop needs owner review. No new screenshots or device metadata are invented. One read-only Metro query briefly listed `com.citywalk.app.dev (iPhone)`, but subsequent attempts found no connected runtime; no live label values or loaded source identity could be captured.

## Numbered changes

| Item | Finding and implementation |
| --- | --- |
| 1. Tour starten | The text alone had a 16-point top margin inside a centered row. Move spacing to the row; text and directional arrow now share vertical centering and an 8-point gap, within the same existing tour tap target. RTL uses the existing direction helper. |
| 2. Lübeck hero | Existing 1200×800 waterfront artwork contains substantial white sky/left space and was confined to a 140-point strip. City Hub now uses an inline, clipped, full-width scene with aspect ratio 1.8 and a proportional 150% right/bottom crop, `contentFit=cover`. Page margins, asset pixels and the CTA below remain; other hero variants retain their layout. No image stretching or new artwork. Physical crop acceptance pending. |
| 3. German unavailable | Preserve exact-locale selection, the visible no-track card, Listen scroll target and current-place Read. Use current shared translation lookups for the title, body and Read label at the render site. All seven existing catalogs already contain them; no duplicated copy or new locale behavior. |
| 4. Blank audio chrome | Screenshot shows the card/button with no labels. Local catalogs and package symlink contain the keys; stale context after Fast Refresh is a plausible mechanism, not a proven runtime diagnosis. Direct shared lookups avoid dependence on the locale context's cached message shape. Added regression with deliberately missing context fields. A full project reload and physical retest are still required; no player/session changes. Empty attribution wrappers in list cards are also omitted when no attribution exists. |
| 5. Orte filters | Opt-in compact presentation only for City Hub: content-sized segments, no equal-width expansion, smaller padding/radii, wrapping for long labels, minimum 44-point height and 48-point width. Selected color and radio semantics unchanged. |
| 6. Liste/Karte | Uses the same opt-in compact presentation. It no longer expands to two full-width half-page buttons. Default planner controls are unchanged. |
| 7. Place list | Stable 96×96 thumbnail with rounded corners, 12-point row padding/gap, top-aligned text with shrinkable width, metadata-sized summary, no empty summary text, and a separate action footer. Long content grows naturally; no fixed overall card height. |
| 8. Missing photos | Always mount the image boundary even without a URL. Reuse the Web concept: stable soft-blue thumbnail with a category/place icon, rather than an unrelated photo. Web references: `src/components/travel/PlaceDiscovery.tsx` and `ContentImage.tsx` (read-only). Existing image request/fallback/retry selection remains; only an optional placeholder-icon prop is added. |
| 9. Membership | Card-only dense presentation with minimum 44-point actions and a separate footer; membership label and Remove remain visible. Long action labels wrap rather than shrink or collide. Existing membership mutations, duplicate protection, loading, errors, saved identity and synchronization are unchanged. Detail buttons retain their normal sizing and can wrap long labels. |
| 10. General polish | Existing tokens, typography, direction helpers and safe areas retained. No new navigation, audio-session, content, loading or design-system abstraction. No icons/photos mirrored beyond existing directional navigation rules. |

## Files changed in this round

Application:

- `mobile/src/app/city/[citySlug]/index.tsx`
- `mobile/src/app/city/[citySlug]/place/[placeSlug].tsx`
- `mobile/src/components/V2Presentation.tsx`
- `mobile/src/components/WalkControls.tsx`
- `mobile/src/components/WalkMembershipControl.tsx`
- `mobile/src/components/NativeContentImage.tsx`

Tests:

- `mobile/tests/compact-city-filters.test.tsx` (new)
- `mobile/tests/content-image.test.tsx`
- `mobile/tests/native-v2-regressions.test.tsx`
- `mobile/tests/membership-screens.test.tsx`
- `mobile/tests/walk-flow.test.tsx` (wait for the preview subscription before sending its mocked external change)

QA: this file and `README.md`.

A before/after working-tree hash comparison verifies no changes to Web sources, shared catalogs, `NativeAudioPlayer`, `narrationAudioSession`, `NativeWalkFlow`, `NativeChrome`, tab navigation or the S3 adapter. The membership component's presentation changed; its operation logic did not.

## Historical physical checklist — later passes and superseding UI in ledger

Reload the same Development Client project once, without deleting storage. Test German first, then representative English and Arabic RTL. Keep the existing walk.

1. **Tour starten:** in Suggested now, verify the arrow is centered with the label and tapping either opens the same tour. Recheck at larger system text size and in Arabic.
2. **Lübeck hero:** confirm the scene fills its rectangle, important artwork is not awkwardly clipped, page margins remain and Build My Walk sits below. This crop specifically needs owner acceptance because no matching latest hero screenshot was available.
3. **German unavailable:** active Holstentor → Listen must reveal “Noch kein Audioguide auf Deutsch” and “Für diesen Ort ist derzeit kein Audioguide auf Deutsch verfügbar.” “Text lesen” must scroll to Holstentor's existing story; no German-to-English audio substitution.
4. **No empty audio block:** both ordinary Detail and Listen must show populated labels, or the real exact-language player. Missing attachment has no Retry/spinner; a genuine playback error keeps its existing Retry. Switch to English, verify audible playback with Silent mode ON, Pause, Resume at the same position, then back to German.
5. **Orte filters:** Alle/Sehen/Essen/Spaß are compact but easily tappable; selection still filters correctly and long/RTL labels do not overlap.
6. **Liste/Karte:** toggle fits its labels, selected state is clear, taps still show/hide the map and retain filtering. Map-service health is separate from control acceptance.
7. **Place list:** verify aligned thumbnails/title/summary/metadata and a separate action footer. Add one place, check included state in Detail, then Remove; confirm synchronization and no duplicate. Recheck long German labels and Arabic ordering.
8. **Missing photos:** a place without an image has an intentional icon in the same thumbnail space as photographed places; no broken image, collapsed column or unrelated photo. Check Holstentor's real image still loads.

Also preserve accepted Home/Explore one-tap, compact Back, Ask EN/DE/AR, planner progress and Add stop behavior. No physical PASS is inferred from automated tests.

## Final validation

- Affected mobile tests: **95 passed / 8 files**, zero failures or unhandled errors, **65.62 seconds**. Files: `native-v2-regressions`, `content-image`, `compact-city-filters`, `membership-screens`, `native-tab-navigation`, `native-audio-playback`, `native-media-loading`, `walk-flow`.
- Mobile TypeScript: **PASS** (`npm run typecheck`).
- Mobile lint: **PASS**, zero warnings (`npm run lint`).
- Scoped mobile diff and changed-file whitespace checks: **PASS**. Existing unrelated environment files preserved.
- Earlier test failures exposed a missing Card mock and the old center-alignment assertion, both updated to reflect the existing missing-audio card and intended top-aligned list. An intermittent preview test emitted a mock external update before the subscription effect mounted; the test now waits for the subscription. No application logic was changed to make the test pass.
- Physical screenshot acceptance remains **UNVERIFIED** after these changes. No automatic reload, audio playback, storage reset, native build or publication was performed.
