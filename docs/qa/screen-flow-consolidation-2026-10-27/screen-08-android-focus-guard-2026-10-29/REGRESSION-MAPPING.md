# Added regression mapping

`mobile/tests/walk-flow.behavior.tsx`: ten ordinary cases, no expected-failure conversion.

| IDs | Variants | Coverage |
|---|---|---|
| AB01 | guest true/false | actual installed StackRouter GO_BACK result, same owner key, popped Hub key, constraints, retained Edit selection, no writes |
| AB02 | delayed blur | synchronous isFocused decline before React blur delivery; same stack object, lease resolution, cursor, read/write counts |
| AB03 | settled/rapid | one real stack pop followed by internal08/Location, same owner/index |
| AB04 | hardware and visible exits in one case | Guide stack transitions and Hub lease preservation |
| AB05 | targeted POP | real installed reducer applies validated helper target and retains duration |
| AB06 | preview/active | existing walk skips onboarding, unfocused declines, original current bytes retained, no persist/default hydration |
| AB07 | lifecycle | effect cleanup and unmount leave no orphan planner handler |

Harness uses installed Expo StackRouter state reduction and derives isFocused synchronously from its real focused route key. Root Back fallback uses GO_BACK through that reducer. RN last-registered-first/stop-on-true dispatch is modeled by a listener collection. Production controller is rendered with existing DOM/native-view and I/O doubles. It is **not** a mounted NavigationContainer test; actual mounted-container evidence comes from the Android trace. No custom fake pop or cursor implementation satisfies the tests. Installed internal router import is test-only and may require test adaptation on an Expo upgrade.

Red baseline: six failed, four passed controls. Guard applied without relaxing assertions: ten pass. Existing 756 expect-call chains (including nested calls) remain verbatim. Existing City Hub adapter and storage tests run unchanged. Background/foreground and Guide dismissTo acceptance were exercised natively. Full cold-process unsaved draft restoration is not supported or implied; authenticated physical/AT and broader multi-controller native permutations remain manual gates.
