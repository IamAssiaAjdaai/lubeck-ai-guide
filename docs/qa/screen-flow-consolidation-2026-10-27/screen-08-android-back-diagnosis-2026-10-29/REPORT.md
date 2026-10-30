# Screen08 Android hardware Back diagnosis — 2026-10-29

**Verified root cause: an unfocused, still-mounted NativeWalkFlow consumes Android Back and advances its hidden onboarding cursor. No fix implemented.**

Worktree `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`; branch `codex/onboarding-global-welcome`; HEAD `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus the unchanged approved/Slice02 worktree. All 1,054 source/test/config/asset hashes are identical after removing temporary logs. [Preservation](PRESERVATION.json). Mobile Core diagnosis only; Public/Admin Web not applicable. Targeted GitHub preflight: develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591`, main `88191e77e55a489804c49bccccf6307b5876b41d`; neither modified. Current owner instructions govern scope.

## Reproduction

Existing Pixel_9 read-only AVD, Android17/API37, same separate `com.citywalk.app.dev` client recovered in the preceding QA task; actual worktree JavaScript served by Metro8091. No reset, reinstall, rebuild, auth or native configuration change. Native patch-level compatibility limits from the prior report still apply; the causal error is directly observed in the current JS handler.

1. In the existing guest draft, reach Screen08. Select Explore city.
2. Observe one Hub PUSH above the retained planner. Hub is focused; planner.isFocused() is false; return lease resolves.
3. Send Android KEYCODE_BACK. Hub remains focused at unchanged index/key. Background planner's handler logs consumed=true, changes constraints → confirmation and lease becomes invalid. No navigation action occurs.
4. Tap visible Back: GO_BACK removes the Hub and exposes Screen08 on the original planner key.
5. Repeat from a fresh optional Hub visit, pressing hardware Back twice. Both are consumed; Hub stays visible, hidden planner moves constraints → confirmation → location. Visible Back then reveals Location.

This distinguishes the user's “subsequent Back” observation: in this trace, the visible Back reveals Screen08 after one hardware press. A second **hardware** press also stays on Hub and advances the hidden cursor again. Do not assume both Back controls behave alike.

[Detailed event trace](NAVIGATION-TRACE.md), [69 full sanitized snapshots](NAVIGATION-TRACE.json), [Hub after first hardware Back](trace-hub-after-first-hardware.png), [visible Back reveals08](trace-visible-back-after-hardware.png), [repeated Back](trace-hub-after-repeated-hardware.png).

## Verified mechanism and alternatives

`mobile/src/components/NativeWalkFlow.tsx:579` installs a BackHandler listener in a normal effect; it removes on effect cleanup, not blur. At line595, a new plan calls draftBack without checking navigation focus. `draftBack` at line530 updates the cursor and returns true. React Native's installed `BackHandler.android.js` dispatches newest listeners first and stops on true; Expo Router's installed `fork/useBackButton.native.js` otherwise calls root navigation.goBack(). The trace demonstrates that the planner wins and prevents that normal stack action.

This is an overly active background listener, not evidence of an obsolete closure: it has the current cursor and correctly re-registers/removes as that cursor changes. Blur is delivered correctly and isFocused() returns false. Storage reads and lease focus behavior remain separate.

| Hypothesis | Evidence / conclusion |
|---|---|
| Duplicate optional Hub | Rejected for reproduction: each Explore tap adds exactly one Hub, index6→7. Historical earlier Hub below the planner is not a duplicate browse push. Same Hub key stays focused after failing presses. |
| Wrong focus state | Rejected: actual stack focus is Hub/assistant and synchronous planner.isFocused() is false. The handler ignores that correct signal. |
| Pop interception | No pop is attempted by failing hardware event: consumed=true, no root action. Visible GO_BACK and targeted Build POP succeed in the same run; no application beforeRemove/preventRemove interceptor found. |
| Lease invalidation causes first failure | Rejected: lease is valid at hardware entry/return. It becomes invalid after hidden cursor changes and leaseReady cleanup. Invalidation is a consequence, not the initiating cause. |
| Hub transition race | Not needed to explain observed failure: native hierarchy was captured after entry; settled and repeated presses show the same focused Hub and hidden mutation. No duplicate/racing PUSH observed. Broader rapid-input race matrix remains proposed coverage. |
| Guide-specific problem | Same background handler also consumes Back while assistant/fallback is focused at index8; no GO_BACK. Visible Guide Back returns to Hub correctly when no hardware press intervenes. |

Hub Build control dispatches actual POP count1 with exact source/target and focuses retained constraints. Continue Planning also restores constraints without a Hub detour. No Build or Start action was executed; no route preview/current-walk write was created during diagnosis.

## Diagnostic boundary

Temporary observation-only logging was inserted into the existing Back effect in **one file**, NativeWalkFlow.tsx. The original callback branches/return value were wrapped without changing outcomes. Root state/action events and focus/blur were observed; no settings/route params were logged. [Temporary instrumentation diff](temporary-instrumentation.diff) is evidence only. It was removed byte-for-byte after capture; no logging remains in application source. Initial read-only Hermes inspector attempts timed out; source-based diagnostic logs were used instead. No dependencies were installed. This task's transient full-content baseline/constraints dumps were discarded so the diagnosis package retains navigation-only evidence.

Android draft is restored to constraints, same planner identity; no preferences edited, route generated, Start pressed or existing walk replaced. No iOS interaction was performed. Native spoken accessibility, live authenticated session, background/foreground and existing-walk resume were not newly tested; they remain explicit regression/acceptance requirements.

## Proposed next action and risk

[Minimal fix proposal](MINIMAL-FIX-PROPOSAL.md): synchronous focus guard before **all** BackHandler branches in NativeWalkFlow.tsx, with navigation in dependencies. Return false when unfocused so the existing root Back handler can pop the visible Hub/Guide. Keep focused internal steps, legacy controls and no-navigation fixture behavior. No route, lease, storage or visual redesign needed.

[Regression plan](REGRESSION-PLAN.md): verify actual route keys/index/focus/actions on real stack and Android, alongside existing assertions. Current mock-only hardware tests cannot prove this interaction. No tests were changed or run as a substitute for device reproduction. Full lint/types/bundles were not rerun because production/test source is restored; source hashes and git diff --check validate this diagnosis-only handoff.

Risk: focus checks must apply to every branch, not just onboarding; otherwise hidden proposal/panel/rebuild controllers can still steal Back. A stale captured focus boolean is insufficient; read navigation.isFocused() at event time. Retained components must stay mounted for draft continuity. Do not revoke leases on supported blur, navigate twice, or introduce new drafts as a workaround. Full real-stack/native tests and existing current/saved-walk checks are required before acceptance. Cold-process draft restoration, midnight/time-zone fixes, AT/physical-device and live-auth acceptance remain outside this fix scope.

Screens01–13 source and visuals, pending Screen14 and D01–D14, Slice01/Slice02/helper/storage contracts are preserved. No production fix, test migration, commit, push, merge, deployment or legacy deletion. Owner approval is required before implementing the proposed guard and regression coverage.
