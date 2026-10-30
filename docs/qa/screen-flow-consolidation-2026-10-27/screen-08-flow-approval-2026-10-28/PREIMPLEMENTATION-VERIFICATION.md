# Screen 08 — preimplementation specification and test gates

**28 October 2026 · UX approved; implementation/test-code edits not authorized.**

The seven owner prerequisites are specified in the next proposal. Existing baseline: **117 tests passed in 8 files** ([log](logs/current-baseline-tests.log)). This does not prove new behavior. The matrix below intentionally keeps all approved-flow integration and native acceptance gates open. No new tests or production code were written; there is no fake passing model of the desired transitions.

| ID | Area | Required observable assertion | Future existing test surface / evidence | Actual status now |
|---|---|---|---|---|
| I01 | Draft identity | Correct city + mounted planner instance + continuation target resumes same fingerprint; unrelated/stale back stack never receives Back | city-hub-actions.test.tsx; walk-flow.test.tsx | Existing hub return tests pass only intent/canGoBack baseline; stronger identity cases NOT RUN |
| I02 | Retained state | Browse/Back/edit retains every field in defined fingerprint; rapid taps and locale/account changes do not create/reinitialize drafts | walk-flow.test.tsx | New-flow cases NOT RUN |
| I03 | Cold/missing stack | Ordinary hydration restores real current walk or creates new draft honestly; never claims unbuilt process-death restore | walk-flow.test.tsx; walk-storage.test.ts | Storage baseline passed; proposed no-stack semantics NOT RUN |
| B01 | Back chain | Constraints→08→07→06→05; edit Back/Continue→constraints; hardware and on-screen agree | walk-flow.test.tsx | Legacy Back baseline passed; new targets NOT RUN |
| B02 | Explicit edit / skip | Interests rendered once unless explicit edit; skipped [] stays []; edited values reach actual builder | select-interests.test.tsx; walk-flow.test.tsx | Existing input baseline passed; repeated-question removal NOT RUN |
| B03 | Permission races | Skip/Back while locating invalidates late fix; no request on 08, browse or Back | location-permission.test.tsx; walk-flow.test.tsx | Existing mocked denial/handler baseline passed; new-flow races NOT RUN |
| C01 | Legacy controls | Walking/categories/manual or GPS start/finish anywhere-loop-destination all remain visible/usable and affect actual builder | walk-flow.test.tsx | Legacy planner baseline passed; proposed re-composition NOT RUN |
| C02 | Time / return-by | 60/120/180/240 and hydrated 90; saved HH:MM; expired/deadline return-walk feasibility; no account-default coercion | available-time.test.tsx; return-by-picker.test.tsx; walk-flow.test.tsx | Existing input/picker/builder baseline passed; full new path NOT RUN |
| C03 | Build / Start separation | S08 callbacks/Back/browse never build/persist/start; explicit Build previews and explicit Start alone activates | first-experience.test.tsx; walk-flow.test.tsx | Current no-generation/explicit actions baseline passed; new callback NOT RUN |
| R01 | Storage recovery | Read failure/corrupt/incompatible distinguishes absence; preserves bytes; Retry/Explore available; no silent overwrite | walk-storage.test.ts; walk-flow.test.tsx | Current storage tests passed; new typed recovery contract NOT RUN |
| R02 | Current vs saved replay | Current preview/active bypass05–08; completed records not resumed; saved replay new preview clears deadline; stale CAS refuses replacement | walk-storage.test.ts; walk-flow.test.tsx | Existing contracts baseline passed; approved-flow integration NOT RUN |
| G01 | Guest | Unauthenticated launch/selection/05–08/constraints/Build works; no OAuth/payment/location requirement; account-only save separate | walk-flow.test.tsx; city-hub-actions.test.tsx | Existing mocked guest paths baseline passed; new transitions NOT RUN |
| A01 | EN/DE actions | Exact primary/secondary labels, dynamic city wrapping, distinct accessible names, correct callback and screen-reader focus | first-experience.test.tsx; copy/component review | Current EN/DE baseline passed; new two-action footer NOT RUN |
| A02 | Accessibility | Large text, focus order, contrast, minimum targets, keyboard/time picker, reduced motion, VoiceOver/TalkBack traversal | Rendered checks + native/physical assistive technology | PENDING — proposed UI not implemented |
| L01 | Small iPhone | 375×667 pt and standard iPhone EN/DE; bottom/scroll/large text/insets; both actions reachable without overlap | Real simulator/device captures at exact source | PENDING — no new capture |
| L02 | Android | Narrow EN/DE with scaling/insets; hardware Back/denied location/process recreation; TalkBack separately | Real Android emulator/device evidence | PENDING — no new capture |

## Gate order

1. Technical contract accepted and source/branch rechecked without merging unrelated work.
2. Explicit authorization for test-code phase; new approved-flow tests fail against current old behavior for intended reasons, before product edits.
3. Separate authorized implementation makes those regressions green while preserving old meaningful capabilities and failure behavior.
4. Complete relevant tests/lint/types/platform builds and actual native acceptance; any repository DB checks use only an explicitly isolated disposable QA target if applicable. No production migration/provider action is implied.
5. Owner reviews resulting footer/layout/device evidence. Commit/push/PR/merge/deployment remain separate gates.

No need to repeat full suites for this documentation record: only the relevant existing baseline was run. No new native runtime assertions, full app build, provider/email/purchase or database verification is claimed.
