# Separate blockers and evidence gaps

These do not change owner D01–D14 decisions or authorize implementation.

## B-TIME-01 — Return-by midnight

**UNRESOLVED / EXPECTED FAILURE**. Screen08 regression case D03 remains expected failure. This is not overlap candidate D03. No timing fix is authorized.

[Existing evidence](</Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/docs/qa/screen-flow-consolidation-2026-10-27/screen-08-android-focus-guard-2026-10-29/REPORT.md>)

## B-TIME-02 — Time-zone/day intent

**PENDING TECHNICAL CONTRACT**. Existing regression D04 and day/zone metadata remain separate dependencies; no car/transit or broad persistence work.

[Existing evidence](</Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/docs/qa/screen-flow-consolidation-2026-10-27/screen-08-slice-02-implementation-2026-10-29/CASE-MAPPING.md>)

## B-CONTENT-01 — Published duration scope

**OWNER/SOURCE DECISION REQUIRED**. Hub/list/filter compare raw publisher estimate; Preview reports summed visits and unknown walking/total.45 and120 are not interchangeable full-experience budgets.

[Existing evidence](</Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/lib/publishedRouteTiming.ts>)

## B-NATIVE-01 — VoiceOver/TalkBack

**PENDING / PHYSICAL DEVICE LIMIT**. Physical VoiceOver unavailable; spoken/focus TalkBack not established. Screenshots, metadata and bundles are not assistive-technology acceptance.

[Existing evidence](</Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/docs/qa/screen-flow-consolidation-2026-10-27/screen-08-android-focus-guard-2026-10-29/ACCEPTANCE-MATRIX.md>)

## B-NATIVE-02 — iOS max text and gestures

**BLOCKED IN PRIOR QA**. Complete small-iPhone maximum-text scrolling and edge gestures require reliable native/physical interaction.

[Existing evidence](</Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/docs/qa/screen-flow-consolidation-2026-10-27/screen-08-native-qa-recovery-2026-10-29/REPORT.md>)

## B-NATIVE-03 — Remaining device/account matrix

**NOT TESTED / PARTIAL**. Small Android/German native matrix, live authenticated session and broader process/field acceptance are not closed by the standard Android guest Back fix.

[Existing evidence](</Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/docs/qa/screen-flow-consolidation-2026-10-27/screen-08-android-focus-guard-2026-10-29/ACCEPTANCE-MATRIX.md>)

## B-QA-01 — Intermittent unchanged fixture

**TRACK SEPARATELY**. One Arabic membership save-state case failed once; isolated and final full reruns passed. Also retain development-refresh unsaved-draft limitation; original QA values were restored. No fix in this review.

[Existing evidence](</Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/docs/qa/screen-flow-consolidation-2026-10-27/screen-08-android-focus-guard-2026-10-29/REPORT.md>)

## B-EVIDENCE-01 — Missing native OLD/alternate captures

**REVIEW EVIDENCE GAP**. Missing images are marked; do not infer missing functionality or manufacture OLD screens. D11 requires native Trips/Saved evidence before any future visual/tab change.

[Existing evidence](</Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/docs/qa/screen-flow-consolidation-2026-10-27/screenshot-provenance.json>)
