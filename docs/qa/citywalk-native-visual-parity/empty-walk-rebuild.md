# Empty walk start and confirmed planning reset — 2026-09-27

> **Status update — 2026-09-27:** The owner has now accepted the specific empty-walk Start/Save/Rebuild correction round on the tested iPhone; see the latest [QA ledger](README.md#empty-walk-correction-round-accepted-on-tested-iphone--2026-09-27). Pending language/visual checks outside that round remain unverified. Historical source digests, gate counts and earlier pending statements below describe their dated runs, not this checkpoint. See [reviewed checkpoint](reviewed-checkpoint.md) for current integration evidence.


Scope: Mobile Core, iOS/Android implementation; Public Web and Admin Web not applicable. Local branch `fix/citywalk-native-device-acceptance`, HEAD `efe8cf62f408181f0f4ca922f32e53e712a982a2` plus existing uncommitted/untracked work. No remote configuration/content/storage work. No device or Android acceptance inferred from automated rendering.

## Demonstrated path

`removePlaceFromCurrentWalk` legitimately removes the final planned membership while retaining a preview. The persisted `remaining` list becomes empty and the preview's subscription displays zero places. Previously, Start remained enabled and called `update({...journey, startedAt: Date.now()}, "active")`. That mutation checked identity/concurrent stop edits but never checked eligible stops. Empty arrays also passed the restoration `every(...)` checks. Thus an empty persisted preview could become active and start the active timer.

The initial route fetch already has a separate loading boundary. Unresolved content is another path: display resolution omits unknown IDs. It must not turn a partially resolved stored itinerary into a valid start. The new guard rejects unresolved references, unavailable/loading content and ineligible/empty previews, using existing `isEligibleTourPlace`. A single valid stop is sufficient. No shared planner algorithm was changed.

All current native Start entry links (city/suggested/saved/add paths) converge on this walk flow; the only new-start action now calls `startCurrentWalk`. Existing active update, completion and return-only paths are not routed through the preview guard.

## Minimal implementation

- `mobile/src/lib/walkStorage.ts`: shared UI/canonical eligibility classification; serialized `startCurrentWalk` rereads the persisted city/session under the membership mutation queue, validates before writing and sets the start timestamp only on success. Repeated calls for the same already-active session are read-only/idempotent. Empty/unresolved rejected starts perform no write or notification. `clearCurrentWalk` compares the confirmed session snapshot and clears only that city's current slot (JSON null); concurrent changes and write failures reject without clearing other data. It never marks abandonment finished.
- `mobile/src/components/NativeWalkFlow.tsx`: disabled Start and localized recovery for invalid previews; distinct content-loading state. Preview restoration retains invalid drafts for explicit recovery instead of silently dropping their stop IDs. Secondary Rebuild appears in Preview and Active, and as recovery after an empty calculation. The existing page-sheet confirmation pattern is reused with explicit Cancel. Failed resets display feedback inside the sheet. Confirmation resets step, duration (120), history/architecture interests, balanced walking, empty categories/deadline, place start/loop finish, location selection, old route/progress/adaptations, map state and session feedback UI. City/locale remain. Build creates a new journey ID and returns to Preview; no auto-start. Customize remains the existing edit-current-settings action.
- `mobile/src/app/city/[citySlug]/walk.tsx`: passes current fetch state so cached content during loading/error cannot start a new walk. Existing active locale-switch preservation stays in place.
- `mobile/src/components/V2Presentation.tsx`: optional recovery label allows the empty calculation action to say Rebuild; ordinary error Retry stays unchanged.
- `packages/i18n/src/adapters.ts` and `locales/{en,de,da,sv,nl,es,ar}.json`: additive shared Rebuild, confirmation and unresolved-content copy. DE CTA: “Tour neu planen”. Existing messages remain unchanged. New actions use the accepted wrapping/full-width native controls.
- `mobile/tests/walk-session.test.ts` and `mobile/tests/walk-flow.test.tsx`: canonical storage/race/reset and rendered flow regressions. Native bridges are mocked; physical rendering is not claimed.

Saved walks (including the original of a saved walk being rebuilt), favorites, other cities' current sessions, account/language and review history remain untouched. No global AsyncStorage clear. No new start event was added; the existing walk start path has no successful-start analytics emission. Review requests remain restricted to the existing finished flow.

## Validation

- Focused: **64 tests / 3 files PASS** (`walk-session`, `walk-flow`, `walk-membership`), 39.10 seconds.
- Full mobile: **447 tests / 54 files PASS**, no failures/unhandled errors, 124.16 seconds (`npm --prefix mobile run test:run -- --maxWorkers=1`). Includes the focused regressions and existing audio/navigation/membership/review coverage.
- Full shared packages: **62 tests / 4 files PASS**, 13.36 seconds (`npm run test:run -- packages/i18n/src packages/traveler-core/src --maxWorkers=1`). Existing Vite native-config/tsconfig-paths warnings remain; no test errors.
- Mobile TypeScript **PASS** (`npm --prefix mobile run typecheck`), including imported shared code and new tests.
- Mobile lint **PASS / zero warnings**; changed shared adapter ESLint **PASS / zero warnings**.
- Shared catalog check **PASS: 438 keys × 7 locales, zero errors**.
- Scoped tracked diff check and new/untracked changed-file whitespace check **PASS**. Repository-wide `git diff --check` still reports the previously recorded unrelated trailing whitespace at `.env.example:32`; that file was not edited.

Tests run against local current source with native bridges mocked. No native build/device playback/visual acceptance is claimed. The owner passes in the README refer only to the separately confirmed prior implementation.

## Original physical checklist — correction round subsequently accepted

1. In English, build a preview, remove every stop via the existing membership actions, then return to Preview. Expect clear empty-plan feedback, disabled Start and Rebuild. Relaunch the same project without deleting app storage; the empty preview must still be unable to start.
2. Add one eligible place. Start once (then tap rapidly if possible): one active session, no duplicate stops or reset timer. Confirm accepted Add/Remove still synchronizes with Explore and Detail.
3. In Preview, tap Rebuild → Cancel: identical route/settings remain. Rebuild → Confirm: step 1, same city/language, 2-hour default and no return-by value. Build again: new Preview, not active automatically.
4. During an active walk, visit a stop, then Rebuild → Cancel: stop/progress remain. Confirm a second attempt: old progress/adaptations are gone, defaults restored. Start the rebuilt route: no old visited stops or elapsed time. Saved walks and favorites remain available; no Finish/review prompt for the abandoned walk.
5. Open a saved walk, rebuild it, and verify the saved original is unchanged. Check a finished-stop active walk and Take me back still allow their existing navigation/Finish behavior.
6. Repeat the Rebuild label/confirmation at 110% in Deutsch (“Tour neu planen”), then restore your previous text size while the app remains mounted. Those two earlier visual checks are still unverified. Check Arabic direction and long-label wrapping without changing accepted audio/navigation behavior.

No commit, push, build, deployment or publication.
