# Screen 08 — implementation-ready technical contract

**28 October 2026 · UX/FLOW APPROVED · TECHNICAL CONTRACT FOR REVIEW · IMPLEMENTATION NOT AUTHORIZED**

Read-only review of the existing isolated `codex/onboarding-global-welcome` worktree at `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`, base `98a1dbbda17f945a0d982eb6dbc36713bad61617` plus existing uncommitted approved work. Current source/test hashes and line anchors accompany this document. No app or test code changed or executed in this review. Prior 117-test baseline is historical current-implementation evidence, not proof of the approved future flow.

Scope: only S08's approved new-draft handoff and the necessary navigation/state/persistence safety boundaries. Keep exact design IDs, guest discovery, actual city availability, existing Better Auth, EN/DE and other current locales, existing five tabs and approved designs. D01–D14 and Screen 14 remain PENDING. No merge, deletion, commit, push or deployment permission.

## 1. Existing facts versus required implementation

| ID | Verified current behavior / gap | Required future contract |
|---|---|---|
| T01 — Current retention works only while the controller instance survives | 05–08 and legacy steps use the same NativeWalkFlow values. No writes happen for unbuilt settings. Locale fetch deliberately keeps the same instance/data; WalkScreen key changes for city/saved/add and excludes locale. It also excludes accountSaved/source, though hydration depends on it. Evidence: [mobile/src/components/NativeWalkFlow.tsx:203](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/components/NativeWalkFlow.tsx:203) | Define normalized route scope including account/local saved source, exclude locale and transient return markers; no remount on locale/marker updates. |
| T02 — Primary handoff currently exits rather than continuing | S08 onExplore sets a completion flag and pushes another Hub. Return lands on the old step-2 interests grid. Evidence: [mobile/src/components/NativeWalkFlow.tsx:965](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/components/NativeWalkFlow.tsx:965) | New-draft cursor, direct confirmation→constraints transition; walking/tags retained elsewhere in same controller. |
| T03 — Return identity is not reliable today | Hub checks a flag and canGoBack only; this proves neither city, controller mount nor a correct target. Assistant fallback forwards only that flag. Evidence: [mobile/src/app/city/[citySlug]/index.tsx:154](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/app/city/[citySlug]/index.tsx:154) | Versioned transient return envelope + ephemeral live lease + exact native route key/city/mount matching. Fail closed to normal hydration; preserve envelope on supported forwarding paths. |
| T04 — Absence, invalid storage and completed state are conflated | read catches malformed JSON as undefined. loadCurrentWalk returns undefined for invalid schema, wrong city or finishedAt. I/O can throw. Hydration catch then switches to plan. Evidence: [mobile/src/lib/walkStorage.ts:75](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/lib/walkStorage.ts:75) | Classify slot observation before new-draft init. Unreadable/unexpected states enter recovery, never enable overwrite as if empty. |
| T05 — Queued writes are not optimistic concurrency protection | persistCurrentWalk serializes but writeCurrent can replace any existing slot. A different journey may appear during a mounted draft/build. Draft plan does not currently subscribe to slot changes. Evidence: [mobile/src/lib/walkStorage.ts:103](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/lib/walkStorage.ts:103) | Observe raw slot revision, recheck under the same existing mutation queue before committing new preview. Preserve current record on conflict; no last-write-wins generation. |
| T06 — Saved opening is a replay and may replace current slot during hydration | reopenSavedWalk resets execution and clears deadline; hydration then unconditionally persists its preview. Missing saved local IDs can fall into plan; account-open errors throw and catch also falls into plan. Evidence: [mobile/src/lib/walkStorage.ts:55](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/lib/walkStorage.ts:55) | Retain replay transform; handle requested-but-missing/account-failed separately. Do not silently replace a different current active/preview when opening a saved replay; retain both and present recovery/explicit existing replacement policy. |
| T07 — Customize is a distinct existing planning mode | customize keeps journey, changes stage to plan and hydrates fields from settings. Original manual/GPS provenance is not stored; it sets gps=settings.start and infers finish mode. Evidence: [mobile/src/components/NativeWalkFlow.tsx:906](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/components/NativeWalkFlow.tsx:906) | Do not replay 05–08 for explicit existing-walk Customize; preserve its edit lifecycle and coordinates without claiming a saved start is a fresh GPS fix. |
| T08 — HH:MM alone cannot preserve a return-by calendar intent | returnBy string survives Back, but deadlineForToday evaluates it on the current local date. After midnight, yesterday’s HH:MM could become a future time today. Evidence: [packages/traveler-core/src/walkPlanner.ts:148](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/packages/traveler-core/src/walkPlanner.ts:148) | Transient selected local day/time-zone metadata; day/zone change requires explicit time reconfirmation. Persist only existing absolute settings.deadline after Build. |
| T09 — Build needs a synchronous single-flight/cancellation boundary | build uses mounted guards and real layout/presentation waits but no initial build-specific ref lock. React rerender alone is not a double-tap guard. Evidence: [mobile/src/components/NativeWalkFlow.tsx:520](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/components/NativeWalkFlow.tsx:520) | One build request ticket, input snapshot, guarded commit and cancellation semantics; explicit Build only, no stale stage/record update. |
| T10 — Controller Back paths are not one unified transition contract | Android handler and Screen onBack use different numeric/flag paths. Plan step3 goes to repeated interests step2; edit origin is not represented. Evidence: [mobile/src/components/NativeWalkFlow.tsx:473](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/components/NativeWalkFlow.tsx:473) | One pure target decision called by both handlers, priority for current modals, explicit edit return and permission-attempt invalidation. |
| T11 — Planner estimates are not pedestrian street routes | measureWalk derives walking estimates from coordinate-to-coordinate distances and reserves a finish leg; deadline is future-today. Existing Start checks content/identity; it is not a guaranteed arrival-time replan. Evidence: [packages/traveler-core/src/walkPlanner.ts:40](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/packages/traveler-core/src/walkPlanner.ts:40) | Preserve existing walking-based estimates and explicit return choices. No street geometry, arrival guarantee, car/transit or automatic GPS completion. |
| T12 — Account defaults cannot be repurposed as a guest draft store | Guest loadTravelerStyle returns defaults; account style supports 60/90/120/180, while AvailableTime can select 240 and hydrate 90. Preference read failure falls back to defaults. Evidence: [mobile/src/lib/travelerStyle.ts:58](/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome/mobile/src/lib/travelerStyle.ts:58) | Account defaults initialize only after a genuinely safe new-draft decision; never replace retained draft or auto-save 240/deadline/GPS as account defaults. |

## 2. Routes, instance lifetime and ownership

Existing route templates are `/city/[citySlug]` (CityScreen), `/city/[citySlug]/walk` (WalkScreen → NativeWalkFlow), and `/city/[citySlug]/tour/[tourSlug]` (published RoutePreview, outside this flow). 05–08 and custom preview/active are **states of `/walk`**, not new routes.

WalkScreen's existing key is `${citySlug}:${saved ?? "active"}:${add ?? ""}`. **Required normalized intent scope:** citySlug + savedId-or-none + accountSaved boolean + addSlug-or-none. Source/account change must invalidate an old hydration/controller scope; locale and continuation-marker changes must not remount the controller. Unsupported/array/malformed params must pass existing route parsers and explicit param validation rather than being accepted as trusted identity. No new city data/API is introduced.

**One settings owner:** keep all existing values in NativeWalkFlow. SelectInterests, AvailableTime, ReturnByTimePicker, LocationPermission and FirstExperience stay controlled views. The return intent carries no copy of the settings. No global preference singleton, new guest-persistence namespace or duplicate planner is permitted by this contract.

**Modes must be explicit:**

| Mode | Entry condition / behavior |
|---|---|
| hydrate | Resolve content/slot/saved intent before deciding on settings or execution; no Continue/Build while unresolved |
| newDraft | Safe empty/terminal slot + no savedId/addSlug/journey + interestOnboarding; run named 05–08 cursor |
| existingCustomize | Explicit customize of a built journey; keep journey identity/settings, existing edit path and no 05–08 replay |
| legacy/add | `interestOnboarding=false` or existing add-place intent; preserve existing behavior, do not force new S08 sequence |
| preview / active / finished | Existing built-journey stages; never display S08 as an execution step |
| recovery | Failed/missing-requested/conflicting data; no new-draft Build and no destructive fallback |

The current `stage` union may gain a recovery state (or an equivalent discriminated hydration result), inside the same controller. Names in this document are the required logical contract; they are not types/functions already implemented.

## 3. Settings retention and data mapping

| Value | Current owner/input | Required preservation / persistence meaning |
|---|---|---|
| citySlug | Validated route, WalkScreen city hook | Never transferred to another city's draft/slot; available-city gate retained |
| interests | NativeWalkFlow `Interest[]`; SelectInterests | Same array values through 05–08/constraints; Skip means `[]`; initialize once, never restore defaults just because an optional step was skipped |
| minutes | NativeWalkFlow; AvailableTime | 60/120/180/240 choices and hydrated 90 preserved; account defaults have narrower contract |
| returnBy | NativeWalkFlow string; ReturnByTimePicker | Same HH:MM on Back/reopen; blank is no deadline; time validity checked at explicit Build |
| returnBy origin day/zone | Not currently tracked | Required new transient metadata on explicit time selection/clear or Customize from absolute deadline; never persist as a second draft model |
| walking | `WalkSettings["walking"]` | easy/balanced/long preserved and passed to real planner |
| categories | Existing dynamic category/tag string array | Keep optional meaningful old controls and their supported semantics; do not invent taxonomy |
| startMode/startSlug/gps | Manual place or accepted location result | Keep exact mounted values; GPS result applies only to live request/instance; no permission requirement for manual start |
| endMode/endSlug | anywhere/loop/destination | Keep exact choice; loop finish=start, destination finish=selected place, anywhere has no fixed finish |
| stored `WalkSettings` | minutes, deadline?, start, finish?, interests, categories?, walking | Build converts draft controls into this existing contract; no new backend DTO/schema or transport field |
| `WalkJourney` | Generated identity, settings, ordered remaining/visited, position, finish, timestamps | Only real Build/replay creates a preview journey; do not fabricate one at S08 |

Retention is by the same mounted controller, not screen-to-screen serialization. Arrays must be immutable updates; transition functions must not initialize/reset settings. Account default/session/locale refresh must not replace current draft fields after initialization. The existing WalkScreen previous-locale data cache prevents locale fetch from unmounting the flow, but content errors still gate Build.

Stored settings retain start/finish coordinates, not original manual/GPS/end-mode provenance or raw HH:MM. Current Customize infers those controls from coordinates; preserving that replay semantics is not a claim of fresh GPS or an exact original UI-mode round-trip. Account TravelerStyle intentionally excludes deadline/GPS and is not a guest draft store.

## 4. New-draft transition contract

Use one authoritative transient **draft cursor** `interests | time | location | confirmation | constraints` and optional `editReturn=constraints` in the existing controller. Do not synchronize three old completion flags, a new cursor and numeric step as competing authorities. Old numeric `step` remains only where required for legacy/add or explicit existing-journey Customize; newDraft routing ignores it. This is a prospective controller refactor, not a second state owner or implemented reducer.

| From | Event / guard | To | Required side effects (and exclusions) |
|---|---|---|---|
| hydrate | Safe new draft, defaults initialized once | interests | No persistence or permission request |
| interests | Continue, nonempty supported selection | time; or constraints if explicit editReturn | Preserve all settings; clear editReturn on completion |
| interests | Skip | same next target | Set interests=[] only; no later default resurrection |
| time | Continue or Skip, existing minutes valid | location | Preserve budget/deadline; Skip does not remove budget |
| location | Explicit Use location | location busy | Existing foreground request, request ticket bound to mount |
| location | Matching successful result | confirmation | Store accepted point/startMode; no extra permission request |
| location | Denied/error/no fix | location recovery | Existing useful feedback + Not now/manual path; no forced account |
| location | Not now | confirmation | Invalidate in-flight result; no fabricated point or implicit start change |
| confirmation | Primary Continue planning | constraints | No router push, build, persistence or Active Walk |
| confirmation | Secondary Explore city | constraints, then optional Hub | Register valid return intent before push; preserve same controller. Native Back from that Hub also returns to constraints |
| constraints | Edit Interests | interests + editReturn=constraints | No defaults/other-field resets |
| constraints | Explicit Build + valid content/fields/slot observation | building | Single-flight snapshot; shared planner only |
| building | Valid nonempty result + successful guarded preview commit | preview | Set actual journey/phase only after success |
| building | Empty/infeasible route | constraints with build feedback | No persisted fake preview; keep all fields, clear stale pending presentation handlers |
| building | Planning/storage/conflict failure | constraints or blocking recovery as appropriate | Preserve fields/stored record; never silently overwrite/restart |
| preview | Explicit supported Start | active | Existing startCurrentWalk, identity/content/entitlement gates retained |

Primary and secondary are distinct actions on FirstExperience. Current component supports onBack/onExplore only; a direct planning callback and EN/DE primary copy are **required interface changes**, not existing behavior. The secondary prepares constraints before leaving; it does not create a second draft or route.

### Back and Edit Interests

- Ordinary chain: constraints → confirmation → location → time → interests → validated origin/selected-city Hub. Back is intentional review, not a forced new onboarding run.
- From explicit interest edit, Back/Continue/Skip returns to constraints; it must not replay time/location/confirmation. Edits remain live; no unimplemented Cancel rollback promise.
- Both on-screen Back and Android hardware Back call the same transition decision. Preserve existing modal priority: rebuild confirmation, pending proposal and add/back panel must close safely before changing draft cursor.
- Leaving the location request invalidates its ticket on both Back mechanisms; denied permission remains an OS state, not something Back resets.
- Internal S05–08/constraints are not native routes. **Required iOS safety:** disable native-stack pop gestures while the new draft is beyond its initial interests view or in explicit edit, using the installed NativeStack gestureEnabled option. The visible Back follows the internal chain; a swipe must not pop the entire controller and lose values. Restore the route default for genuine initial-view exit and legacy/preview modes. Hardware Android Back stays controller-driven. Native pop Back from the optional browse Hub is allowed and returns to the mounted constraints. No beforeRemove/gesture interception claim is made without device proof.
- No Back event deletes/clears/persists a journey, auto-builds, auto-starts or resets selections. Explicit existing Rebuild remains separately confirmed.

## 5. Exact draft-return identity contract

### Verified API availability and limits

Installed expo-router is **57.0.29** and exports its own useRoute/useNavigation and NativeStackNavigationProp. Its bundled navigation types support route key, getState (possibly undefined through Expo's hook), setParams and native stack pop(count). Use these existing Expo-exported contexts/types; do not add or mix a different React Navigation runtime/provider. This is installed-type evidence, **not runtime proof of stack retention or gestures**.

### Chosen architecture — a live navigation lease, not a settings store

A route-param marker alone is rejected: restored native navigation state can contain an old marker before any corresponding controller mounts after process death. Route presence is not proof of a live draft. Do not solve this by assuming setParams or canGoBack proves liveness.

Specify a small **new ephemeral navigation-only helper** (proposed file `mobile/src/lib/plannerReturnIntent.ts`, not existing functionality). It keeps a bounded in-memory map of live leases keyed by native route key. A lease contains only `{citySlug, routeKey, mountToken, normalizedIntentScope, ready:"constraints"}`. It stores **no settings, coordinates, deadlines, journey, auth or persistence**, and is not a second preference/draft store. NativeWalkFlow remains the sole values owner. A cold JS runtime starts with an empty map, so restored URL/route params cannot prove liveness.

- Mount token is generated once per actual controller instance using existing createMobileTripId("draft"); it is not a WalkJourney ID or auth capability.
- Publish a lease only after a committed render is healthy `stage=plan`, `mode=newDraft`, cursor=constraints, with no journey/saved/add and matching normalized route scope. The controller publishes/revokes metadata; the helper never controls or reconstructs the draft.
- Hub intent carries existing `returnToPlanner="1"` plus proposed bounded scalar `plannerReturnVersion="1"`, `plannerRouteKey`, `plannerDraftToken` and same citySlug. Never settings/GPS/raw observations in params/logs. Pure route parsing continues through existing routing helpers.
- Cleanup/re-registration is token-conditional: an old instance may revoke only its own lease, not a replacement mount's entry. Revoke readiness when leaving plan/constraints, starting Build, entering recovery/Customize/Rebuild, changing intent scope or unmounting. Reconcile orphan leases against native stack routes; stale metadata is never enough to navigate.

**On secondary Explore:** lock the transition synchronously; set cursor=constraints and mark a pending browse intent; after that committed render publishes its live lease, push selected-city Hub exactly once. No timer or assumption of synchronous React state commits. If a valid registration cannot be obtained or the controller unmounts, do not push an apparently resumable Hub. The committed constraints state also makes native Back from browse land at constraints without replaying 08.

**On Hub Build:** require a complete valid envelope; inspect the focused owning native stack, find exactly the earlier target by route key/name `city/[citySlug]/walk`, normalized matching city/intent, plus matching live lease/mount token/readiness. Immediately re-read/revalidate native state and the lease, then synchronously call that owning stack's pop(currentIndex-targetIndex), with no async gap. Do not match by pathname only, navigate to a duplicate route, or pop an unrelated stack. If state is undefined, focus/target/lease missing or changed, take ordinary selected-city `/walk` hydration without claiming restored draft settings. No use of a private router import or different React Navigation runtime is required.

On returned controller focus, revalidate content and slot observation before exposing Build; a newly changed current slot enters recovery/offer existing resume, never overwrite. The metadata lease is not storage freshness proof. Actual surviving values remain the controller's original values.

**Forwarding boundary:** CityAssistant currently forwards only a boolean. Supported Hub→assistant→dismissTo-Hub paths must preserve the full validated envelope or deliberately clear it; no partial intent may claim resume. Native POI/Legal/credit round trips back to the same Hub keep that Hub's intent. Main-tab exits, cross-city or deep links that discard the envelope/target get ordinary hydration, not a general draft-resume guarantee. Do not redesign tabs under this contract. Fresh runtime = empty lease map even if route params were restored; a remount gets a new token. Older controller cleanup cannot remove the new lease.

**Conclusion:** current identity is unreliable. This bounded metadata lease plus existing native stack identity is the specified minimal liveness mechanism; it adds neither durable drafts nor duplicate settings ownership. Installed type availability is verified, but actual stack retention, token lifecycle and pop behavior remain future rendered and native-runtime test gates.

## 6. Session-only lifecycle and persistence contract

### Slot classification — required compatible extension

Create a single read/parse/validate path **inside existing walkStorage** returning an observation, not just CurrentWalk|undefined. Proposed names below are specification labels, not functions already added:

| Observation | Meaning | Allowed draft behavior |
|---|---|---|
| empty | Native key absent or existing explicit null tombstone | Initialize new draft once |
| current | Valid matching-city unfinished record + preserved preview/active phase | Resume exact current journey before any 05–08 |
| terminal | Valid matching-city completed record | Do not resume as active; allow a deliberately new draft without deleting history/saved records; retain observed slot for guarded replacement |
| blocked | Malformed JSON, invalid schema, wrong city, unsupported future format/phase | Preserve raw bytes, show Retry/Explore; no Build/replay overwrite |
| unavailable | getItem/read failed | Same safe recovery; never substitute defaults as evidence no current walk exists |

Keep the current missing-nativePhase compatibility behavior (legacy valid record resumes active). Reject unknown explicit future phase for the new guarded flow rather than treating it silently active. Keep existing public loadCurrentWalk compatibility for unrelated consumers while adopting the safer observation contract on affected entry/commit paths; test both. No new namespace, backend schema, migration or second storage layer.

Observation carries an opaque **in-memory slot snapshot** (including exact raw revision internally); it is never a route param, log or persisted extra record. `JSON.stringify(undefined)` comparison through the current reader is insufficient because malformed and absent both collapse to undefined.

### Guarded commit and concurrency

Proposed compatible commit helper in existing walkStorage must execute under its current mutation queue: verify city/schema, re-read exact raw slot and compare to the observed snapshot, validate cancellation/intent scope, then write preview only if unchanged. Use the same path for new Build and affected saved-replay preview creation. No changes to saved/account linkage preservation in writeCurrent. Existing startCurrentWalk/clearCurrentWalk identity guards remain and must not be bypassed.

A changed current slot yields conflict, preserving it and retaining the unbuilt fields. Offer Retry/re-read and supported existing-walk resume/browse recovery; no automatic overwrite, clearing or silent restart. All mutations in the scope must share the existing queue. This is **single-JS-runtime** serialization, not a database transaction or cross-process/device CAS guarantee. No unsupported global sync claim.

### Build lifecycle

Before Build accepts a tap, acquire a synchronous build-specific ref lock and immutable input/observation snapshot. Maintain the real existing layout/presentation waits and a request-generation ticket. Pre-commit cancellation/unmount/changed scope invalidates the ticket and causes no write. If an explicit Build has already started its actual storage write, it cannot claim an atomic cancellation/rollback: a successful preview may remain persisted after leaving; suppress stale UI/navigation and never start Active Walk. Failed writes must not show success; release lock in finally. Retry must reuse truthful current input/slot inspection, not duplicate a generated session.

### Existing current, saved and add intents

| Intent | Required behavior and side effects |
|---|---|
| No saved/add; valid current preview | Resume preview and bypass 05–08; no start or fresh generation |
| No saved/add; valid current active | Resume active with exact journey; preserve current eligible/completed-return handling; do not silently fall into fresh-draft overwriting if catalog is inconsistent |
| Explicit saved local/account/legacy record | Resolve requested record and city/account access; replay via existing reopenSavedWalk(new session ID): reset visited/history/start time, restore ordered full itinerary, clear finishedAt and old absolute deadline, preserve source saved record/link. Preview only, bypass 05–08 |
| Saved record missing/unavailable/account read failed | Distinct recovery for requested route; do not initialize new draft under the unresolved saved ID or silently switch to guest route |
| Saved replay would replace a different unfinished current slot | Pause replay; preserve both; offer existing resume / return to saved list. Replacement requires existing explicit confirmed new-walk/replacement policy in separately accepted scope, not a hidden hydration write. No new destructive replacement control in S08 |
| `add` intent | Preserve existing eligible added-stop proposal/current membership flow and manual/new legacy add behavior; no forced S08; invalid/missing place reports recovery |
| Explicit Customize | Existing journey retained; hydrate settings once into editing controls. No new-draft cursor, no 05–08 replay, no silent history reset |
| Explicit confirmed Rebuild | Keep requestRebuild, compare-and-clear and native live cleanup. Then fresh values/cursor through new flow if appropriate. Do not call rebuild from S08 primary, Back, failed hydration or tab changes |

Saved replay's transformation and old deadline clearing are preserved. Its existing unconditional replacement write is a concrete safety gap to close at the guarded-commit boundary, not a new authentication/personalization system. These compatibility changes require technical acceptance and tests before product edits.

Session-only settings remain only while the controller is mounted. Backgrounding without process death retains them; killing/replacing the process does not. Re-enter after death performs normal slot hydration, not token-based reconstruction of an unsaved draft. No automatic account-default save, AsyncStorage draft, GPS persistence or completion flag is introduced.

## 7. Manual/GPS/finish, duration and return-by invariants

- Manual start resolves selected place coordinates; GPS mode uses only an accepted current request result or existing explicit editing coordinate semantics. No accepted point means Build rejects GPS start. Denied location always leaves manual controls.
- Loop computes finish=start; destination requires a real selected finish point; anywhere keeps finish undefined. Return-by does not silently change finish mode or infer a return destination the user did not choose.
- Build snapshots existing WalkSettings exactly: minutes, optional deadline, start/finish, interests, categories, walking. Preserve supported walking caps, category eligibility and visit estimates in shared planner; do not copy algorithms into UI.
- Keep canonical planner cards 60/120/180/240 and hydrated 90 without coercing to account style. Control moves do not drop a field or replace it with account defaults.
- `deadlineForToday` normalizes digits and returns an absolute future timestamp for local today. On explicit picker selection/reconfirmation record local civil day + time-zone (or equivalent resolved offset/zone context) in controller-only deadline intent; clear both when input clears. A midnight/day/time-zone change invalidates that intent and requires explicit reconfirmation of the visible HH:MM. Do not reinterpret yesterday's value as a fresh today/tomorrow deadline. Existing saved replay intentionally clears deadline; Customize seeds intent from its existing absolute deadline and rejects an expired time at Build.
- The actual build still calls shared deadline/budget/finish-leg logic at tap time. Blank time means no deadline. Expired/invalid start/destination/deadline leaves constraints with feedback, never a fake route. Preserve picker reopen restoration.
- Estimates remain coordinate-distance walking estimates plus visit time/finish leg, not verified pedestrian geometry, transport return calculations or guaranteed arrival. Existing Start has identity/content guards; no new safe-arrival guarantee is inferred by this contract. A separately requested Start-time replan/expiry policy is outside S08.

## 8. Invariants required for acceptance

1. No new route/auth/location system, planner algorithm, taxonomy, tab ownership or data activation.
2. One controller owns values; view/cursor/route-marker updates never overwrite them.
3. Current journey and explicit saved intent resolution precede new-draft display; read failure is not absence.
4. Primary 08 never pushes Hub, builds/persists or starts execution.
5. Secondary browsing is optional; it preserves only a verified mounted draft, not a durable promise.
6. Interests are automatic once for a new draft; explicit edit/Back review is intentional and has a defined return target.
7. All useful legacy controls remain functional; start/finish, categories/walking and return-by reach shared settings unchanged.
8. Back/permission late results/repeated taps never clear a valid record, silently switch city or create duplicate drafts.
9. One explicit Build request can commit at most one preview to its unchanged observed slot. No late unmounted UI/navigation updates.
10. Explicit Start only; saved replay remains preview, custom versus published domains stay distinct.
11. No raw settings/GPS/storage bytes in return intent/URLs/logs; opaque markers are not auth capabilities.
12. Original UX approvals and all D01–D14/Screen 14 pending decisions stay unchanged; actual footer/native/accessibility evidence is still pending.

## 9. Exact prospective file boundary and dependency order

| File | Necessary future responsibility | Boundary |
|---|---|---|
| mobile/src/components/NativeWalkFlow.tsx | New-draft cursor/mode/edit return; one transition decision; retained values/deadline day metadata; build/permission tickets; safe hydration and guarded commit integration | Do not redesign other approved views or rewrite shared planner |
| mobile/src/app/city/[citySlug]/walk.tsx | Normalize route scope incl. saved source; keep locale/marker changes from remounting; pass/use native route-instance scope | Existing city hooks/API/availability unchanged |
| mobile/src/components/FirstExperience.tsx | Planning callback + optional browse callback/footer | Preserve photo/headline/editorial UI; new footer needs future native acceptance |
| mobile/src/lib/firstExperienceCopy.ts | Typed primary copy for EN/DE and all existing NativeLocale entries | Do not break Record<NativeLocale,...>; preserve existing locales, honest copy and RTL |
| mobile/src/app/city/[citySlug]/index.tsx | Strict return-envelope validation and exact native pop; ordinary Build unchanged when no envelope | Hub visuals/tabs unchanged |
| mobile/src/app/city/[citySlug]/assistant.tsx | Preserve complete validated intent on supported existing fallback forwarding, or explicitly clear | No city-wide guide feature or new answer API |
| mobile/src/lib/plannerReturnIntent.ts (NEW, proposed only) | Ephemeral metadata-only live lease + validated return-envelope/stack resolution, reusing routing.ts parsers | No settings/journey/GPS storage or persistence; cold runtime has no lease |
| mobile/src/lib/walkStorage.ts | Single observation/parse path and guarded preview commit under existing queue | Keep namespace/serialization/linkage/callers; no migration or hidden deletion |
| mobile/tests existing rendered/navigation/storage suites | Proposed regression cases in companion document | No tests edited or executed in this read-only review |

Order: verify/accept observation and live identity contracts → authorize meaningful red regressions → compatible storage/identity groundwork → controller transitions/legacy-control composition → S08 footer/localization → focused regression gate → actual iOS/Android/assistive-technology acceptance. No step is authorized now. The source changes above are technical dependencies for review, not owner approval to implement them or broader D groups.

## 10. Regression and evidence status

See [REGRESSION-CASES.md](REGRESSION-CASES.md) for exact fixtures/actions/outcomes and test seams. All new cases are **SPECIFIED / NOT IMPLEMENTED / NOT RUN**. The previous approval record's 117 existing tests are explicitly old-behavior evidence (some assert the Hub push and boolean return). No new native captures, full tests/builds, CI, migration or provider acceptance was performed. The installed native-stack types also expose gestureEnabled (types.d.ts:558); this is the scoped internal-step gesture guard contract, not runtime evidence.

Read-only verification: source/type excerpts + hashes, all product/test files unchanged, prior decisions/approval snapshots unchanged, document/link validation and diff whitespace only. Native stack identity/marker ordering and proposed error recovery cannot be proven by inspecting types; they remain future regression and simulator gates.
