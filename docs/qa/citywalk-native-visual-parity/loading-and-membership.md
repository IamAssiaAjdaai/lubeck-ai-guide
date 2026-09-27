# Native loading and walk membership audit — 2026-09-25

> **Historical report; status reconciled 2026-09-27.** The owner subsequently accepted membership/Add stop, navigation and Start/Save/Rebuild within the recorded iPhone scenarios. Map rendering and every asynchronous failure path are not thereby accepted. See the [current acceptance ledger](README.md#current-checkpoint-status--2026-09-27). Implementation is now in Commit 1; no new device/build/deployment evidence is claimed by this documentation cleanup.

Scope: `fix/citywalk-native-device-acceptance`, native iOS/Android only. Updated after the physical Arabic follow-up: centralized RTL composition and Profile cleanup are documented in [arabic-physical-polish.md](arabic-physical-polish.md). Accepted Back, Ask, Read/Listen, active-tab behavior and planner progress remain intact. No Web, backend, shared planner, dependencies or build/signing configuration changes.

## Loading flow inventory

| Actual flow | Component/state | Completion / recovery |
| --- | --- | --- |
| Global Home / city index | `CitywalkLoading variant="home"`, city-card skeleton and localized city-fetch label | `usePublicCities`; `ContentRecovery` Retry / Home on failure |
| City Hub / Explore / city places | `CitywalkLoading variant="city"`, hero/text/card skeleton | `usePublicCity`; Retry / Home; list/map switching is immediate |
| Place Detail | `CitywalkLoading variant="place"`, hero/text skeleton | `usePublicPlace`; Retry / Back to city |
| Published tour | City content skeleton | City fetch Retry / Back to city; missing tour has empty state and navigation recovery |
| Planner content fetch | City skeleton with specific walk-content label | Fetch Retry / Back to city |
| Current walk restoration | Compact content skeleton with restoring-walk label | Reads local current preview/active record; storage failure exposes error and planning recovery |
| Planner generation | Existing `V2Loading`: matching interests → checking walking time → fitting schedule → choosing stops | Real `buildWalkSteps` stages and existing native presentation lifecycle; no synthetic percentages or new delay. Failure/no-route uses `V2WalkError` with retry/edit/back |
| Preview → Start Walk / visit / adaptation confirmation / finish | `PrimaryButton busy`: retained label + inline spinner, disabled until the local write settles | Enter next state only after successful storage; failure retains route and offers the same action to retry. Proposal write errors also appear inside the sheet |
| Save walk / save place / remove saved item / finish feedback | Local busy indicator; retained screen content | Storage failure message; same action can be retried. Saved removal is guarded against repeat taps |
| Current-walk membership lookup / add / remove | `WalkMembershipControl`: Checking your walk / Adding… / Removing… | Real persisted membership; storage error offers Retry or retains the action for retry. Budget/eligibility rejection offers Customize |
| Saved / Trips first restoration | Compact skeleton with saved-items label | Read recovery offers Retry / Home; focus refresh keeps current content visible |
| Account/session and account saved trips | Compact account/saved-items skeleton | Authentication actions use inline busy. Sign-out errors are visible; saved-trip read failure has Retry rather than pretending the list is empty |
| City-level Ask CITYWALK | Immediate existing assistant heading and explicit city-assistant unavailable state | No fabricated place context or service; native Back returns to city |
| Place-level Ask CITYWALK setup | Immediate Ask heading, localized preparing-assistant text and `InlineLoadingDots` | Loads place/eligibility/conversation; content failure offers retry/back; unsupported knowledge has unavailable state |
| Place-level AI question | Existing chat bubble with localized thinking text and `InlineLoadingDots` | Actual response replaces thinking; existing retry/limit/unavailable handling stays intact. Current transport returns completed responses, so no fake token streaming was added |
| Explore / route map | Map-shaped `NativeCityMap` placeholder with map icon and progress label, confined to map rectangle | Native fully-rendered callback removes it; native error or existing 30-second timeout shows map-specific failure + Try again; itinerary remains usable |
| City/place/itinerary photos | `NativeContentImage`: bundled neutral placeholder + existing 220ms component fade | Approved image → same-content published fallback → labelled unavailable placeholder. Existing external media 502 is not hidden or bypassed |
| Audio | Player-local loading/buffering button, track retained | Error offers Retry, which recreates the player; written place content remains available |
| GPS | Existing requesting button label / inline busy | Existing permission/provider/offline recovery; no full-screen route loader |
| Warm navigation | Existing locale-keyed public content cache | In-memory content is rendered on the first render; stale data remains visible during refresh. No route-wide artificial loading gate |
| Share / directions | Existing native share sheet / external navigation handoff | Platform presentation, not a full-screen app loader; existing failure message |

All asynchronous primary buttons retain their label while busy. Map/photos/logo orientation remains unchanged; Arabic composition uses the centralized presentation helpers. No generic full-screen “Loading…” was introduced.

## Membership source of truth

- One city-scoped current record backs Detail, planner/preview, Active Walk, Explore/City Hub actions and Saved place membership badges. Visited stops also count as members until explicitly removed or the walk finishes.
- Preview generation persists a `preview` record. Start Walk changes it to `active` only after the write succeeds. Legacy active records remain readable; the existing storage key is preserved, with an optional native-only phase field for previews.
- Adding from Detail or Explore with no current walk creates a one-stop preview using the planner's existing 120-minute/history/architecture/balanced defaults. It does not start a trip. Subsequent additions use the shared eligibility, remaining-time/deadline and route-measurement rules. Rejected additions keep the route unchanged and offer Customize.
- Reads and writes normalize duplicate place IDs, including overlap between visited and remaining stops. Read/modify/write operations are serialized across screens, so concurrent additions cannot lose other edits or create duplicates.
- `useCurrentWalk` subscribes to successful writes and rechecks on focus. Initial unknown/read-error states never render an Add button. Failed writes do not publish optimistic success. Late reads cannot replace newer subscription results.
- Preview/active screens subscribe to the same storage events. External edits update the itinerary/current-stop action identity and dismiss proposals computed from an older route. Stale queued route mutations are checked against the persisted record.
- Detail now shows Add to my walk → Adding… → a single inline-check Remove from walk button; the separate visible membership sentence was removed in the later accepted presentation change. Preview/active itinerary members expose the same removal control. Explore exposes the same interactive Add/Remove control outside the place link. Saved place rows expose a live membership badge and open Detail for changes; favorites are independent of current-walk membership. The active Add-stop picker excludes members; start/end planner choices are location choices, not membership toggles.
- Removing updates both visited/remaining membership IDs while retaining route identity, settings, elapsed time and recorded travel distance. Removing the last draft stop is allowed; Start/Save are then disabled with recovery. Existing legitimate return/Finish behavior is preserved. Finishing clears current membership. Saved walk templates remain independent snapshots; opening one establishes a new current preview rather than rewriting all saved templates.

## Regression evidence and device review

Automated coverage uses real membership/storage/subscription logic with mocked native bridges: concurrent duplicate additions, legacy duplicates, visited membership, removal, city scoping, preview/active restoration, rejected additions, failed-write notifications, finish clearing, EN/DE/AR labels, first-render checking, immediate Adding, repeat taps, cross-surface removal/re-add, Preview and Active Walk updates, discarded stale proposals, and failed Start Walk.

Loading tests cover real fetch retry and warm-cache rendering, image placeholder/fade/fallback, native map ready/error/retry callbacks, audio error/retry, real planner progress boundaries and the existing AI thinking/error contract. These tests do not certify physical map tiles, image pixels or device animation timing.

| Platform | Implementation | Acceptance |
| --- | --- | --- |
| Web | Explicit native-only exception; unchanged | No new Web behavior to accept |
| iOS | Shared native implementation and automated coverage | Owner-confirmed membership subset in ledger; broader loading checks remain unverified |
| Android | Same shared native implementation and automated coverage | Physical loading/membership pass pending |

Device checklist: cold/warm Home → city → place; add a place twice; return to Preview and verify one stop; remove via itinerary and reopen Detail; start a walk, edit via Detail and verify current-stop actions; inspect Explore/Saved badges; finish and reopen the place. Repeat representative cases in German and Arabic; review the targeted composition fixes from the latest physical findings. Check offline fetch retry, failed audio/map recovery, image fallback, assistant thinking/unavailable, saved-item removal and fast warm transitions.

No build, export, EAS upload, store submission, commit or push in this round. Existing media/Upstash/map/Stripe external limitations remain external; no new on-device acceptance is claimed.

Final validation: `npm run test:run --prefix mobile` — **262 passed / 41 files**, no unhandled errors; `npx vitest run packages/traveler-core` — **20 passed / 2 files**; `npm run typecheck --prefix mobile` and `npm run lint --prefix mobile` — passed (zero lint warnings); `git diff --check` — passed. The final full mobile suite ran independently after correcting bridge expectations and a retry-hook lint warning; earlier overlapping runs timed out under contention. Test timeouts were not increased.

Historical physical image investigation and the seven actual Explore/Detail membership regressions: [Arabic follow-up](arabic-physical-polish.md). The image check distinguishes a content skeleton from the image-local placeholder, confirms the published photo success path and the then-failing approved city media, and leaves the exact physical placeholder observation pending.

Historical follow-up validation superseded the earlier counts above: **290 mobile tests / 43 files**, **20 shared tests / 2 files**, mobile TypeScript, lint (zero warnings) and diff whitespace check passed. No unhandled test errors. Later owner acceptance is scoped in the current ledger; Android and unanswered loading checks remain unverified.
