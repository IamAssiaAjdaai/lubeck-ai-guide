# Gate 1 — storage observation and guarded preview writes

**29 October 2026 · Technical decision proposed for owner approval · No implementation**

## Decision

**Treat storage observation, guarded preview commit and their affected controller integration as a prerequisite to enabling/accepting Screen 08 Slice 02 navigation. Do not defer them to a follow-up after the navigation flow is enabled.**

Continue Planning itself changes only an internal view and need not write anything. It is possible to design or test that transition in isolation. But the proposed integrated journey returns users to a Build-capable retained draft, allows browsing actions that can change the city slot, and falls back to ordinary hydration. Current storage behavior cannot safely support those paths. A navigation-only demonstration with Build blocked is not acceptance of the approved usable flow. No temporary disabled product, feature flag or narrowed prototype is implemented or automatically authorized here.

The defects predate Slice 02; navigation did not create them. The prerequisite is justified because the integrated flow reaches them and promises correct draft/current behavior. A live lease proves a mounted controller identity, **not** an unchanged persistent slot. A focus-time check alone also leaves a check-to-write race.

## Current source evidence

| Existing source | Verified behavior |
|---|---|
| `mobile/src/lib/walkStorage.ts:19–27` | `read` catches malformed JSON as undefined; I/O read failures propagate |
| `walkStorage.ts:75–79` | `loadCurrentWalk` returns undefined for invalid/wrong-city/completed data; every non-preview explicit phase currently becomes active |
| `walkStorage.ts:29–35`, `85–104` | One runtime queue serializes mutations, but `writeCurrent`/`persistCurrentWalk` do not compare against the draft's observation |
| `mobile/src/components/NativeWalkFlow.tsx:355–455` | Current/saved hydration precedes defaults, but missing/failed paths can enter planning; saved replay persists a preview unconditionally at line 408 |
| `NativeWalkFlow.tsx:456–466` | Current-slot subscription runs only in preview/active, not while an unbuilt draft is planning/browsing |
| `NativeWalkFlow.tsx:520–598` | Build waits for real presentation/planning, then persists at line 591 without observed-revision protection |
| `walkStorage.ts:142–148` | Clear compares reader outputs; corrupt and absent can both be undefined, allowing a corrupt slot to become a null tombstone |
| `walkStorage.ts:153–164`; `mobile/src/lib/walkMembership.ts:10–31` | Add to Walk uses the same queue, but can create a preview when the reader returns no current walk |

[Exact line links and hashes](SOURCE-EVIDENCE.md). The existing strict-red evidence for S02/S04/S05/S07/E03/E04 demonstrates current assertion failures. Other permutations below are concrete source-derived scenarios, not newly reproduced simulator incidents. No tests were run in this document task.

## Concrete overwrite and lost-draft scenarios

| Scenario | Concrete sequence | Current outcome / required outcome |
|---|---|---|
| **1. Malformed or future data mistaken for absence** | City slot contains malformed JSON, invalid schema or unsupported explicit phase; entry resolves it as no usable walk; defaults/fresh planning continue; user builds | Existing code can overwrite recoverable bytes or resume an unsupported phase. Required: blocked classification, preserve raw bytes, no defaults-as-absence decision or new preview commit |
| **2. Transient read failure while a current walk exists** | getItem rejects; hydration catch enters plan; a later read succeeds during Build's writer | Fresh preview can replace the existing journey the earlier read never established was absent. Required: unavailable recovery; read error is never missing data; Retry re-observes before enabling new-draft actions |
| **3. Real optional-browse Add to Walk race** | Draft observed empty slot; Explore opens Hub; a place's supported Add to Walk creates preview B through `addPlaceToCurrentWalk`; user returns to the still-mounted draft and presses Build A | A valid lease still identifies draft A, but its unguarded write replaces B. Required: observe change, retain A's fields, preserve B, offer truthful resume/browse recovery; no automatic replacement |
| **4. Change after focus validation** | Return focus re-reads empty slot; before Build commits, another queued action creates/changes the current record during real planning/layout waits | Focus check was true but is stale by write time. Required: queued compare and write at the commit boundary; never rely on a second read performed outside that queue |
| **5. Same-ID edit, phase or lineage change** | Customize/draft observed journey X; while Build waits, membership/phase/account linkage changes but ID stays X | ID-only equality misses the revision and may discard edits/linkage. Required: exact observed raw revision, phase and city protection; preserve the newer record and keep unbuilt values |
| **6. Saved replay replaces active execution** | An unfinished active/preview route occupies the city slot; explicit saved open creates a fresh replay session; hydration writes it without an observed-slot policy | Current progress disappears although the saved source remains. Required: pause replay, keep both source and current bytes, support current resume/return to saved list; no new replacement policy or consent inferred from opening a saved row |
| **7. Corrupt slot erased by recovery/rebuild** | Corrupt slot reads as undefined; clear/rebuild receives expected undefined; comparison succeeds | Current implementation can write `"null"`. Required: reject blocked/unavailable observation before any clear; preserve existing stale-confirmation and city isolation checks |
| **8. Write failure, uncertain completion or abandoned request** | A preview write rejects, or controller leaves while work is pending; a retry generates another ID without reconciling the actual slot | Must not show false preview success or blindly overwrite a possibly committed preview. Retain inputs and inspect again. If write already started, it may complete after leaving; do not promise rollback. A fault that rejects before mutation and an uncertain write-that-applied-then-rejected are distinct test cases |
| **9. Process death of an unbuilt draft** | JS process dies while draft A exists only in NativeWalkFlow | Unsaved choices are lost under the current session-only contract. The prerequisite does **not** add durable draft storage or claim to fix this. Cold navigation must honestly hydrate current data or start a genuinely new draft; never reconstruct settings from a lease |

## Required invariants

1. **Classified reads:** only actual absent key or literal JSON null is `empty`. Empty string, malformed JSON, invalid schema, wrong city or unsupported explicit phase is `blocked`. Valid completed record is `terminal`; valid unfinished supported phase is `current`; I/O rejection is `unavailable`. Validate schema/city/phase before classifying completion. Preserve valid phase-less legacy active records; accept only explicitly supported phase values, never every non-preview string.
2. **No automatic clearing or normalization writes:** observation is read-only; preserve exact original bytes and namespaces. Completed/saved records are not silently erased or resurrected. No migration, persistent revision counter or draft namespace.
3. **Opaque observation:** bind a nonserialized in-memory receipt to city, storage target and exact raw slot revision. It contains no URL/loggable raw record. The new flow must not use legacy `CurrentWalk | undefined` output as absence proof. Keep public reader compatibility for unrelated consumers; adopt the stronger read on affected paths.
4. **Atomic boundary within this runtime:** under the existing mutation queue, re-read exact raw slot, compare with the receipt, validate city/schema/intent/cancellation, then write preview. Do not enqueue recursively inside an already queued writer. Reject stale, unknown or cross-city/store receipts without writes or success notifications.
5. **Explicit write policy:** new draft can replace only its unchanged empty/terminal observation. Saved replay cannot silently replace an unfinished current route. Existing explicit Customize may commit only against the exact reviewed current observation under its existing edit semantics; it does not grant a general new-draft replacement right.
6. **No bypass in affected entry paths:** generated Build and saved-replay preview creation must use the guarded boundary. Start remains an explicit current-ID/content-validated transition. Existing affected clear and membership mutations must reject blocked/unavailable slots; Add to Walk while browsing cannot treat corrupt bytes as empty. Existing supported valid-data behavior stays intact.
7. **Retained draft on conflict:** preserve current bytes, saved source, city and all mounted inputs. A Retry must reclassify; it must not turn a newly found current route into permission to overwrite. Resume existing or leave for discovery is deliberate. No silent default reset, replay or new account preference save.
8. **Request lifetime:** one accepted Build/replay request uses a fixed input/observation snapshot and identity. Synchronous lock/ticket prevents duplicate submissions. Retired precommit work does not write; after a real write begins, suppress stale UI/Start and re-read truth on return. No automatic rollback or false atomic-cancel promise.
9. **Failure truthfulness:** notify/present preview only after a fulfilled verified commit. On read/write failure, retain inputs and release locks safely. For uncertain write completion, re-observe; an exact already-committed candidate may resume as current preview after validation, not be overwritten by another generated session. Do not assume rejected setItem necessarily proves unchanged disk bytes.
10. **Limits:** the queue provides single-JS-runtime serialization for participating writers, not cross-process/device CAS, a database transaction or atomic storage+account API transaction. Keep source saved records/linkage and other-city slots intact. No new auth/payment/backend guarantee.

## Minimal safe dependency — separately authorized work

Proposed API labels **do not exist yet**: a classified observation function and an observed-revision preview-commit function inside existing `walkStorage.ts`. Final exported names/types must be recorded when that prerequisite is explicitly authorized; do not import fictitious APIs now.

**Production boundary: two existing files.**

- `mobile/src/lib/walkStorage.ts`: one shared classification path plus opaque receipt/guarded preview commit within the existing queue; narrow blocked/unavailable guards for affected clear/start/membership/write entry paths; preserve existing namespace/serialization/listeners/linkages and public compatibility. Do not refactor saved-place/feedback/account systems or introduce another queue. Existing account-link writes already share the queue; treat their changed raw bytes as conflicts, without changing the account API.
- `mobile/src/components/NativeWalkFlow.tsx`: consume the classified outcome at current/saved hydration, keep requested missing/error saved intents in recovery, capture observations at allowed draft/Customize entry, route actual Build and saved replay through the guard, retain fields and use existing recovery/button primitives on conflict/failure. Add only the narrow request lock/ticket and post-write truth handling needed by that boundary. **No S08 cursor/footer/Hub integration in this prerequisite.**

`walkMembership.ts` callers can remain unchanged if their existing `changeCurrentWalk` entry point performs the fail-closed check internally; require tests proving that path. No new city data, provider, auth, backend or persistent storage contract. If readable localized recovery cannot reuse existing copy, name the specific additional copy file for separate review rather than silently expanding the two-file boundary.

A utility-only addition without integrating the real two preview writers is insufficient: the old unguarded calls would remain reachable. Conversely, broad draft persistence, a new planner, general replacement dialogs and all storage namespace repairs are unnecessary for this prerequisite.

## Required regression gate

Every item below calls real storage/controller/domain code with only native/I/O fault injection; no duplicate storage parser or fake state machine. These are required future tests, **not new passes**.

| Original case / target | Required evidence |
|---|---|
| S01 — real storage | Absent vs literal null produces empty receipt with zero writes; empty string/other invalid raw values are not empty; receipt binds city/store |
| S02 — storage + real hydration | Read rejection = unavailable; malformed/schema/wrong-city/unknown explicit phase = blocked. Exact raw bytes unchanged, no new-draft UI/default application/Build/replay/clear success |
| S03 — storage + hydration | Completed = terminal, not resumed; supported phase-less legacy = active; known preview preserved; unknown phase never normalized to active by stronger API |
| S04 — guarded commit + held real Build | Observe empty, create another current preview/active via actual queued path before commit; conflict preserves all bytes/links, no success event, draft fields remain |
| S05 — guarded commit + Customize | Same-ID membership, phase and saved/account linkage changes each reject stale receipt; no ID-only check; wrong-city/store receipt rejected |
| S06 — real write + UI retry | Failed write does not notify success; lock released, inputs retained, retry re-observes. Separate pre-mutation failure and write-applied-then-rejected faults; no duplicate preview/false success |
| S07 / E05 — clear/rebuild | Corrupt or unavailable slot cannot clear under expected undefined; existing exact stale-confirmation rejection and other-city preservation remain passing |
| E01 / E02 — resume vs replay | Current preview/active identity and phase unchanged, no 05–08. Saved replay new ID/full ordered stops/reset progress/cleared old deadline/source unchanged; preview only, no implicit Start |
| E03 / E04 — real saved hydration | Missing/account read failure recovers without new draft; current collision pauses replay. Test both current present initially and appearing between saved lookup and commit |
| C01–C03 / D02/D05 | Same real planner inputs, manual/GPS/denial, finish/loop/category/walking/deadline effects. No transport or geometry change |
| G01 / G02 | Two rapid submissions accepted at most once; obsolete/unmounted precommit request does not write; post-write success cannot auto-start or update stale navigation |
| G03 / G04 | Empty/error/conflict leaves retained settings with feedback; Continue/Explore/Back/Edit do not generate or persist; actual Build alone generates custom preview, explicit Start alone begins execution |
| Additional scenario within S02/S04/S05 | Browse Add to Walk uses real `addPlaceToCurrentWalk`/`changeCurrentWalk`: valid empty creates preview B, original A conflicts; corrupt slot is never replaced by membership path |
| Focus acceptance within R01/I01/S04 | Close Build readiness synchronously on return, re-read/classify, restore readiness only for unchanged valid scope; still compare again atomically at commit |

Existing expected failures S02/S04/S05/S07/E03/E04 should become ordinary passes only after their full affected behavior works. S01/S03/S06 and G01–G03 are currently pending or partial baseline checks and need complete coverage. D03 midnight and D04 zone intent are **not** solved by storage guards; retain their explicit open status. Existing tests must remain discoverable and assertions must not be weakened.

## Recommendation for approval

Approve this **separately identified storage prerequisite first**, including meaningful real regressions and the two-file affected integration. Stop for its verification report. Only then separately authorize/enable the seven-file Slice 02 navigation integration. Navigation planning and test design can proceed before it; a usable enabled Build-capable flow cannot be accepted without it.

This is a technical recommendation for owner approval, not permission to implement. All application/test code and decisions remain unchanged in this gate review.
