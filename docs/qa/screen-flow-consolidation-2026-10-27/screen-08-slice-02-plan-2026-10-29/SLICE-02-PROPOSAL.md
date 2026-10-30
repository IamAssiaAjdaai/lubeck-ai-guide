# Screen 08 — Slice 02 navigation integration proposal

**29 October 2026 · PROPOSAL ONLY · IMPLEMENTATION NOT AUTHORIZED**

Owner review scope: integrate the existing Slice 01 helper into the real Screen 08/new-draft planner, without changing the helper, authentication, payments, backend, approved editorial visuals or Screen 14. This document authorizes no code, test, dependency, storage or navigation change.

## Recommendation and approval gates

Prepare one atomic navigation change in the existing worktree, but enable/accept it only after these explicit gates:

1. **Navigation scope approval:** approve the seven production-file boundary and Screen 08 footer semantics below, with native visual acceptance still required.
2. **Storage safety prerequisite:** the earlier technical contract and Slice 01 handoff require classified current-slot observation and guarded preview writes before enabling a safely resumable draft. Those APIs do not exist. Approve/complete that prerequisite separately; do not silently add `walkStorage` work to Slice 02 or treat a lease as a freshness check. Without it, a navigation-only prototype can demonstrate transitions but cannot satisfy the approved full contract or be accepted as safe enabled functionality.
3. **Legacy test-contract decision:** several existing assertions require the obsolete boolean-only Back/URL behavior and directly contradict the new contract. Preserve them unchanged now. Resolve their explicit, versioned migration before implementing the conflicting integration. No test-mock alias, silent assertion edit/deletion or permanent old unsafe fallback is proposed. See [TEST-CONTRACT-REVIEW.md](TEST-CONTRACT-REVIEW.md).

The latest owner request establishes Slice 02 as the navigation proposal. The prior recommendation of storage groundwork is retained as a separately authorized prerequisite, not relabelled as already done or absorbed into this scope. Nothing below starts Slice 02, another slice, Screen 15 or broader consolidation.

## Verified baseline

- Existing worktree `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`; branch `codex/onboarding-global-welcome`; base `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus preserved local approved work.
- NativeWalkFlow owns every planner value. 05–08 are views of `/city/[citySlug]/walk`, not independent routes. The old S08 Explore action sets a completion flag and pushes Hub; returning exposes legacy interests again.
- Slice 01 `plannerReturnIntent.ts` has a singleton ephemeral registry, `publish`, `revoke`, `reconcile`, pure `resolve`, `parsePlannerReturnEnvelope`, `normalizePlannerIntentScope`; 32 entries maximum. It has no production consumers and no persistence, settings, GPS, journey or auth state.
- Real Hub uses `returnToPlanner === "1" && router.canGoBack()`; assistant forwards a boolean. Neither uses the helper.
- WalkScreen's key omits saved source/account flag. Locale caching already preserves the controller; keep that behavior.
- Existing `loadCurrentWalk` can conflate absent/corrupt/completed slots; `persistCurrentWalk` serializes writes but does not guard an observed revision. NativeWalkFlow's saved replay can overwrite another current walk. These are known dependencies, not fixed by navigation.
- Slice 01's last run: 985 ordinary passes, 15 expected-failure variants, 20 TODOs; 11 helper tests passed; TypeScript/lint/iOS+Android Hermes exports passed. Historical local evidence only; no tests/builds/device acceptance were rerun for this planning task. Case counts: 9 passed, 14 expected failures, 23 pending, 1 blocked.

Exact current anchors and hashes are in [SOURCE-REVIEW.md](SOURCE-REVIEW.md) / [source-evidence.json](source-evidence.json). Current GitHub preflight is in [PREFLIGHT.json](PREFLIGHT.json). Remote refs do not replace evidence for this dirty local worktree.

## Exact proposed production boundary

| File | Proposed change | Protected boundary |
|---|---|---|
| `mobile/src/app/city/[citySlug]/walk.tsx` | Parse and normalize actual city/saved/source/add intent with existing helper; include normalized scope in controller key, excluding locale/continuation markers. Capture native route key through Expo's `useRoute`; pass an identity-only optional scope to NativeWalkFlow. Malformed intent gets existing content recovery rather than silently becoming a new draft. | Existing public city hook, availability, previous-locale cache and data contracts unchanged. Source/account-scoped saved opens remain distinct. |
| `mobile/src/components/NativeWalkFlow.tsx` | Introduce a new-draft cursor and explicit edit-return, unified internal Back decision, direct S08 planning transition, constrained lease lifecycle/browse ticket, owning-route gesture guard and focus revalidation integration. Compose existing walking/tags/start/end controls into one remaining-constraints view. | Sole settings owner remains here. Keep numeric steps for legacy/add/Customize. Do not rewrite shared planning, current/saved transformations, persistence or Active Walk. |
| `mobile/src/components/FirstExperience.tsx` | Add a real planning callback for the new-draft interface; preserve `onExplore`/`onBack`. Show Continue planning as primary and Explore {city} as secondary in the new interface. Existing supported legacy component usage without a planning callback can retain its existing single Explore action; no inert planning button. | Photo, badge, headline, supporting meaning, typography, colors, attribution, city gate and header unchanged. Footer only gets the approved two-action behavior, subject to native acceptance. |
| `mobile/src/lib/firstExperienceCopy.ts` | Add typed planning label: EN “Continue planning”; DE “Planung fortsetzen”; complete the existing da/sv/nl/es/ar entries. Preserve existing title/description/explore strings. | Keep `Record<NativeLocale,...>` exhaustive; no English pretending to be an authored other locale. |
| `mobile/src/app/city/[citySlug]/index.tsx` | Replace boolean-only return interception with real helper validation, fresh owning-stack resolution and synchronous exact pop. Forward the complete validated envelope through the existing assistant link. Keep ordinary Build href as the fallback. | Approved Screen 09 layout, five-tab behavior, routes, places, Guide fallback and account defaults unchanged. |
| `mobile/src/app/city/[citySlug]/assistant.tsx` | Accept a typed full envelope, preserve it through supported dismiss-to-Hub fallback, otherwise clear it completely. Revalidate on the Hub; forwarding is not resume proof. | Existing unavailable city-wide-guide message and place discovery fallback remain; no answer API or new Guide capability. |
| `mobile/src/lib/plannerNavigationCopy.ts` (**new, proposed**) | Small exhaustive `Record<NativeLocale,...>` for Edit Interests, selection summary, and honest navigation-return failure/retry text needed by the new constraints composition. Reuse existing common labels wherever available. | UI copy only; no settings, routes, storage, backend locale contracts or new global state. |

**Frozen:** `plannerReturnIntent.ts` and its 11 executable helper assertions; SelectInterests, AvailableTime, LocationPermission, ReturnByTimePicker presentation/style files; approved other screens; shared planner/domain; `walkStorage`; root tab/layout architecture; auth/purchases/backend; all manifests/lockfiles. Reusing those views does not authorize restyling them. If implementation requires another production file, stop and report the specific boundary change before editing it.

## New-draft state contract

Keep existing `stage` execution phases. Within healthy new-draft plan mode, a single cursor is authoritative:

`interests | time | location | confirmation | constraints`

An optional `editReturn="constraints"` represents explicit interest editing. Do not retain three completion flags plus numeric step plus cursor as competing authorities. Old numeric steps remain confined to `interestOnboarding=false`, add and existing-journey Customize paths. New-draft eligibility requires resolved usable content, no saved/add/journey and a safe new-draft decision from the separate storage prerequisite. A hydration failure never establishes absence.

| From | Event | To | Values and side effects |
|---|---|---|---|
| Normal hydrate | Valid current preview/active | Existing phase | No 05–08, fresh ID, lease or initialization defaults |
| Saved hydrate | Requested saved local/account/legacy resolved | Fresh preview via existing replay transform | New execution ID; reset visits/history; clear old deadline; preserve source saved record/link; prerequisite must protect another current slot |
| Safe new draft | Defaults initialized once | interests | No persistent draft or lease yet |
| interests | Continue with selection / Skip | time; or constraints when editReturn is set | Skip sets `[]`; other values untouched; clear editReturn on return |
| time | Continue or compatible Skip | location | Same minutes/returnBy; no implicit budget reset |
| location | Explicit Use location | same view busy, then confirmation only for live accepted result | Existing permission/request-ticket logic; denied/no fix leaves manual/Not now path |
| location | Not now | confirmation | Invalidate late request ticket, no invented location |
| confirmation | Continue planning | constraints, same controller | **No Hub push; no repeated interests; no build/persist/start/default reload** |
| confirmation | Explore {city} | committed constraints, then selected-city Hub | Synchronously reserve one browse ticket; publish ready lease after commit before one push |
| constraints | Edit Interests | interests + editReturn | Other values and current live edits retained; no 06–08 replay on return |
| constraints | Explicit Build | existing building → preview | Revoke lease first; delegate unchanged shared planner through the separately verified guarded-write prerequisite; no auto-start |
| preview | Explicit Start | existing active | Existing start/content/identity rules only |

**Remaining constraints composition:** reuse the existing dynamic-category/tag controls and walking easy/balanced/long selector from old step 2; reuse manual place/GPS start, anywhere/loop/destination and real destination picker from old step 3. Show the chosen interests as a summary with Edit Interests, not the old interest grid. Retain exact state fields `interests`, `minutes`, `returnBy`, `walking`, `categories`, `startMode`, `startSlug`, `gps`, `endMode`, `endSlug`. Duration/return-by remain editable through the approved Back chain; no silent change or account-default write. Do not retain obsolete numeric step progress in the new combined constraints view. Legacy numeric progress stays unchanged.

## Back / edit / gesture rules

| Current view | Normal Back | Explicit-edit Back |
|---|---|---|
| constraints | confirmation | Not applicable |
| confirmation | location | Not applicable |
| location | time; invalidate request ticket | Not applicable |
| time | interests | Not applicable |
| interests | Valid originating stack Back; otherwise selected-city Hub | constraints, retaining live edits |

On-screen and Android hardware Back call one transition decision. Preserve existing priority: rebuild confirmation → proposed route → add/back panel → draft cursor → native initial-view exit. Back never builds, persists, clears, rebuilds, requests location or reinitializes defaults. Build failure must return to the actual mode's constraints/error target rather than force a new intro; full storage recovery remains a prerequisite.

The existing native route must disable iOS pop gestures while beyond initial new-draft interests or in explicit edit, using Expo's installed `useNavigation` / NativeStack `setOptions` in a layout effect for that route. Restore its known existing/default option on genuine initial exit/legacy mode; do not set app-wide gestures. New-draft wrapper options must be present for every early-render branch. A native Back from the voluntary Hub remains allowed and returns to committed constraints. Verify actual option update and gesture behavior on device; type availability is not acceptance.

## Lease issuance, forwarding, resolution and consumption

**Use the existing singleton only.** Never create a registry per screen or mock one into existence. NativeWalkFlow generates `createMobileTripId("draft")` once per actual controller mount/scope; that is metadata, not a WalkJourney or account capability. Values stay exclusively in controller state.

1. WalkScreen supplies actual native route key plus `normalizePlannerIntentScope` output. Account-saved source is part of scope; locale and return markers are not. Scope change retires the old instance/token/tickets; ordinary locale/session refresh retains initialized values.
2. Publish only after a committed healthy new-draft constraints render, with matching native key/city/scope, safe storage observation/content readiness, and no saved/add/journey/build/recovery/edit. Use `plannerReturnIntents.publish` and its returned scalar envelope; never hand-build an unchecked partial envelope. If publication fails (including capacity), remain with recoverable feedback; do not push a supposedly resumable Hub.
3. On optional Explore, synchronously reserve a per-controller browse ticket, set cursor to constraints and a pending browse request. The post-commit effect publishes, verifies the same ticket/mount/scope, marks the push handled **before** calling router.push and pushes exactly once. No timer, effect double-push under Strict Mode, or assumption that setState commits immediately. Returning natively must find constraints already rendered. A push failure clears that ticket and provides retry without fabricating restoration.
4. Do **not** revoke merely because the walk blurs under the supported browse Hub/assistant: that would destroy the return lease. Revoke synchronously before Back/edit/build/mode/scope invalidation and on content/storage invalidation; effect cleanup/unmount uses exact token-conditional `revoke`. Old cleanup cannot remove a replacement token. Cancel pending browse/permission tickets on retirement.
5. Reconciliation may call existing `reconcile` only with a known-complete live native route-key inventory across owning stacks. Current root has one Expo Stack, but a partial child snapshot is not a complete inventory. Observe the complete root state via Expo-exported APIs, traverse keys for **cleanup only**, and abstain if any relevant state is partial/unavailable. Target resolution still inspects only the focused owning stack, never searches nested stacks. Bounded map + unmount cleanup remains safe if cleanup inventory is temporarily unavailable.
6. Hub Build acquires a synchronous per-Hub press lock. Read the actual focused native Hub route and its owning stack using Expo's existing `useRoute`/`useNavigation` (same runtime as `tabNavigation.tsx`). Parse its complete envelope and call `plannerReturnIntents.resolve` with current city/params/state/focus/key. Immediately re-read and resolve again. Require stable source/target/token and owning stack; use the final count. Invoke **that owning navigation's `pop(count)` synchronously with no await**, not global `router.back`, pathname search or a new walk push.
7. **Consumption:** `resolve()` stays pure and does not consume readiness. The press lock allows one accepted pop per Hub activation. After synchronous dispatch, retire the matching lease through `revoke`; clear obsolete return markers if that Hub remains reachable. On return, the controller cancels its browse ticket, synchronously closes a new-draft Build-readiness gate, and revalidates content and the storage observation before Build or any republish. The actual new-draft Build handler must check that gate, not rely on a later disabled-button render; reopen it only for the same live mount/scope after successful prerequisite validation. This focus gate is not a replacement for the separate atomic guarded-write/build-lifecycle contract. If native Back returned instead, the controller performs the same cleanup/revalidation. Republish only from another genuinely committed healthy constraints state; if a later browse is requested it gets one new browse ticket. This is not a globally single-use token/auth guarantee—mount tokens last for the mounted draft, and helper code is unchanged.
8. Missing/stale/forged/wrong-city/cold-runtime identity: do not pop. Allow the ordinary selected-city `/walk` href/hydration path with no claim of retained settings. If final focus is lost during a press, perform no action from the inactive screen; the next focused tap can use normal fallback. If dispatch throws, release the lock with feedback and no second automatic navigation. No fallback may bypass ordinary current/saved hydration safety.
9. Hub → assistant → existing dismiss-to-Hub forwards only a complete same-city parsed envelope or none at all. At destination, revalidate the lease and native target before return; syntactic forwarding is not liveness proof. If dismissTo creates a Hub because the old one disappeared, a missing lease/target yields ordinary hydration. Tabs, cross-city links and cold deep links carry no general draft promise. Do not redesign tab behavior.

See [FLOW.md](FLOW.md) for the visible flow and lease sequence.

## Current, saved, add and guest contracts

- **Current preview/active:** exact existing journey/phase resumes before new-draft cursor; no new draft token/lease or repeated 05–08. Current phase must never be inferred from a return envelope.
- **Saved replay:** existing `reopenSavedWalk` is a new execution session/preview, not resume; keep saved linkage, full ordered itinerary, cleared old deadline/visited/history. Requested missing/account-inaccessible saved route is recovery, not fresh guest planning. Another unfinished current route must survive; separate storage prerequisite owns that protection.
- **Customize/add/rebuild:** keep existing journey and legacy controls, no new-draft cursor/08. Confirmed rebuild alone clears a reviewed current slot and then starts a new draft under the existing policy. Navigation callbacks never invoke rebuild. No new saved/replacement policy.
- **Guest:** no login or location prerequisite for either S08 action, Back or constraints. Existing save/account gates unchanged; preferences initialize once and never auto-save. Account and locale refresh do not replace current new-draft values. Live authenticated navigation needs later acceptance with the existing provider, not another auth system.
- **Execution boundary:** Continue/Explore/Back/Edit do not call shared generation, persist, replay or Start. Only explicit Build creates the custom preview, and only explicit Start begins execution. Published route preview/Active Walk (Screens 13/14) is outside this flow change.

## Regression conversion and preservation

Target conversion after real integration and all assertions pass: **T01, T02, T05, I02, I03, I08, A01** (seven cases/eight variants, because A01 has EN/DE). Do not convert wrappers preemptively. Add full native-port/controller coverage for pending **R01–R04, T04, T06/T07, I01/I04/I05/I06/I07, E06, C01, G04** to the extent their complete original contract is feasible; partial passes remain labelled partial. D01's existing picker baseline remains but day/zone portion stays open. Existing E01/E02/E05/C02/C03/D02/D05/T03/P01 passes must remain.

Still open unless separately authorized prerequisite work closes them with evidence: **S02, S04, S05, S07, E03, E04, D03** expected failures; pending S01/S03/S06, D01/D04, G01–G03 and native A02. Do not claim navigation addresses storage/date/build-lifecycle cases. Detailed target-to-test mapping and contradictory assertions are in [TEST-CONTRACT-REVIEW.md](TEST-CONTRACT-REVIEW.md). No current result counts change merely because this proposal was written.

## Visual and scope protection

Preserve all approved Screen 01–13 imagery, typography, colors, layout and behavior except the specific approved S08 primary/secondary flow change and necessary new constraints composition. For S08, protect photo crop/height, badge, headline, supporting text, attribution, locale header and safe-area structure. Two-action footer must fit/scroll at large text without reducing touch targets. No restyling “while here.” Approved 09 visuals remain byte-identical where possible; only handlers/param types change.

Explicit exclusions: Slice 01 helper/API edits, broad reducers/state/store refactors, persistent drafts, new navigation provider/routes/tabs, city/POI data, auth/payments/backend/API schemas, geometry/transport/offline/GPS completion, broad saved/current replacement policies, unrelated error recovery, deadline date/zone implementation, Screen 14/15 and D01–D14 decisions. Prerequisites remain separately approved work, not silent exceptions.

## Verification and implementation sequence after approval

1. Resolve the two prerequisite decisions above; preserve old test assertions and helper hashes. Refresh current source and exact baseline; never reset/stash existing work.
2. Add real rendered/navigation regressions using the real helper, mocking only native/auth/content/storage ports. New harnesses must not implement a fake cursor, registry or resolver. Record genuine assertion-level red failures against old behavior.
3. Implement scope normalization/new-draft cursor/direct handoff/Back/edit/legacy-control composition and native gesture option within the allowed files.
4. Wire post-commit publish, one-ticket optional browsing, exact owning-stack return and complete assistant envelope. Revalidate storage/content on focus using the separately verified prerequisite. Keep valid current/saved/add modes distinct.
5. Convert only actually satisfied expected failures; retain all unrelated ones/TODOs visibly. Resolve named historical navigation expectations only through the explicit owner-approved test-contract change; no unsafe compatibility branch solely to keep old tests green.
6. Run focused suite, full mobile suite, lint, TypeScript, i18n check and local iOS/Android Hermes exports; preserve raw logs and separate ordinary passes/expected failures/TODOs. Native component integration also needs local native build/runtime acceptance; exports alone do not prove navigation. No server/DB/provider execution for a navigation-only patch.
7. Execute exact-source [native acceptance](NATIVE-ACCEPTANCE.md), compare approved screenshot anchors, verify actual guest/authenticated stack actions, then report modified files, case-level and unit-level results, remaining risks and scope hashes. Stop for owner review before any other screen or consolidation action.

Current planning task: documentation/file/hash/link/diff validation only. No code, test, build, simulator, auth, DB, payment, commit, push, merge, deletion or deployment action performed.
