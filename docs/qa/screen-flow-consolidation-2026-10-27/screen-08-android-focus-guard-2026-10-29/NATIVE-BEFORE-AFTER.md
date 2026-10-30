# Android navigation before / after

Before: [verified original trace](../screen-08-android-back-diagnosis-2026-10-29/NAVIGATION-TRACE.md), [raw snapshots](../screen-08-android-back-diagnosis-2026-10-29/NAVIGATION-TRACE.json). The 1,054-file baseline manifest matches that diagnosis. The failing code was not reintroduced for a second device run.

After: [128 actual native snapshots](NATIVE-TRACE-AFTER.json), [timestamped log](native-trace-after.raw.log), [native actions](android-secondary-actions.jsonl). Actual emulator-5556; original before evidence was emulator-5554. Keys differ between sessions; retained owner identity is verified within each session, not compared literally across devices.

| Event | Before | After |
|---|---|---|
| Hub focused; planner receives Back | ownFocused=false, consumes=true | ownFocused=false, consumes=false |
| Planner cursor while Hub covered | constraints → confirmation | constraints unchanged |
| Lease while Hub covered | revoked after hidden cursor mutation | resolves until actual planner focus return; then expected focus revalidation revokes |
| Root action | none | GO_BACK, one Hub removed |
| Actual result | Hub stays visible | original planner key at constraints |
| Two rapid Back presses | background cursor advances with no pop | Hub → constraints → 08; one pop total |
| Guide hardware Back | background planner consumes, Guide stays | planner declines, GO_BACK returns to same Hub |

After stack `stack-QsQTPmvJkOHPIVF3_pKcO`, initial planner `city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1`, index2. One optional Hub occupies index3; assistant index4. Six unfocused hardware callbacks all return false; each is followed by a real root GO_BACK. All focused internal Back calls retain their prior behavior.

`leaseValid` means helper.resolve succeeds for the **currently focused route**. It deliberately returns false on an assistant route, even while the Hub return lease still exists. Resolving true after Guide → Hub establishes preservation. `focusReady` is a captured React value; synchronous `ownFocused` is the actual event-time navigation focus. No params, account data, location or preference values are in the trace.

| Seq | Event | Planner focused | Cursor | Stack index | Actual focused route key | Lease resolves | Consumed | Root action |
|---|---|---|---|---|---|---|---|---|
| 2 | focus | True | interests | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | null |
| 14 | action | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | {"type":"PUSH","target":"stack-QsQTPmvJkOHPIVF3_pKcO"} |
| 15 | blur | False | constraints | 3 | city/[citySlug]/index-8L-ufbibFCT40F5o7GOq- | True | — | null |
| 17 | hardware-enter | False | constraints | 3 | city/[citySlug]/index-8L-ufbibFCT40F5o7GOq- | True | — | null |
| 18 | hardware-return | False | constraints | 3 | city/[citySlug]/index-8L-ufbibFCT40F5o7GOq- | True | False | null |
| 19 | action | False | constraints | 3 | city/[citySlug]/index-8L-ufbibFCT40F5o7GOq- | True | — | {"type":"GO_BACK"} |
| 20 | focus | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | null |
| 22 | hardware-enter | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | null |
| 23 | hardware-return | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | True | null |
| 26 | hardware-enter | True | confirmation | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | null |
| 27 | hardware-return | True | confirmation | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | True | null |
| 34 | action | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | {"type":"PUSH","target":"stack-QsQTPmvJkOHPIVF3_pKcO"} |
| 35 | blur | False | constraints | 3 | city/[citySlug]/index-pQGi7fXDjF-YdOw_NOtie | True | — | null |
| 37 | action | False | constraints | 3 | city/[citySlug]/index-pQGi7fXDjF-YdOw_NOtie | True | — | {"type":"NAVIGATE","target":"stack-QsQTPmvJkOHPIVF3_pKcO"} |
| 39 | hardware-enter | False | constraints | 4 | city/[citySlug]/assistant-zVipqpaI-UZLx74SD8RdS | False | — | null |
| 40 | hardware-return | False | constraints | 4 | city/[citySlug]/assistant-zVipqpaI-UZLx74SD8RdS | False | False | null |
| 41 | action | False | constraints | 4 | city/[citySlug]/assistant-zVipqpaI-UZLx74SD8RdS | False | — | {"type":"GO_BACK"} |
| 43 | hardware-enter | False | constraints | 3 | city/[citySlug]/index-pQGi7fXDjF-YdOw_NOtie | True | — | null |
| 44 | hardware-return | False | constraints | 3 | city/[citySlug]/index-pQGi7fXDjF-YdOw_NOtie | True | False | null |
| 45 | action | False | constraints | 3 | city/[citySlug]/index-pQGi7fXDjF-YdOw_NOtie | True | — | {"type":"GO_BACK"} |
| 46 | focus | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | null |
| 48 | hardware-enter | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | null |
| 49 | hardware-return | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | True | null |
| 54 | action | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | {"type":"PUSH","target":"stack-QsQTPmvJkOHPIVF3_pKcO"} |
| 55 | blur | False | constraints | 3 | city/[citySlug]/index--abqB8ZyRroSe-KpKnEjp | True | — | null |
| 57 | action | False | constraints | 3 | city/[citySlug]/index--abqB8ZyRroSe-KpKnEjp | True | — | {"type":"POP","source":"city/[citySlug]/index--abqB8ZyRroSe-KpKnEjp","target":"stack-QsQTPmvJkOHPIVF3_pKcO","count":1} |
| 58 | focus | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | null |
| 62 | hardware-enter | True | interests | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | null |
| 63 | hardware-return | True | interests | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | True | null |
| 66 | hardware-enter | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | null |
| 67 | hardware-return | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | True | null |
| 72 | action | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | {"type":"PUSH","target":"stack-QsQTPmvJkOHPIVF3_pKcO"} |
| 73 | blur | False | constraints | 3 | city/[citySlug]/index-F3yJYSYGqRPfT7-5ZngOz | True | — | null |
| 75 | hardware-enter | False | constraints | 3 | city/[citySlug]/index-F3yJYSYGqRPfT7-5ZngOz | True | — | null |
| 76 | hardware-return | False | constraints | 3 | city/[citySlug]/index-F3yJYSYGqRPfT7-5ZngOz | True | False | null |
| 77 | action | False | constraints | 3 | city/[citySlug]/index-F3yJYSYGqRPfT7-5ZngOz | True | — | {"type":"GO_BACK"} |
| 78 | focus | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | null |
| 80 | hardware-enter | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | null |
| 81 | hardware-return | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | True | null |
| 86 | hardware-enter | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | null |
| 87 | hardware-return | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | True | null |
| 92 | action | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | {"type":"PUSH","target":"stack-QsQTPmvJkOHPIVF3_pKcO"} |
| 93 | blur | False | constraints | 3 | city/[citySlug]/index-EE_b3EiiZXFW5kRnfp0PP | True | — | null |
| 95 | hardware-enter | False | constraints | 3 | city/[citySlug]/index-EE_b3EiiZXFW5kRnfp0PP | True | — | null |
| 96 | hardware-return | False | constraints | 3 | city/[citySlug]/index-EE_b3EiiZXFW5kRnfp0PP | True | False | null |
| 97 | action | False | constraints | 3 | city/[citySlug]/index-EE_b3EiiZXFW5kRnfp0PP | True | — | {"type":"GO_BACK"} |
| 98 | focus | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | null |
| 100 | hardware-enter | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | null |
| 101 | hardware-return | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | True | null |
| 106 | action | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | {"type":"PUSH","target":"stack-QsQTPmvJkOHPIVF3_pKcO"} |
| 107 | blur | False | constraints | 3 | city/[citySlug]/index-qcu7sXO4k_i0y2oRRBunx | True | — | null |
| 109 | action | False | constraints | 3 | city/[citySlug]/index-qcu7sXO4k_i0y2oRRBunx | True | — | {"type":"NAVIGATE","target":"stack-QsQTPmvJkOHPIVF3_pKcO"} |
| 111 | action | False | constraints | 4 | city/[citySlug]/assistant-m8GTUFqvXI3541fjDPKjh | False | — | {"type":"POP_TO","target":"stack-QsQTPmvJkOHPIVF3_pKcO"} |
| 113 | hardware-enter | False | constraints | 3 | city/[citySlug]/index-qcu7sXO4k_i0y2oRRBunx | True | — | null |
| 114 | hardware-return | False | constraints | 3 | city/[citySlug]/index-qcu7sXO4k_i0y2oRRBunx | True | False | null |
| 115 | action | False | constraints | 3 | city/[citySlug]/index-qcu7sXO4k_i0y2oRRBunx | True | — | {"type":"GO_BACK"} |
| 116 | focus | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | null |
| 122 | action | True | constraints | 2 | city/[citySlug]/walk-MiBxaNaBLK-wf6ObAONo1 | False | — | {"type":"GO_BACK"} |
| 125 | focus | True | interests | 2 | city/[citySlug]/walk-q5edYRHUooddVAMJLq8Wf | False | — | null |

Relevant sequences: 17–20 first Hub Back; 39–46 Guide → Hub → planner; 57 targeted Build return; 62–65 Edit Back; 75–83 rapid two-event Back; 95–98 HOME/foreground then Back; 109–116 assistant Explore places POP_TO then Hub Back. Explicit Build later enters preview; native screenshot shows Start walk without pressing it. Preview exit unmounts the observer, so there is an expected tracing gap while no planner is mounted; a new controller registers/hydrates the existing preview on resume. UI and source tests provide that resume evidence, not an invented root action in the gap.

[Hub before Back](native-hub-before-hardware.png) · [constraints after Back](native-first-hardware-constraints.png) · [second Back reaches08](native-second-hardware-screen08.png) · [Guide Back reaches Hub](native-guide-hardware-hub.png) · [preview Start remains explicit](native-preview-scrolled.png).
