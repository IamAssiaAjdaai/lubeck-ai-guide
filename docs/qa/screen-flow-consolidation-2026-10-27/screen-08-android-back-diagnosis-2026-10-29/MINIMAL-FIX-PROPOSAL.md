# Proposed fix — NOT IMPLEMENTED

Production boundary: **one file**, `mobile/src/components/NativeWalkFlow.tsx`, existing hardwareBackPress effect at lines 579–605.

Before any rebuild/proposal/panel/internal-step branch, synchronously check the controller's actual navigation focus. When a navigation object exists and `navigation.isFocused()` is false, return false immediately, without mutating state, revoking leases, dispatching navigation or cancelling pending work. Include `navigation` in the effect dependency list. Keep the current focused-handler branches and standalone/no-navigation behavior intact.

This lets the existing Expo Router/React Navigation root Back listener perform normal GO_BACK for the focused Hub or assistant. Once the planner is focused, its existing internal Back sequence continues to operate. Prefer this small guard to replacing navigation, changing leases, adding a Hub-specific handler or broadening to a new useFocusEffect lifecycle. Verify all stages, not just new-draft cursor: a hidden proposal/panel/rebuild branch must also decline Back.

No edits proposed to RootLayout, NativeBrand, City Hub, assistant, plannerReturnIntent public contract, storage, authentication, payments, backend, approved styles or Screen14. No changes to D01–D14. Keep existing storage re-observation and original write-receipt freshness rules separate from navigation identity.

Proposed test boundary (subject to owner authorization): extend `mobile/tests/walk-flow.behavior.tsx` with focused/unfocused branch coverage without replacing assertions; add `mobile/tests/planner-navigation-stack.test.tsx` only if the existing runner can mount the actual Expo/React Navigation stack, with a faithful multi-listener Back dispatcher and real stack reducer. Native acceptance must exercise real Android Back and inspect root state; a mocked callback/dispatch assertion alone cannot close the bug. Preserve `mobile/tests/city-hub-actions.test.tsx` existing adapter coverage; extend only for verified needs. A native-only test harness under `docs/qa/` may observe sanitized route keys/actions during acceptance, with no permanent production logging.

No new navigation library, native config, dependency or persistent diagnostics. If real-stack automation requires a new dependency or production test hook, report that boundary before expanding it. Use existing ADB/native QA to establish the required route-level evidence in the meantime.
