# Screen 08 technical review — findings and dependencies

28 October 2026. Existing state/value retention is real while NativeWalkFlow remains mounted. The approved handoff, explicit edit returns, stronger native identity and safe failure/commit semantics are not implemented. The technical contract now specifies them without changing code or test files.

## Confirmed conclusions

1. 05–08 share NativeWalkFlow state; values are not saved to an unbuilt draft record. Account defaults initialize only; guest defaults are not a durable preference store.
2. Current 08 exits to Hub and returns to the repeated legacy interests grid. A named new-draft cursor must replace that implicit combination of flags/step, while preserving separate legacy/add/Customize modes.
3. Current boolean return + canGoBack is insufficient. Even route params alone can be stale after process restoration. The contract specifies a small nonserialized navigation lease containing identity metadata only; all settings remain in the controller.
4. Current storage reader can collapse malformed/missing/finished states. Serialized preview writes can overwrite a newer city slot. Classify observation and guard preview commits against exact observed revision using the existing queue.
5. Current current-walk resume differs from saved replay: saved replay uses a new session and clears old deadline/progress; missing saved IDs and current-slot collisions need explicit recovery, not fresh-draft fallback or silent replacement.
6. Current Customize preserves journey/settings but not original start-mode provenance. Do not force it through new-draft onboarding or claim saved coordinates are a fresh location fix.
7. Raw HH:MM is insufficient across midnight/time-zone changes. Keep transient selection-day/zone intent and require explicit reconfirmation; persisted deadline stays the existing absolute timestamp.
8. Preserve all old walking/tags/start/end/budget/deadline effects on the shared planner. It remains estimated walking from coordinates, not verified street navigation or guaranteed return timing.

## Order of future work (not authorized)

Observation/commit and live-return contracts → meaningful red regressions → compatible identity/storage groundwork → new-draft cursor/Back/edit/control composition → S08 actions/copy → mobile checks and actual native acceptance. The new helper/fields named in the contract are proposals, not existing source. No migration, auth provider, city registry, routing provider, tab rewrite or second settings store.

D01–D14 and Screen 14 remain pending; UX approval remains approved; implementation permission remains closed.
