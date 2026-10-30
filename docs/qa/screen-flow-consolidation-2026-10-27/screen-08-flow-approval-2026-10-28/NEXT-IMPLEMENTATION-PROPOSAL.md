# Screen 08 — next dependency-aware implementation proposal

**28 October 2026. UX/FLOW approved. All steps below are proposals; implementation and test-code edits are NOT AUTHORIZED.**

## Smallest proposed scope

Implement only the approved S08 handoff in the existing `/city/[citySlug]/walk` flow: one interests entry, direct planning primary, optional browsing secondary, retained values and explicit Build/Start boundaries. Preserve approved S01–S07 and S09–S13 styling, existing auth/city data/location/planner/commerce and both current-versus-saved behavior. No new screen route, second planner/store, durable-draft migration, tab redesign or Screen 14 work.

## Dependencies in delivery order

| Step | Deliverable after explicit authorization | Depends on | Exit evidence / stop point |
|---|---|---|---|
| 0 — completed now | Approval record, frozen reviewed specification and unchanged current-test baseline | Owner UX decision | 117 existing tests pass; not proof of approved flow |
| 1 — proposed next | Accept exact draft identity, Back/edit, control inventory, failure and guest contracts in this document | Owner technical review; check installed Expo/native navigation docs before any navigation API edit | Concrete typed transition/identity expectations and seven-area test matrix accepted; still no product implementation |
| 2 — test phase, permission required | Write meaningful rendered/controller/storage regressions for accepted contracts; preserve old capability cases | Step 1 and explicit test-code authorization | New-flow assertions intentionally fail against current code for the correct reasons; existing unrelated regressions still pass. No toy mirror-state model accepted as proof |
| 3 — identity/recovery groundwork, separate permission | Minimal compatible validation inside existing controller/navigation/storage helpers | Step 2; resolve any storage-result contract before implementation | Matching draft resume only; no stale Back or overwrite on unreadable state; backward compatibility tests pass |
| 4 — controller transition slice | Direct 08 → constraints, explicit edit return, Back semantics; retain all legacy planner controls | Steps 1–3, explicit product implementation permission | No automatic second interests grid/Hub push; manual/GPS/finish/tags/walking/deadline behavior preserved; Build/Start negative assertions pass |
| 5 — S08 action presentation/copy | Existing FirstExperience footer gains direct planning primary and optional city-browsing secondary | Controller semantics verified, implementation permission | EN/DE wrapping, accessible actions, scroll/safe-area behavior; no unrelated restyling |
| 6 — acceptance and stop | Standard/small iOS, Android layout/Back and accessibility evidence; exact-source automated gate | Working authorized implementation | Seven-area matrix complete or honest gaps reported; owner visual/device review before any further screens. No commit/push/merge/deploy without separate permission |

Do not begin Step 2 or later under the current instruction. A baseline-green suite does not authorize product edits. If storage failure discrimination requires broader changes than the compatible boundary below, isolate that dependency for review instead of hiding it inside a footer change.

## 1. Draft-return identity and retained state

Existing facts: `NativeWalkFlow` owns the unbuilt draft in mounted React state; `CityScreen` currently honors `returnToPlanner=1` with `router.canGoBack()`. There is no persistent unbuilt-draft identifier or durable draft store. `CurrentWalk` exists only for built journeys and has phase preview/active.

**Proposed identity contract:** a valid resume requires the selected city, the exact still-mounted planner route instance and that instance's current continuation target. Use native route identity already available through the navigation stack (the repository uses `useRoute`/native navigation in `tabNavigation.tsx`); implementation must verify the installed APIs. A mount-local continuation token/reference may be needed inside the same controller, explicitly labeled new transient state—not a persisted domain ID or second settings store. Never put GPS, interests or full draft contents in the URL.

The existing `returnToPlanner=1` query remains only an intent. `canGoBack()` alone is not proof. If the immediately previous compatible route is not the matching mounted planner, do not call arbitrary Back or silently create a duplicate draft. Fall back to ordinary selected-city `/walk` hydration; communicate only real persisted resume. Late taps/results for a retired instance must not change a replacement draft.

Retained-state fingerprint for tests: citySlug + interests + minutes + returnBy + walking + categories + startMode/startSlug/GPS + endMode/endSlug. Exact values remain in the existing owner. Session-only draft state does not survive process termination; durable drafts are a separate scope decision.

## 2. Back and Edit Interests

Named transition contract in the same controller:

- New draft: 05 → 06 → 07 → 08 → remaining constraints.
- Constraints Back → 08; 08 Back → 07; 07 Back → 06; 06 Back → 05; 05 normal Back → validated origin/selected-city Hub. No reset on traversal.
- Explicit Edit Interests from constraints → existing SelectInterests → Continue or Skip returns directly to constraints. Back from edit returns to constraints retaining current values; do not promise cancel/rollback without implementing it.
- Skip interests keeps its existing empty-selection semantics. Skip time keeps the current/default duration. Returning through Back or edit must not restore skipped defaults silently.
- Optional browse Hub → Build returns only to the exact retained draft's constraints. Rapid/repeated taps create neither repeated Hub instances nor multiple drafts.
- Match on-screen Back, Android hardware Back and enabled iOS navigation gestures; invalidate late permission results when leaving their request state.

A blind `setStep(3)` is insufficient: it would skip old walking/category controls and leave incorrect Back paths. Use explicit continuation mode/return target in NativeWalkFlow while reusing existing data values and render components.

## 3. Legacy planner control inventory

| Control | Existing location / contract | Proposed preservation |
|---|---|---|
| Interests / explicit Skip | SelectInterests; canonical `Interest` / `interestTags` | Automatic entry once, explicit edit thereafter; same state into builder |
| Time budget | AvailableTime; `minutes` in `WalkSettings` | Preserve 60/120/180/240 cards and hydrated 90. Do not auto-save unsupported 240 into account TravelerStyle (60/90/120/180) |
| Optional return-by | ReturnByTimePicker → `returnBy` → existing deadline validation | Retain restored HH:MM, future-today and walking return budget; revalidate after time passes/browsing, no tomorrow/car/transit inference |
| Walking pace | Existing legacy step 2 `walking` easy/balanced/long | Keep usable in remaining configuration; not removed with repeated interests grid |
| Additional category/tag filters | Existing legacy step 2 `categories` / dynamic tags | Keep optional advanced controls and real eligibility semantics |
| Start | Legacy step 3 manual place or optional foreground GPS | Manual fallback always available; no forced permission or invented position |
| Finish | Legacy step 3 anywhere/loop/destination and endSlug | Keep real walking-based finish/return estimates and city-scoped place identity |
| Build / eligibility / errors | Existing shared `buildWalk`/WalkSettings path | Only explicit Build generates/persists preview; handle no eligible content/deadline infeasibility honestly |
| Start | Existing custom preview/start controls | Only explicit Start changes execution phase; no automatic Start from S08/Back/browse |

Proposed layout places existing meaningful walking/category controls with the remaining start/end configuration, with an interests summary/edit affordance. Exact footer/control composition requires EN/DE and large-text/native review; UX flow approval is not evidence that this layout already fits.

## 4. Storage-error recovery — prerequisite, not a silently implemented fix

`mobile/src/lib/walkStorage.ts` currently returns no CurrentWalk for several invalid/completed cases; malformed JSON/schema can be indistinguishable from no stored record to the caller. NativeWalkFlow hydration can fall back to plan after errors. Therefore “no walk” cannot automatically be claimed as reliable recovery in all failure cases.

**Proposed compatible result boundary, subject to technical review:** distinguish genuinely absent, valid current preview/active, and unavailable/corrupt/incompatible/read-failed state using one read/validation path inside existing walkStorage. Exact helper/type name is not existing functionality and must be chosen after review. Preserve the current namespace/serialized record format and existing callers via compatibility; no second store, migration or schema change is proposed.

For unavailable state, show retry and guest city browsing; preserve stored bytes, avoid generation/persistence over an unreadable current record and never silently delete it. Any explicit abandon/reset must be separately scoped and confirmed, not added as a hidden fallback. Reuse existing compare-and-clear/serialized mutation protections. Tests must cover unreadable storage, malformed records, wrong city, finished records, stale write/concurrent journey change and retry success. Do not make existing saved-route replay resume an old deadline: `reopenSavedWalk` deliberately creates a fresh preview session and clears it.

## 5. Guest behavior

No auth gate for city discovery, draft settings, S08, manual constraints, Build or supported basic execution. Existing account defaults may initialize authenticated users but must not overwrite a draft during guest/account or locale refresh. Preserve account-only save/premium gates separately; no entitlement changes. Current preview/active resumes before 05–08; explicit saved local/account replay and add-place intent follow existing contracts. A cold launch or missing stack does not revive an unbuilt draft; other-city state is never imported or cleared.

## 6. EN/DE copy and accessibility

Approved semantic labels: primary EN **Continue planning**, DE **Planung fortsetzen**; secondary EN **Explore {city}**, DE **{city} entdecken**. Keep editorial confirmation and real selected-city imagery; no generated-route claim. Any subtle supporting-copy changes for clarity still need review, not a new feature promise.

Buttons must announce their actual destination, be distinct and keyboard/screen-reader operable, support long city names and large text, and remain reachable above/through safe-area scrolling without overlap. Preserve minimum existing touch targets, contrast and reduced motion. FirstExperience currently accepts `onBack`/`onExplore` only; a new planning callback and localized footer are prospective interface work. No new screenshots or physical assistive-technology acceptance have been produced.

## 7. Small iPhone and Android acceptance

After authorized implementation, capture the real S08 and remaining-constraints screens on a standard iPhone and 375×667-point small iPhone, EN/DE default and maximum relevant text sizes; include bottom/scroll states. Verify time picker/keyboard and two-action footer reachability. Capture Android narrow-screen EN/DE layouts with system insets/text scaling and test hardware Back, denied location and activity/process recreation. Record actual device/emulator/OS/source and limitations; an Expo export or DOM test does not establish native layout or TalkBack/VoiceOver acceptance.

## Prospective file boundary

- `mobile/src/components/NativeWalkFlow.tsx` — transitions, meaningful old controls, edit/back/permission request invalidation.
- `mobile/src/components/FirstExperience.tsx`, `mobile/src/lib/firstExperienceCopy.ts` — primary/secondary callback and copy, preserving approved composition.
- `mobile/src/app/city/[citySlug]/index.tsx` — only validated retained-draft return behavior; preserve approved Hub visuals.
- `mobile/src/lib/walkStorage.ts` — only a separately accepted compatible failure-discrimination dependency, if required; no destructive storage change.
- Existing targeted `mobile/tests/*` and existing storage/render harnesses — future regressions after explicit test-code authorization.

No changes to S01–S07/S09–S13 styles, routing provider, content/API/publication, Better Auth, availability, tab architecture or payments. City Pass remains €4.99/72h, one-time/no renewal. D01–D14 and Screen 14 are untouched pending decisions.

## Next requested gate

Review this technical-contract proposal and its acceptance matrix. If accepted, the smallest next authorization would explicitly allow the regression-test phase and agreed compatible identity/recovery groundwork. It would still not authorize merge, deletion, commit, push or deployment. No action has been taken under that hypothetical authorization.
