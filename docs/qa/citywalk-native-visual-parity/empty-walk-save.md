# Prevent saving empty native walks — 2026-09-27

> **Status update — 2026-09-27:** The owner has now accepted the specific empty-walk Start/Save/Rebuild correction round on the tested iPhone; see the latest [QA ledger](README.md#empty-walk-correction-round-accepted-on-tested-iphone--2026-09-27). Pending language/visual checks outside that round remain unverified. Historical source digests, gate counts and earlier pending statements below describe their dated runs, not this checkpoint. See [reviewed checkpoint](reviewed-checkpoint.md) for current integration evidence.


Scope: Mobile Core (iOS/Android implementation), local `fix/citywalk-native-device-acceptance` working tree with existing work preserved. Web/Admin/configuration/content publication unchanged. No Android acceptance claimed.

## Demonstrated cause and saved record

Before changing the save implementation, a test using the actual local persistence/membership functions and an in-memory store created a one-stop Preview, removed its last stop, then called `saveNativeWalk`. The test verified that `loadSavedWalks` returned a record with `remaining: []` and `visited: []`. This reproduced the saved data, not merely a success message (1 reproduction test / 1 file passed before the fix).

Preview, Active Walk and Finish all call the same `save()` handler in `NativeWalkFlow`. Previously, none disabled Save based on stops, and the handler showed `savedDone` whenever persistence resolved. `saveNativeWalk` checked `isWalkJourney`, whose structural array validation allows empty lists, then queued a write of the captured journey. It did not re-read the current session, so a stale nonempty callback could also save after removal. There is no successful-save analytics event in this path.

## Targeted change

- `mobile/src/lib/walkStorage.ts`: extracts the existing stop-validation rule into a lower-level helper without changing Start behavior. `walkSaveStatus` validates the deduplicated **visited + remaining itinerary**, independently of active/preview/finished phase. One eligible stop is enough. Unknown references, unavailable/loading content and empty/ineligible itineraries reject safely. Save now requires the already-loaded place catalog; no network request added. Inside the existing serialized mutation queue it checks supplied data, re-reads the persisted same-city/same-ID session (including finished records), checks its current itinerary, then writes only a valid saved copy. Rejected calls do not write, replace saved copies, change current planning or affect favorites/other cities. A cleared/replaced session cannot be resurrected by a stale callback.
- `mobile/src/components/NativeWalkFlow.tsx`: all three Save buttons use the same Save eligibility; concise localized feedback appears beside Save. Loading/unresolved data gets distinct feedback. Last-stop removal immediately disables Save, while visited-only completed walks remain saveable. A local lock prevents repeated in-flight requests. Failed validation cannot show success; an earlier saved-success message clears when the current session changes. Start/Rebuild/Finish/Take me back implementations remain unchanged.
- `packages/i18n/src/adapters.ts`, `packages/i18n/src/locales/{en,de,da,sv,nl,es,ar}.json`: two additive shared keys (`walk.saveEmpty`, `walk.saveContentUnavailable`); no raw keys or component-local dictionary. DE: “Füge mindestens einen Ort hinzu, bevor du die Tour speicherst.”
- Regression files: `mobile/tests/walk-save.test.ts`, `walk-flow.test.tsx`, `walk-storage.test.ts`, `walk-session.test.ts`, `native-city-experience.test.ts`, `native-v2-regressions.test.tsx`. Existing storage tests now provide the actual current session and loaded catalog required by the canonical save operation. Rendered Save tests use the real persistence implementation with native/storage bridges mocked and inspect saved records.

Historical empty saved records remain readable and are not migrated/deleted. Opening one retains blocked Start/Save plus the existing Rebuild recovery. The existing Saved list's explicit Remove action remains available; only an owner action deletes that record. A return-only active journey with visited stops is saveable; a route with no visited or planned stops is not saveable, but its existing return navigation/Finish remains available.

## Validation

- Before-fix record-level reproduction: **1 test / 1 file**, confirming an empty record was actually written. Replaced with the rejecting regression after the fix.
- Focused final runs: **85 tests / 5 files PASS**, 28.36 seconds, plus **55 tests / 1 file PASS**, 9.43 seconds (**140 tests total**). The new Saved Remove test initially exposed a missing `ActivityIndicator` bridge mock; the test mock was completed without changing product UI.
- Complete mobile suite: **468 tests / 55 files PASS**, zero failures/unhandled errors, 103.43 seconds (`npm --prefix mobile run test:run -- --maxWorkers=1`). Includes prior accepted Start/Rebuild, membership, audio and navigation coverage.
- Complete shared packages: **62 tests / 4 files PASS**, 11.86 seconds (`npm run test:run -- packages/i18n/src packages/traveler-core/src --maxWorkers=1`). Existing Vite configuration warnings remain; no test failures.
- Mobile TypeScript **PASS** (`npm --prefix mobile run typecheck`), including imported shared code and tests.
- Mobile lint **PASS / zero warnings**; changed shared adapter lint **PASS / zero warnings**.
- i18n catalog check: **440 keys in each of 7 locales, zero errors**.
- Scoped tracked diff check and new/untracked changed-file whitespace check **PASS**. The previously recorded unrelated `.env.example:32` whitespace remains untouched.

All automated results are against local source with native bridges mocked. Save was unverified when these automated checks ran; the owner subsequently accepted all six Save scenarios, as recorded in the README. Extra locale/text-size checks are not implied. No Android acceptance, release build or deployment claimed.

## Original physical checklist — correction round subsequently accepted

1. Build a Preview with one stop. Save: expect success. Open Saved, reopen it and verify that stop remains.
2. In a Preview remove the final stop. Expect disabled Save and localized “Add at least one place before saving this walk.” / German copy above. Start stays blocked and Rebuild remains available. A previously saved valid copy must still contain its stop; unrelated saved walks/favorites remain.
3. Add one eligible stop again: Save re-enables and persists it. Repeat EN → DE → EN; feedback and button labels must stay translated.
4. Visit the last stop and Finish so no stops remain unvisited. Save the completed walk, reopen its saved copy and verify the visited place is in the itinerary. Recheck Take me back and Finish without changing accepted navigation/audio.
5. If a historical zero-stop saved record exists, open it: blocked Start/Save with Rebuild. Return to Saved and explicitly Remove it. Confirm that no other saved record disappears.
6. Quickly remove the last stop and tap Save if the UI has not updated yet: no success and no new empty saved record. Rebuild Cancel/Confirm and favorites persistence must retain the accepted behavior.

No commit, push, build, deployment or publication.
