# Native Arabic physical QA follow-up — 2026-09-25

> **Historical report; status reconciled 2026-09-27.** Later sampled managed images succeeded, and later iPhone membership/navigation passes supersede the pending subset below; broad Arabic visual acceptance is not inferred. See the [current acceptance ledger](README.md#current-checkpoint-status--2026-09-27). Implementation is now in Commit 1; no new device/build/deployment evidence is claimed by this documentation cleanup.

Scope: `fix/citywalk-native-device-acceptance`. Native presentation only; no Web V2, CMS/database, identity/slug, shared planner, dependency or signing changes. No build, export, upload, submission, commit or push.

## Presentation changes

- `mobile/src/design/rtlPresentation.ts`: common text, content-language, heading, stretch-block and row styles. Yoga `direction` owns row ordering; no manual row reversal or image transform.
- `mobile/src/components/ui.tsx`: Arabic text overrides legacy LTR source styles, section headings stretch, unavoidable Latin fragments retain bidi isolation. Genuine English fallback prose keeps its real writing direction and aligns right.
- `mobile/src/components/V2Presentation.tsx`: hero copy stretches/right-aligns in Arabic; artwork stays unmirrored. Existing accepted planner progress is unchanged.
- `mobile/src/app/index.tsx`: RTL search, city-card rows/copy and metadata; existing Arabic chevron remains on the left, pointing left.
- `mobile/src/app/city/[citySlug]/index.tsx`: city/suggestion/place copy uses the common helpers; Arabic category labels; mixed tour title reads `المركز التاريخي لمدينة لوبيك`. Slot-bound card styles remain flattened objects. Explore membership actions sit outside the place link.
- `mobile/src/app/city/[citySlug]/place/[placeSlug].tsx`: full-width title/summary, source-aware body alignment, explicit existing fallback-language notice when Arabic content is absent. Read/Listen identity and section scrolling unchanged.
- `mobile/src/app/account/index.tsx`: one language selector, in the header; duplicate in-page row removed. Arabic introduction and saved-trip section align right. Bottom-tab label unchanged.
- `mobile/src/lib/contentLabels.ts`: native-only category labels and known city-name fragments inside Arabic prose. Existing `displayNames.ts` continues to prefer authored Arabic over local transliteration.
- `mobile/src/components/NativeWalkFlow.tsx`: category labels use native copy; planner rules/progress/navigation unchanged.
- `mobile/src/design/uxCopy.ts`: exact removal label `إزالة من جولتي`.

No Back header, Ask context/availability, selected-place Read/Listen identity, Explore active-tab behavior, logo/photography/map orientation or accepted planner presentation was redesigned.

## Published Arabic content audit

Read-only HTTP 200 inspection of `/api/content/cities/lubeck?locale=ar` on both:

- Preview: `${DEVELOP_PREVIEW_ORIGIN}`
- Production: `https://lubeck-ai-guide.vercel.app`

Both return the same coverage below. Preview summary and Holstentor detail were checked separately. This is an audit of published DTOs, not privileged access to draft CMS records.

| Content | Observed result | Native handling |
| --- | --- | --- |
| Lübeck city | Requested `ar`, resolved `en`, `didFallback=true`; name `Lübeck`. No summary/body in returned city content | Display `لوبيك`; native localized City Hub subtitle. Published Arabic city localization still missing |
| Hamburg / Düsseldorf cards | Upcoming native city cards | Existing `هامبورغ` / `دوسلدورف`; no claim that unpublished city CMS records exist |
| Five landmark places | Arabic name, short description, body/story and facts available | Existing API Arabic content takes precedence over native transliterations |
| Twenty other places | Requested `ar`, resolved `en`, `didFallback=true`; English names/summaries and no story in current public record | Native Arabic display name; genuine fallback prose right-aligned and marked with existing localized fallback notice. No invented editorial translation |
| `historic-center-walk` | Resolved `ar`; title `المركز التاريخي لمدينة Lübeck`, summary `جولة سيراً على الأقدام` | Native-only city-name fragment correction to `لوبيك`; summary preserved; CMS record unchanged |
| Taxonomy/category chips | Stable language-neutral keys | Native Arabic labels, including العمارة / التاريخ / الطعام / الثقافة / الطبيعة / الترفيه |

The five translated place records are `holstentor`, `marienkirche`, `rathaus`, `heiligen-geist-hospital`, and `buddenbrookhaus`.

All twenty records missing a **published Arabic localization** (names/summaries; stories absent in their current public records):

| Place slug | Place slug |
| --- | --- |
| `lubecker-altstadt` | `europaeisches-hansemuseum` |
| `st-petri-zu-luebeck` | `luebecker-dom` |
| `willy-brandt-haus` | `an-der-obertrave` |
| `salzspeicher` | `fuechtingshof` |
| `dunkelgruener-gang` | `kalandsgang` |
| `malerwinkel` | `buergergaerten` |
| `cafe-niederegger` | `schiffergesellschaft` |
| `fangfrisch` | `restaurant-vai` |
| `brauberger-zu-luebeck` | `zaubertheater-luebeck` |
| `kolk-17` | `final-escape-luebeck` |

Data path: native client requests `locale=ar`; the public cache keys include locale. Server `resolvePublicLocalization` chooses exact locale first and explicitly flags fallback; the summary DTO retains resolved locale. Canonical content for these twenty records contains German/English only. No evidence was found of the native client discarding available Arabic prose. A client regression preserves authored Arabic and explicitly flagged English fallback in the same response.

Editorial Arabic coverage remains incomplete. This implementation does not treat display-name transliteration as a translated story.

## Place Detail image investigation

The full content DTO contains five published landmark photos and twenty places without an image/media record. Missing images are intentional in their canonical source; Detail does not invent a photo for those places.

Preview live checks:

- `/landmarks/holstentor.jpg`: HTTP **200**, `image/jpeg`, **2,502,963 bytes**.
- Approved city image `/api/media/d90f55b7-14ff-4fb5-b196-b7afec17d825?variant=detail`: HTTP **502**.

`CitywalkLoading variant="place"` is the structural content-fetch skeleton. Once content is available, `NativeContentImage` owns only its image rectangle: bundled placeholder, existing 220ms fade, primary URL, same-content published fallback, then labelled photo placeholder if both fail. Successful image completion retains the original source. An identical fallback URL is not retried; changing source resets failure state. Success/error/reset paths are covered with an image bridge mock, not native pixel assertions.

The exact place and whether the large physical placeholder persisted have not been confirmed. A successful Holstentor request does not prove the owner's observed placeholder is resolved. Recheck that place on the iPhone; keep the media 502 visible as an external delivery issue. No speculative image-source or layout change was made in this pass.

## Walk membership

The remaining UI gap was Explore exposing a read-only membership badge. Explore now uses the same interactive `WalkMembershipControl` as Detail, outside the navigation link. Arabic removal copy is corrected. The existing city-scoped persisted preview/active record, `isInWalk`, `useCurrentWalk` subscriptions and serialized/deduplicated mutations remain the shared source for Detail, Explore, planner/preview, Active Walk and Saved badges. Saved favorites are independent of membership.

Seven new rendered cross-screen regressions cover Explore → Detail in EN/AR, Detail → Explore, simultaneous duplicate adds, removal, a saved place outside the walk (retained after walk removal), and an in-walk place that is not saved. They render the actual Explore/Detail/control/storage code, with native UI/router bridges mocked and AsyncStorage's real browser adapter. An initial failure exposed split mock/browser stores in the test harness; using one adapter fixed the harness without changing product storage.

For the complete asynchronous flow inventory and recovery paths, see [loading-and-membership.md](loading-and-membership.md).

## Device acceptance still required

| Platform | Scope / evidence | Remaining acceptance |
| --- | --- | --- |
| Web | Explicit native-only exception; no changes | No new Web behavior |
| iOS | Shared native implementation and automated tests | Arabic Home, City Hub, cards, Detail, Profile at device width; one header locale selector; chevron/Back direction; mixed text; image loading; cross-screen add/remove |
| Android | Same native implementation and automated tests | Same layout/loading/membership checks on device |

Reconfirm physically accepted compact Back, Ask EN/DE/AR, selected-place Read/Listen, Explore active tab and planner progress. No new screenshots or physical visual acceptance are claimed.

## Validation

- `npm run test:run --prefix mobile`: **290 passed / 43 files**, no unhandled errors, 32.39 seconds.
- `npx vitest run packages/traveler-core`: **20 passed / 2 files**. Existing Vite future-config/plugin warnings do not fail the tests.
- `npm run typecheck --prefix mobile`: passed after narrowing the new Profile test locale literals (`as const`; no runtime change).
- `npm run lint --prefix mobile`: passed, zero warnings.
- `git diff --check`: passed.
- Changed/untracked file audit: native/QA paths only; no environment/signing/generated-build or secret-pattern candidates. Earlier uncommitted work is retained.

No native build or device acceptance was inferred from these checks.
