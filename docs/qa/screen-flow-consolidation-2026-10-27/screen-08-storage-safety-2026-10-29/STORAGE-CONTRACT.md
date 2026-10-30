# Implemented native current-walk storage contract

29 October 2026. Local storage prerequisite only; no Screen 08 navigation integration.

## Observation

`observeCurrentWalk(city, store?)` serializes its read on the existing runtime queue and returns:

| kind | Meaning | Draft/write permission |
|---|---|---|
| empty | Absent key or JSON null tombstone | Receipt permits new/replay preview only while exact raw slot remains unchanged |
| current | Valid same-city unfinished journey; preview/active or supported phase-less legacy | Resume existing phase; new/replay cannot silently replace it |
| terminal | Valid same-city completed journey, including timestamp zero | Not active; retain bytes until an explicit permitted new preview replaces this unchanged observation |
| blocked | Invalid JSON/schema, wrong city or unsupported phase | No receipt; no draft absence decision, preview replacement, membership fallback or clear |
| unavailable | Storage/import/read failed | No receipt; recover/retry without treating failure as empty |

Observation performs no writes. Receipt objects are frozen, have no enumerable payload and are not serializable capabilities. Their city/storage handle/raw revision is held only in a WeakMap; settings/GPS/raw bytes never enter navigation params or logs. The legacy public `loadCurrentWalk` contract is preserved; **do not use its undefined result as safe absence proof for new code**.

## Guarded preview commit

`commitCurrentWalkPreview(input, receipt, intent, {store?, isCurrent?})` validates and snapshots caller-owned input before queueing. It verifies the receipt's private city/store identity, exact current raw bytes, recognized phase/schema and live request predicate. The writer rechecks exact raw bytes again before writing under the same existing queue. No second queue or namespace is introduced.

- `intent="new"` or `"replay"`: current unfinished slots reject even if unchanged; only unchanged empty/terminal can be replaced.
- `intent={customize: reviewedId}`: exact observed current journey must match that explicit edit ID; preserve saved/account linkage into the resulting preview. Controller also compares the captured Customize source before Build.
- Successful writes remain preview; no Start call. A successful commit consumes the receipt. A failed/uncertain write that reached its write boundary also consumes it; Retry must observe truth anew. Validation failures perform no write.
- `isCurrent` is checked before async work and immediately before the actual write. Retired precommit work rejects; a write already in progress may complete after unmount. There is no claimed rollback. The controller suppresses stale UI/navigation and never auto-starts.
- Input/intent snapshotting prevents caller changes while queued from changing the accepted candidate. Saved replay preserves its source record and existing transformation (new execution ID, full ordered itinerary, cleared old deadline/progress).

`persistCurrentWalk` / `persistActiveWalk` remain compatibility APIs for valid-data callers; they are not the new observed-revision API. The two real preview-generation/replay call sites in NativeWalkFlow now use the guard. New code must not bypass it for fresh drafts. All affected writers reject blocked/unavailable slots; a generic valid-data compatibility write is not advertised as globally guarded.

## Recovery and current/saved separation

- Current/saved hydration uses the classified observation before applying defaults. Missing or inaccessible requested saved routes recover; no silent guest/new draft fallback.
- Saved replay colliding with unfinished current does not persist, clear or allocate a replay preview. Recovery offers existing localized Retry/Back and an explicit Resume trip destination. Resume navigates to the ordinary city current-walk route, clearing saved intent through the existing wrapper semantics.
- An unbuilt draft's values stay in NativeWalkFlow during failure/conflict. Retry re-reads; a new current slot does not confer overwrite permission. If unchanged inputs/route are retried after a pre-write failure, the preview attempt ID is reused. Genuine changed inputs can form a new explicit attempt.
- A write-applied-then-rejected result is not shown as success immediately. Explicit Retry can recognize and display the exact committed preview without another write or Start. Other current records require deliberate resume/discovery rather than replacement.
- Existing Retry entry step is preserved; selections are retained while revisiting its existing controls. This is not new Continue Planning/Back/Edit behavior.
- Confirmed rebuild now validates/clears storage before ending the live companion, so failed clear validation cannot end the current companion. It still uses existing explicit confirmation, city isolation and stale-snapshot comparison. Native companion and local storage are not an atomic transaction.

## Limits

Single JavaScript runtime / participating-writer serialization only; no cross-process/device CAS or event-log revision. Raw equality is a comparison of present bytes, not a monotonic history counter. No new persistent draft, migration, namespace, backend or auth contract. Process death does not restore unbuilt inputs. Midnight/time-zone intent, normalized navigation identity, lease integration and full new-flow/device acceptance remain pending.
