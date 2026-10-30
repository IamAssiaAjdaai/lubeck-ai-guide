# Android navigation trace

[Full sanitized records](NAVIGATION-TRACE.json) · [native log timestamps](navigation-trace.raw.log) · [ordered native actions](android-actions.jsonl).

Owning stack: `stack-5EDe7FCbsqYjy-VF0dOiM`. Retained planner: `city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a` at index 6. Baseline earlier routes at indices 0–5 are historical discovery/Profile/Hub visits, preserved without reset. The optional browse adds exactly one Hub at index 7; assistant is index 8. Every full snapshot records all route names and keys, without params. No account IDs, credentials, GPS coordinates or preference values are logged. `focusReady` is the effect's captured value; `ownFocused` is a fresh synchronous navigation.isFocused() read and is the authoritative focus observation.

| Seq | Event | Planner focused | Planner cursor | Stack index | Actual focused route key | Lease resolves | Consumed | Dispatched action |
|---|---|---|---|---|---|---|---|---|
| 1 | register | True | constraints | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | — | — |
| 2 | hardware-enter | True | constraints | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | — | — |
| 3 | hardware-return | True | constraints | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | True | — |
| 5 | register | True | confirmation | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | — | — |
| 7 | register | True | constraints | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | — | — |
| 8 | action | True | constraints | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | — | {"type":"PUSH","target":"stack-5EDe7FCbsqYjy-VF0dOiM"} |
| 9 | blur | False | constraints | 7 | city/[citySlug]/index-ZOZeC19YV23XQvMYRgx7m | True | — | — |
| 11 | hardware-enter | False | constraints | 7 | city/[citySlug]/index-ZOZeC19YV23XQvMYRgx7m | True | — | — |
| 12 | hardware-return | False | constraints | 7 | city/[citySlug]/index-ZOZeC19YV23XQvMYRgx7m | True | True | — |
| 14 | register | False | confirmation | 7 | city/[citySlug]/index-ZOZeC19YV23XQvMYRgx7m | False | — | — |
| 15 | action | False | confirmation | 7 | city/[citySlug]/index-ZOZeC19YV23XQvMYRgx7m | False | — | {"type":"GO_BACK"} |
| 16 | focus | True | confirmation | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | — | — |
| 19 | register | True | constraints | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | — | — |
| 20 | action | True | constraints | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | — | {"type":"PUSH","target":"stack-5EDe7FCbsqYjy-VF0dOiM"} |
| 21 | blur | False | constraints | 7 | city/[citySlug]/index-HmOJA_yQot3zxuVAi4t38 | True | — | — |
| 23 | hardware-enter | False | constraints | 7 | city/[citySlug]/index-HmOJA_yQot3zxuVAi4t38 | True | — | — |
| 24 | hardware-return | False | constraints | 7 | city/[citySlug]/index-HmOJA_yQot3zxuVAi4t38 | True | True | — |
| 26 | register | False | confirmation | 7 | city/[citySlug]/index-HmOJA_yQot3zxuVAi4t38 | False | — | — |
| 27 | hardware-enter | False | confirmation | 7 | city/[citySlug]/index-HmOJA_yQot3zxuVAi4t38 | False | — | — |
| 28 | hardware-return | False | confirmation | 7 | city/[citySlug]/index-HmOJA_yQot3zxuVAi4t38 | False | True | — |
| 30 | register | False | location | 7 | city/[citySlug]/index-HmOJA_yQot3zxuVAi4t38 | False | — | — |
| 31 | action | False | location | 7 | city/[citySlug]/index-HmOJA_yQot3zxuVAi4t38 | False | — | {"type":"GO_BACK"} |
| 32 | focus | True | location | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | — | — |
| 35 | register | True | confirmation | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | — | — |
| 37 | register | True | constraints | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | — | — |
| 38 | action | True | constraints | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | — | {"type":"PUSH","target":"stack-5EDe7FCbsqYjy-VF0dOiM"} |
| 39 | blur | False | constraints | 7 | city/[citySlug]/index-wdkQMRhKrHdAZaAwSdGzx | True | — | — |
| 41 | action | False | constraints | 7 | city/[citySlug]/index-wdkQMRhKrHdAZaAwSdGzx | True | — | {"type":"POP","source":"city/[citySlug]/index-wdkQMRhKrHdAZaAwSdGzx","target":"stack-5EDe7FCbsqYjy-VF0dOiM","count":1} |
| 42 | focus | True | constraints | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | — | — |
| 44 | hardware-enter | True | constraints | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | — | — |
| 45 | hardware-return | True | constraints | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | True | — |
| 47 | register | True | confirmation | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | — | — |
| 49 | register | True | constraints | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | — | — |
| 50 | action | True | constraints | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | — | {"type":"PUSH","target":"stack-5EDe7FCbsqYjy-VF0dOiM"} |
| 51 | blur | False | constraints | 7 | city/[citySlug]/index-ceiM7YPYn8rx3TiC8ryva | True | — | — |
| 53 | action | False | constraints | 7 | city/[citySlug]/index-ceiM7YPYn8rx3TiC8ryva | True | — | {"type":"NAVIGATE","target":"stack-5EDe7FCbsqYjy-VF0dOiM"} |
| 55 | action | False | constraints | 8 | city/[citySlug]/assistant-2rMq0tUuUL5Ruw2jBbOfA | False | — | {"type":"GO_BACK"} |
| 57 | action | False | constraints | 7 | city/[citySlug]/index-ceiM7YPYn8rx3TiC8ryva | True | — | {"type":"NAVIGATE","target":"stack-5EDe7FCbsqYjy-VF0dOiM"} |
| 59 | hardware-enter | False | constraints | 8 | city/[citySlug]/assistant-ZqemwQzmzI4LT8feG8UVV | False | — | — |
| 60 | hardware-return | False | constraints | 8 | city/[citySlug]/assistant-ZqemwQzmzI4LT8feG8UVV | False | True | — |
| 62 | register | False | confirmation | 8 | city/[citySlug]/assistant-ZqemwQzmzI4LT8feG8UVV | False | — | — |
| 63 | action | False | confirmation | 8 | city/[citySlug]/assistant-ZqemwQzmzI4LT8feG8UVV | False | — | {"type":"GO_BACK"} |
| 65 | action | False | confirmation | 7 | city/[citySlug]/index-ceiM7YPYn8rx3TiC8ryva | False | — | {"type":"GO_BACK"} |
| 66 | focus | True | confirmation | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | — | — |
| 69 | register | True | constraints | 6 | city/[citySlug]/walk-XDdFLIPtMGXe1v3-7r01a | False | — | — |

Hardware-event outcomes:

- 2–5: focused constraints → confirmation, consumed true, stack remains planner/index 6. Expected internal Back.
- 11–14: Hub focused at index 7; background constraints callback consumes true; hidden cursor becomes confirmation, lease true → false, stack unchanged. No action dispatch. Header Back then emits GO_BACK (15), focuses the same planner key at confirmation (16).
- 23–30: repeated hardware presses both consumed by the unfocused planner; constraints → confirmation → location. Hub key/index unchanged; no navigation action. Header GO_BACK (31) reveals Location (32), not a missing Hub pop.
- 38–42: positive control: one Hub PUSH, then explicit Build my walk dispatches POP count 1 with exact source/target; same planner key focuses at constraints.
- 44–47: another focused constraints Back correctly reaches confirmation without a stack pop.
- 50–57: Hub → assistant uses NAVIGATE; assistant visible Back emits GO_BACK and returns to same Hub key. Lease resolves again on Hub. A second assistant entry creates a fresh assistant key.
- 59–62: assistant focused at index 8; unfocused planner consumes hardware Back, hidden constraints → confirmation. No action dispatch, assistant remains visible. Visible Back emits GO_BACK to Hub (63), then GO_BACK to planner (65), revealing confirmation (66). Continue planning restores constraints (69).

No root action is recorded between each failing hardware-enter/return and subsequent hidden-cursor register. This is positive evidence of consumption, not merely an absence of UI movement. Root __unsafe_action__ observes successful GO_BACK/POP controls in the same run. It is diagnostic-only API usage; no application dependency is proposed.
