# Slice 02 — final proposed scope and owner recommendation

**29 October 2026 · Approval-ready proposal · NO IMPLEMENTATION AUTHORIZED**

## Recommended owner decision

1. **Approve Gate 1's storage safety prerequisite**, separately scoped and verified **before enabling/accepting Slice 02 navigation**. It must include real affected controller hydration/Build/replay consumption, not an unused utility. Stop for its test/diff report before navigation integration.
2. **Approve Gate 2's five-site test-contract migration** for a future implementation: replace obsolete boolean-only Back/URL/source-spelling expectations with exact v1 lease/owning-stack/full-envelope behavior; preserve all capability assertions, test cases, negative paths and verbatim original evidence. This is intentional contract evolution, not deletion or weakening to obtain green.
3. **After prerequisite evidence is reviewed, separately authorize Slice 02 navigation integration** within the seven-file boundary below. Keep storage proof and navigation/native acceptance separately recorded. Requesting or approving these documents alone is not an instruction to implement.

The gates are technically resolved as recommendations: **storage is a prerequisite; obsolete tests receive stronger, named replacements.** Owner approval/implementation status remains pending. No gate is marked satisfied by current code or past green totals.

## A. Storage prerequisite boundary — proposed, not implemented

Production: `mobile/src/lib/walkStorage.ts` and `mobile/src/components/NativeWalkFlow.tsx` only. Shared classifier/opaque observation/queued revision guard, affected mutation fail-closed checks, real current/saved hydration and actual preview-writer integration, retained-input recovery and narrowly necessary request lock/ticket. Use existing localized recovery primitives; any additional copy dependency must be named for owner review. No Screen 08 footer/cursor/Hub changes in this stage.

Tests: existing `walk-storage.test.ts`, `screen-08-persistence-regressions.test.ts`, `walk-flow.behavior.tsx` and pending-contract ledger, plus existing membership/account-save regression suites unchanged except additive relevant cases. Real state/storage code; I/O faults only. Required case evidence is specified in [Gate 1](GATE-1-STORAGE-DECISION.md).

Acceptance: S01–S07/E01–E05 and narrow G01–G03 boundary scenarios tested as applicable, exact non-overwrite and retained-input assertions pass, unrelated existing behavior remains green; no data migration, namespace change, persistent draft or default-storage reset. Complete existing gates and report unresolved cases honestly. Do not claim global cross-process CAS or automatic rollback of a started write.

This dependency is not silently added to the original seven-file navigation change. The distinct scope/approval is explicit because the prior proposal froze `walkStorage` during navigation work.

## B. Navigation Slice 02 boundary — proposed after A

| Exact production file | Authorized-for-review responsibility |
|---|---|
| `mobile/src/app/city/[citySlug]/walk.tsx` | Validated city/saved/source/add scope in controller identity; actual native route key; locale/marker changes retain instance; malformed route recovery |
| `mobile/src/components/NativeWalkFlow.tsx` | One new-draft cursor; direct constraints; explicit Back/Edit return; retained original settings; real helper publication/revocation/browse ticket and focus safety; unchanged separate legacy/current/saved modes |
| `mobile/src/components/FirstExperience.tsx` | Approved Continue planning primary and optional Explore city secondary; actual independent callbacks; only footer semantic change, protected hero/type/crop/attribution |
| `mobile/src/lib/firstExperienceCopy.ts` | Typed planning label across all existing locales; EN/DE specified; existing copy preserved |
| `mobile/src/app/city/[citySlug]/index.tsx` | Validate complete intent/live lease/final focused owning stack; one exact pop, ordinary truthful fallback; complete assistant envelope; approved 09 visuals unchanged |
| `mobile/src/app/city/[citySlug]/assistant.tsx` | Same-city complete parsed-envelope forwarding or complete clearing through existing discovery dismiss fallback; final Hub validation mandatory |
| `mobile/src/lib/plannerNavigationCopy.ts` (new, proposed) | Small exhaustive UI-only edit/summary/return-error copy; no data/state ownership |

**Slice 01 `plannerReturnIntent.ts` and `planner-return-intent.test.ts` remain frozen.** No alternate registry/navigation runtime, provider or settings store. Native port integration must use the existing Expo Router context. If actual implementation requires another production file, identify and review that exact expansion before editing.

## C. Required state transitions

- New draft: interests → duration/return-by → optional location → 08 confirmation → **Continue planning directly to remaining constraints**, no mandatory Hub or second interest grid.
- Constraints contain existing walking/category filters, manual/GPS start, anywhere/loop/destination, retained budget/deadline and interest summary/Edit; no control removed or taxonomy invented.
- Normal Back: constraints → 08 → location → duration → interests. Explicit Edit Interests returns to constraints on Continue/Skip/Back with all other fields retained. Preserve modal priority and iOS gesture guard/Android Back equivalence.
- Optional Explore: reserve one ticket, commit constraints, publish ready real lease, then push one Hub. Native Back or validated Hub Build returns to that instance; invalid/bare/stale identity uses ordinary hydration without restoration claims.
- Lease resolution stays pure; one press dispatches one owning-stack pop after immediate final revalidation. Revoke matching readiness on use/mode/scope/content/storage invalidation/unmount; never revoke just because the supported draft is blurred behind its browse Hub. Reconciliation requires a complete live native-key inventory. Settings are never serialized into the lease/URL.
- Current preview/active restores exact identity/phase without intro or a fresh route. Saved-open remains explicit replay to a **new preview session**, with source preserved and collision protection, not current-walk resume. Only explicit Build **generates** a preview from unbuilt settings; existing explicit saved-open may replay preview under its separate contract. Only explicit Start begins execution. S08/Back/Edit/browse neither generate nor replay/write/start.

[Previously approved flow and detailed sequence](../screen-08-slice-02-plan-2026-10-29/FLOW.md). This final scope adds the Gate 1 prerequisite and complete Gate 2 inventory; it does not pretend any proposed transition is implemented.

## D. Regression conversion / coverage

Navigation expected-failure targets: T01, T02, T05, I02, I03, I08, A01 (seven cases/eight variants). Convert only after the real integrated behavior satisfies every retained/replacement assertion. Activate complete pending identity/retention/Back/control cases where feasible; label partial evidence accurately.

Storage expected failures S02/S04/S05/S07/E03/E04 can close only under their separately authorized prerequisite evidence, not because navigation is green. Existing current/saved/control/parser/permission passes and all 11 helper tests stay. Do not promise a final pass count in advance. Preserve all existing assertions now; future narrowly approved revisions are **only** B01–B05 and their justified fixtures/actions, with stronger mapped runtime coverage. B05 is the additional source-text check found in this review.

D03 midnight, D04 zone-intent and the day/zone portion of D01 remain explicit separate dependencies. Navigation/storage guards do not fix them. Do not claim time-integrity completion or general release readiness; any later release/whole-flow acceptance must account for them. Broad build adaptation, Start-time replanning and durable drafts remain outside this scope.

## E. Required verification and non-goals

Future implementation gate: red/green targeted real regressions, full mobile tests, lint, TypeScript, i18n and local iOS/Android builds/exports with raw evidence and normal/expected-failure/TODO counts separated. Then exact-source native guest and supported authenticated session checks, standard 402×874 and small 375×667 iPhone EN/DE, large text, narrow Android, Back/gesture/keyboard/scroll/safe-area/focus and VoiceOver/TalkBack. Bundle export is not device acceptance. Follow [NATIVE-ACCEPTANCE.md](../screen-08-slice-02-plan-2026-10-29/NATIVE-ACCEPTANCE.md), including stale-slot return, saved/current distinction and no premature write/start. Screen 08 two-action footer still needs actual visual acceptance; no unrelated visual redesign.

No changes to approved 01–13 designs beyond explicitly reviewed S08 footer semantics/required planner composition; 09 handlers may change but its approved visuals stay. Screen 14 remains untouched and PENDING; D01–D14 PENDING. No auth/payment/backend/API/city data/tab architecture/route engine/transport/offline feature, new persistent draft, unrelated cleanup or legacy deletion. City Pass remains €4.99/72h, one-time/no renewal.

## Owner approval wording — proposal, not an action

Recommended next approval is: **“Approve Gate 1's narrowly scoped storage prerequisite and its regression work; preserve Slice 01 and stop after verification. Approve the documented B01–B05 stronger test-contract migration when the corresponding navigation implementation is separately authorized. Do not start navigation Slice 02 until prerequisite evidence is reviewed and I explicitly authorize it.”**

This wording separates the next safe implementation from approval of a future test migration. It does not bundle release, merge or deployment permission. The owner can approve the technical decisions without authorizing any code yet.

## Current task outcome

Only these gate documents and preservation evidence were added. No tests or production code changed, no test/build/device result newly claimed, no commit/push/merge/deletion/deployment. [Validation](VALIDATION.md) records the exact unchanged hashes and prior-decision protection.
