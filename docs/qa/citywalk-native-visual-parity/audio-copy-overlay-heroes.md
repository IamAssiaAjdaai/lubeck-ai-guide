# Audio copy and image-overlay heroes — 2026-09-27

> **Historical report; status reconciled 2026-09-27.** Later English 110% hero brightness/legibility was accepted. The compact German notice after the catalog fix remains pending explicit owner visual confirmation. See the [current acceptance ledger](README.md#current-checkpoint-status--2026-09-27). Implementation is now in Commit 1; no new device/build/deployment evidence is claimed by this documentation cleanup.

Mobile Core only; Public Web and Admin Web unchanged. Local branch `fix/citywalk-native-device-acceptance`, HEAD `efe8cf62f408181f0f4ca922f32e53e712a982a2` plus existing uncommitted/untracked work. No commit, push, native/release build, deployment, dependency upgrade or content publication.

## Physical evidence and accepted behavior

Owner screenshots supplied inline in this conversation (the three named Downloads paths were checked and are **not present** in this filesystem; these are attachment references, not verified local evidence paths):

- `ChatGPT-Bild 27. Sept. 2026, 00_54_35.png`: **FAIL** — literal `place.audioMissingTitle`, `place.audioMissingDescription`, `place.readText` in German Detail.
- `ChatGPT-Bild 27. Sept. 2026, 00_54_31.jpg`: **FAIL** — City Hub title/subtitle above a separate illustration; owner requests overlay.
- `ChatGPT-Bild 27. Sept. 2026, 00_54_25.jpg`: **FAIL** — same separate composition on Home.

Owner-confirmed iPhone **PASS** results carried forward: English narration with Silent mode ON; Pause/Resume and return to English; Tour starten interaction/arrow alignment; compact category filters and Liste/Karte switching; place-card composition and missing-photo placeholders; synchronized Add/In my walk/Remove; previously accepted navigation and Add stop. These implementations were not changed in this task. No new device model, OS, installed binary identifier or exact device-test timestamp was supplied. No Android or release acceptance is inferred.

## Translation failure: actual native consumer evidence

The callsite in Place Detail uses `t(locale, "place.audioMissingDescription")` from `@citywalk/i18n`. The native adapter also maps to the same nested `place` keys. Translator argument order, namespace and nested lookup are correct; the shared source catalogs contain all three messages in all seven locales. Typed keys remain enforced.

The mobile dependency symlink resolves to `packages/i18n/src/index.ts`. There is also an outdated root pnpm snapshot, but **Metro's served graph resolves to the workspace paths**, not that snapshot; it is not the demonstrated cause here.

Read-only inspection of the existing Metro iOS response on port 8081 showed a concrete stale transformed catalog: its German JSON module lacked all three keys while the current workspace JSON (and the served source-map source content) contained them. Evaluating only the isolated shared-i18n module factories from the actual served JavaScript reproduced the screenshot:

| Actual served translator call | Before restart | After corrected Metro startup |
| --- | --- | --- |
| `t("de", "place.audioMissingTitle")` | raw key | Noch kein Audioguide auf Deutsch |
| `t("de", "place.audioMissingDescription")` | raw key | Für diesen Ort ist derzeit kein Audioguide auf Deutsch verfügbar. |
| `t("de", "place.readText")` | raw key | Text lesen |

All three keys now resolve in **de/en/da/sv/nl/es/ar** in the actual served translator, not just a source-only test. This establishes stale served catalog output rather than missing source translations or an audio delivery failure. No connected iPhone runtime was available for a new in-memory check; the owner must reload the project to confirm the displayed result.

The inspected Expo Metro configuration had `watchFolders: []`, so the external shared `file:` packages were not explicitly watched. Root npm workspace declarations now exist; the historical empty Metro watch scope is the observed evidence, not a claim that the current root lacks workspaces. Added `mobile/metro.config.js`, extending Expo defaults with the existing `../packages` directory. No custom resolver, package-manager changes or node_modules patch. The missing watch scope is corrected; the exact historical edit that left the old transform resident is not reconstructed.

Stopped the old Metro process (process (local PID omitted)) and started one replacement on the same port with `--dev-client --lan --port 8081 --clear`, using the existing approved develop Preview API origin `${DEVELOP_PREVIEW_ORIGIN}` and development client mode. No remote environment configuration changed. The iOS development-JavaScript request returned 200 with the current catalogs. This is development serving, not a native/store build.

## Minimal presentation changes

Place Detail now renders only the shared localized description in a compact, noninteractive notice. Removed the large card heading and redundant Read button/reserved action space. Existing story, truthful content-language metadata, Listen scroll target, and useful Read entrypoints elsewhere remain intact. Missing attachment has no Retry/player/spinner; actual player-error Retry and accepted audio session code are unchanged.

Home and City Hub now use `ImageOverlayHero`: one clipped image-backed container, real accessible heading/subtitle layered above it, and a navy contrast layer for white text. Their original CTAs, search, city list, quick actions and headers remain outside/in their original order. Other planner/loading/error heroes retain their existing implementation.

The approved bundled `citywalk-waterfront.webp` is 1200×800 with substantial baked-in white sky/left fade. The new hero deliberately frames source rectangle `(640, 360, 560, 400)` — riverfront buildings/bridge/water — with aspect-preserving cover math derived from measured container size. It does not distort, mirror, edit or replace the source image. Physical image coordinates remain LTR; Arabic text aligns right. Minimum height is 244, with no fixed/max height or text truncation: longer copy/accessibility text grows the container. Existing `NativeContentImage` supplies its normal loading/failure handling.

Source-art limitation: this is the existing generic CITYWALK illustration, not a verified photograph of each selected city. The crop intentionally excludes the upper spires and white sky and has a finite 560×400 source region; high-density device sharpness/composition need owner review. No new imagery or CMS content was introduced.

## Exact files changed in this task

- `mobile/metro.config.js` — explicit shared-package watch scope.
- `mobile/src/components/ImageOverlayHero.tsx` — shared Home/City Hub overlay and documented crop.
- `mobile/src/app/index.tsx` — Home hero consumer.
- `mobile/src/app/city/[citySlug]/index.tsx` — City Hub hero consumer.
- `mobile/src/app/city/[citySlug]/place/[placeSlug].tsx` — compact absent-audio notice.
- `mobile/tests/metro-workspace.test.ts` — actual package resolution/watch-scope checks.
- `mobile/tests/native-v2-regressions.test.tsx` — real translator/catalog rendering, no redundant action, EN→DE→EN, Listen target, overlay/crop/RTL checks.
- `mobile/tests/home-presentation.test.tsx` — update isolated Home hero bridge.
- `mobile/tests/native-screen-chrome.test.tsx` — exercise actual hero; native Text mock maps its accessibility heading role.
- This report and `README.md` — evidence/acceptance ledger.

No shared translation source changes were needed. No audio player/session, storage, membership, navigation or Web implementation edits.

## Validation

- **95 mobile tests passed / 8 files**, zero unhandled errors: `native-v2-regressions`, `home-presentation`, `metro-workspace`, `native-audio-playback`, `native-media-loading`, `native-screen-chrome`, `rtl-presentation`, `native-tab-navigation`. Command: `npm run test:run -- tests/native-v2-regressions.test.tsx tests/home-presentation.test.tsx tests/metro-workspace.test.ts tests/native-audio-playback.test.tsx tests/native-media-loading.test.tsx tests/native-screen-chrome.test.tsx tests/rtl-presentation.test.ts tests/native-tab-navigation.test.tsx --maxWorkers=2` from mobile; 28.00 seconds.
- **42 shared i18n tests passed / 2 files** (`i18n.test.ts`, `ci-check.test.ts`). Existing Vite configuration warnings remain unrelated.
- `npm run i18n:check`: **435 keys per catalog, zero errors**, six launch locales plus Arabic; includes nonempty values and interpolation checks.
- Mobile TypeScript **PASS**; mobile lint **PASS, zero warnings**.
- Final overlay/audio regression rerun after the contrast adjustment: **43 passed / 1 file**, 5.74 seconds (a subset of the 95 tests above, not 43 additional distinct tests).
- Initial iterations corrected removed-button expectations, the native heading-role mock and a floating-point geometry tolerance. One map test timed out while Metro's cold transform and checks ran concurrently; the bounded-worker rerun passed without changing map code or timeout thresholds.
- Scoped diff/whitespace check **PASS**. Whole-tree `git diff --check` still reports pre-existing whitespace at `.env.example:32`; that unrelated local edit was preserved. No secret values copied into this report.

Automated rendering mocks native bridges and does not establish visual acceptance or audible playback. Accepted physical audio results above are owner evidence, separate from tests.

## Original retest checklist — see later scoped acceptance

Reload the same Development Client project from the replacement Metro session; do not delete storage.

A. **German Holstentor:** Detail/Listen shows the compact sentence “Für diesen Ort ist derzeit kein Audioguide auf Deutsch verfügbar.” No raw keys, Read button, redundant heading, empty card, Retry or player for the absent recording. Listen still reveals the notice.

B. **Home:** one image-filled rectangle with discovery title/subtitle inside it; location CTA, search and cities below. Check German wrapping and larger system text; Arabic should align text right without mirroring the scene.

C. **City Hub:** selected city name/subtitle inside the image rectangle; planner CTA and existing quick actions below. Confirm crop/readability and no duplicated exterior title, including larger text/Arabic.

Later English 110% hero brightness/legibility was owner-confirmed. German/Arabic-specific hero checks and the compact German notice are not promoted to PASS without explicit evidence. No additional accepted-flow retest is requested by this documentation cleanup.
