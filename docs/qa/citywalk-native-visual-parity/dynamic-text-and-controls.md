# Dynamic text, full-width filters and localized hero contrast — 2026-09-27

> **Historical report; status reconciled 2026-09-27.** The owner subsequently accepted English at 110%, All Apps, including CTA/quick-action/tab readability, filter/toggle sizing and hero brightness. German at 110% and restoration to the prior size remain unverified. See the [current acceptance ledger](README.md#current-checkpoint-status--2026-09-27). Implementation is now in Commit 1; no new device/build/deployment evidence is claimed by this documentation cleanup.

Local implementation on `fix/citywalk-native-device-acceptance`, HEAD `efe8cf6` plus preserved local work. Mobile only. No commit, push, build, deployment, publication, dependency upgrade, translation/content edit or backend/storage change.

## Owner evidence and scope

Owner-confirmed iPhone **PASS**: Add/Remove widths remain consistent through EN→DE→EN; check is inline inside Remove; separate membership sentence/space is gone; Remove then Add works. These membership implementations remain unchanged in this task.

Owner-reported **FAIL**: clipped “Build my walk” / “Start tour”, tiny Near me/Saved and bottom-tab labels, incomplete recommended-tour title when increasing Text Size. Hero brightness was **NOT ACCEPTED at this investigation**; the later English 110% result was accepted. The previous content-sized category/List-Map decision is explicitly superseded by full-width groups.

Owner clarified the first physical reproduction setting: **Control Center → aA/Text Size → 110%, All Apps**, changed with CITYWALK already running. Model/iOS version and the Larger Accessibility Sizes toggle are unknown. This must not be described as maximum accessibility text. The latest attachment is text; no new screenshot files were supplied or claimed to exist.

Read-only Metro inspector probes returned 200 with **zero connected targets**, including 2026-09-27 00:10:20 UTC after the clarification. Actual iPhone runtime fontScale/viewport and installed-source identity could not be observed. A Control Center percentage is not assumed to equal a React Native fontScale. Mock test inputs below are explicitly synthetic.

## Demonstrated causes and limits

- `PrimaryButton` compact mode forced two lines with `adjustsFontSizeToFit` and `minimumFontScale=0.85`; quick actions stayed in four narrow columns regardless of fontScale. This is an actual auto-shrink path, not inverse-scaling arithmetic.
- `NativeBottomNavigation` forced every label into one line with auto-fit and the same minimum scale. Labels had no opportunity to grow/wrap. The navigation bar has a minimum height, not a fixed height, and is already a normal-flow sibling below the scroll view.
- Tour content used 63% of a horizontal card beside a 37% image at every text size. No fontScale-responsive arrangement existed. Its title and Start action were **already unbounded text**, so a missing last letter cannot honestly be attributed to a title line cap. The narrowed layout and button-row measurement constraints were addressed, but native reproduction is still required to prove the exact clipping mechanism is gone.
- The main CTA already used wrapping after the previous task. Its content row lacked an explicit width; the new row fills the inner button width and gives text a shrinkable, minimum-zero layout box alongside icons. Text font size itself is not shrunk. No manual/inverse/duplicate font-scale calculations were found in these wrappers before this change.
- Shared source strings are complete: English “Build my walk” and “Start tour”; German “Meinen Spaziergang planen” and “Tour starten”. Read-only develop Preview summary requests separately returned **200** with full titles **“Lübeck Historic Center”** (EN) and **“Historisches Zentrum von Lübeck”** (DE). The normal tour title path passes the full published title; no shortening was added. These remote content checks are not a native-layout PASS.
- Fixed typographic line-height values are native Text styles; no JS font multiplier has been introduced. No evidence established stale font measurements or a native line-height engine bug. Do not label either as the root cause without device evidence.

## Changes and responsive rules

- `mobile/src/components/ui.tsx`: text actions, including compact quick actions, no longer auto-fit/shrink. Default labels have no line limit. Content rows fill the available inner width, keep icons and text centered, and let text wrap/grow. System scaling remains enabled; no maxFontSizeMultiplier cap.
- `mobile/src/design/responsiveText.ts`: reactive `useWindowDimensions()` supplies width/fontScale. FontScale is used **only for layout selection**, never multiplied into font sizes. Existing page padding and 480-unit maximum content width define the available width. Expanded layout starts above fontScale **1.05**, or when effective content width is below 260; this deliberately covers a modest initial increase rather than waiting for maximum accessibility sizes. Normal 320/390/430-unit test viewports retain four quick actions. Expanded layouts use two columns while effective width is at least 135, then one column. These thresholds are local implementation choices pending physical review.
- `mobile/src/app/city/[citySlug]/index.tsx`: quick actions wrap into balanced rows with equal computed cell widths; no fixed cell height. Tour cards stack image above content in expanded layout; image retains its ratio and title/action remain complete. Expanded descriptions/stop names also lose their normal preview line limits. Link/Slot-bound styles stay flattened objects. All behavior/state/navigation handlers are unchanged.
- `mobile/src/components/WalkControls.tsx`: compact category groups fill 100% of their container. Four equal segments at normal size; two equal columns in expanded layout. List/Map remains two equal halves at every tested size. Selected/unselected labels are centered, including Arabic; labels remain real, scaling Text. The 44-unit minimum target and compact vertical padding remain, with no fixed height or auto-fit. Planner controls keep their default presentation.
- `mobile/src/components/NativeChrome.tsx`: bottom-tab labels wrap without auto-fit or line limits; all five destinations/order/handlers remain. The bar is explicitly non-shrinking and grows in normal flow. Therefore the scroll viewport becomes shorter automatically as the bar grows; no cached tab-height spacer or absolute overlay needs updating. Existing scroll-content bottom padding and safe-area handling remain. Native verification that the final item stays reachable is still required. The CITYWALK wordmark's existing fit behavior is separate from tab/action labels and was not redesigned.
- `mobile/src/components/ImageOverlayHero.tsx`: removed the **full-image** `rgba(7,30,64,0.58)` overlay entirely. Only the intrinsic text block now has `rgba(7,30,64,0.68)` behind it, with 16-unit outer margin/padding and a 12-unit radius. Surrounding image pixels render at original brightness; text stays opaque white. Same bundled source, crop math, page margins, real overlaid headings, minimum hero height and CTA order. Text growth increases the hero height. Brightness remains pending owner review.

Membership, English silent-mode audio/Pause/Resume, exact-language German audio notice, Add stop, navigation, placeholders, translation keys and backend/media/storage code were not changed.

## Regression coverage

Tests updated/added: `compact-city-filters.test.tsx`, `native-v2-regressions.test.tsx`, `native-screen-chrome.test.tsx`, `membership-presentation.test.tsx`, `membership-screens.test.tsx` (dimension bridge), `responsive-text.test.ts`.

Synthetic coverage includes all six launch locales plus Arabic; widths 320/390/430; scale 1, 1.1, 1.12, 1.3, 2, 2.5 and 3 where relevant; direct enlarged startup and mounted changes back to normal. Checks cover actual responsive consumer branching, no auto-fit/line clamp, full-width groups, category retention through List/Map changes, RTL, Slot object styles, complete source strings and navigation flow ordering. Mocked dimensions and styles **do not prove native glyph layout, measured bar clearance or visual acceptance**.

No shared i18n checks were needed: no translation code/data changed. Final mobile suite, TypeScript/lint results are recorded in the README ledger.

Final results: **422 tests / 53 files PASS**, zero unhandled errors; mobile TypeScript **PASS**, lint **PASS / zero warnings**, scoped diff checks **PASS**. The single-worker full run took 113.47 seconds. An earlier concurrent run timed out one planner test at its existing 5-second limit; no timeout increase, planner change or skipped test was used. The final run includes the owner's modest-enlargement cases as well as larger synthetic scales.

## Original physical checklist — English 110% subsequently accepted

1. Open CITYWALK City Hub at the previous normal size. Without terminating CITYWALK, use Control Center → Text Size → **110%, All Apps**, then return. Record actual runtime fontScale/viewport through the read-only inspector if connected; do not infer values from the percentage.
2. In EN then DE, verify the complete Build my walk/Start tour text, readable Near me/Saved labels, complete recommended-tour title and all five readable bottom-tab labels. Expect more space/columns changing instead of tiny labels. Confirm the last content item is reachable above the growing bar.
3. Return to the previous size while mounted: normal four-action row and horizontal tour card should return. Repeat by opening with 110% already selected, then at a larger accessibility setting. Record actual settings/model/iOS only when available; do not reduce the owner's preferred text size as a workaround.
4. Verify categories fill the page width (four equal segments normally; two columns when expanded), List/Map fills two halves, and switching view retains the category. Check representative Arabic ordering/centered labels.
5. Review **both full heroes**: surrounding artwork should be brighter, with contrast restricted behind the real text. Heading must grow without clipping or covering the CTA. English 110% brightness was subsequently owner-confirmed; other settings/locales require their own evidence.

Previously accepted membership behavior remains recorded as owner PASS; no Android or release acceptance is inferred.
