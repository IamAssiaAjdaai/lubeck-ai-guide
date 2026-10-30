# Slice 02 — regression and legacy assertion review

**Planning only. Every existing assertion and Slice 01 helper/test remains unchanged.**

## Expected failures to convert only after real success

| Case | Existing test | Required new ordinary result / fixture requirement |
|---|---|---|
| T01 | `walk-flow.behavior.tsx:1298` | Real Continue planning renders Build-capable constraints, no interest grid, Hub push, persistence or Start |
| T02 | `walk-flow.behavior.tsx:1306` | Skipped `[]` reaches actual shared planner/preview; no default resurrection; guarded-write prerequisite required |
| T05 | `walk-flow.behavior.tsx:1314` | Constraints Back reaches 08; extend to full screen/Android chain and gesture guard. Existing test clicks an obsolete intermediate Continue after Explore; update navigation Arrange/Act only after approval, retain target/preservation assertions |
| I02 | `city-hub-actions.test.tsx:249` | Forged/wrong mount/key never pops or calls global Back; correct same-city instance still returns. Must assert actual fallback too, not merely an uncalled spy |
| I03 | `city-hub-actions.test.tsx:243` | Bare/array/malformed/wrong-version/cold envelope cannot pop; ordinary hydration link remains available |
| I08 | `city-hub-actions.test.tsx:256` | Full parsed envelope forwarded; add real assistant round-trip and final native validation. Existing positive fixture must publish a real matching lease if forwarding is gated by liveness |
| A01 | `first-experience.test.tsx:52` | EN/DE planning and browse are distinct real actions, independent callbacks, roles/focus/long names. Existing fixture supplies only onExplore/onBack; supply the real onContinue interface once implemented, retaining current assertions and adding actual click checks |

A test that only stops calling global Back is insufficient I02/I03 evidence: assert valid owning-stack pop/count, invalid ordinary href/focus behavior, no duplicate walk, real controller values and no writes/start. Never mock the lease helper or replace navigation-state behavior with the desired cursor in a test.

## Pending coverage to activate

- I01/I04/I05/I06/I07: unchanged standalone helper suite remains green; add **real controller/Hub** commit order, double-tap/Strict Mode, no publication before healthy constraints, remount/cold runtime, token cleanup, intermediate-screen and focus/stack-change assertions. Do not copy the helper in tests.
- R01–R04: exact value fingerprint, locale/auth refresh, normalized source/add/city remount, retained 90→240 with no account save.
- T04/T06/T07/E06: normal and edit-return Back/Continue/Skip, modal priority, no intro for Customize/add, preservation of original journey.
- C01/C02/C03/D02/D05: actual shared planner settings/effects, real manual/GPS/denied paths and all finish modes. T03/P01 and picker reopen baselines must continue passing.
- G04: no generation/write/start from any S08/Back/Edit/browse callback; only explicit guarded Build then explicit Start. Broader G01–G03 remain separate build-safety dependencies.
- A02: native gate remains blocked until actual implemented iOS/Android/assistive-technology evidence; unit snapshots never close it.

Proposed existing test boundaries: `walk-flow.behavior.tsx` (through unchanged loader `walk-flow.test.tsx`), `city-hub-actions.test.tsx`, `first-experience.test.tsx`, `screen-08-contract-pending.test.ts`, and only the owner-approved navigation contract cases in `native-v2-regressions.test.tsx`. Proposed new rendered tests: `city-assistant-return.test.tsx` and `planner-navigation.test.tsx` for the real WalkScreen scope/native integration. Existing `planner-return-intent.test.ts`, persistence regressions and all other capability assertions remain unchanged. If a new direct import needs a native port mock, mock that port's observable calls, not the feature.

## Incompatible historical expectations — owner decision required

These are not merely missing fixtures. The same input cannot both authorize boolean-only global Back and reject it. Current assertions are preserved now and must not be weakened in an implementation:

| Exact existing source | Preserved historical assertion | Conflict with approved contract |
|---|---|---|
| `city-hub-actions.test.tsx:211–217` | `state.back` called once for bare flag + canGoBack=true | I03 forbids this. Valid return must call the owning stack's pop, not global router.back. Fixture widening alone cannot preserve this semantic expectation |
| `walk-flow.behavior.tsx:1252` | exact pushed params `{citySlug:"lubeck", returnToPlanner:"1"}` | Valid browse needs the full version/key/token envelope. Extra fields fail exact-object equality; do not weaken to subset matching to force green |
| `city-hub-actions.test.tsx:233–237` | exact Guide params contain only city + boolean | Full-envelope forwarding or complete clearing replaces this boolean-only behavior |
| `native-v2-regressions.test.tsx:454–457` | boolean CityAssistant prop produces exact boolean-only Hub link | Current prop/route contract cannot prove/forward full identity; requires a deliberately reviewed navigation-interface migration |

**Recommended owner decision before implementation:** allow a narrowly versioned revision of only these obsolete navigation expectations, retaining their verbatim originals in an immutable historical comparison artifact and replacing their executable expectations with stronger real v1 lease/pop/full-envelope assertions. Keep all capability/preservation assertions and all Slice 01 helper assertions unchanged. This is an exception to literal assertion immutability and therefore is **not assumed authorized** by requesting a plan.

If literal preservation of every executable assertion remains mandatory, the conflicting part of Slice 02 cannot be completed with an honest green suite. Do not alias `navigation.pop` to `state.back`, inject fake valid leases for negative cases, add a production legacy boolean bypass solely for tests, drop the old tests from discovery, silently mark them expected failures, or weaken exact URL assertions. Stop at that gate and report the conflict; obtain the specific owner decision rather than pretending both contracts pass.

The recommended migration is stronger coverage of intentionally changed behavior, not permission to reduce coverage or alter unrelated tests. Neither recommendation is implemented in this planning task.

## Remaining known gaps after navigation-only work

S02, S04, S05, S07, E03, E04 and D03 remain known expected-failure cases until separately scoped evidence closes them. S01/S03/S06, D01/D04, G01–G03 and native A02 remain pending/blocked as specified. Storage prerequisites may close some before Slice 02; record that evidence under their own scope/revision. Predicting a final test count would be misleading until those prerequisite and historical-contract decisions are resolved.
