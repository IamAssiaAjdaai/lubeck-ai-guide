# Screen 08 Slice 02 — final integration readiness review

**29 October 2026 · Verdict: CONDITIONAL · Read-only review; implementation NOT authorized**

The storage prerequisite is **satisfied for the tested single-JavaScript-runtime boundary**. Slice 02 can be proposed within the existing seven-file production boundary. No additional storage dependency is required for non-overwrite safety. This verdict does not mean the proposed navigation is already implemented, device-accepted or release-ready.

Conditions for the next implementation authorization: explicitly approve Slice 02 and the five named stronger test-contract replacements; preserve the storage contract and Slice 01; implement and verify the real native navigation adapter, retained controller state, focus recovery and Screen 08 footer. Do not treat a valid return lease as proof that storage is unchanged. Native gesture/stack/parameter-merge behavior still needs actual acceptance before closing the slice.

## Reviewed revision and evidence

Worktree: `/Users/assia/Documents/GitHub/citywalk-onboarding-global-welcome`; branch `codex/onboarding-global-welcome`; HEAD `98a1dbbda17f945a0d982eb6dbc36713bad61617`, with existing uncommitted work. All **1,053** recorded product/test/asset/configuration hashes match the verified storage revision. The dirty source manifest, rather than HEAD alone, identifies this review. [Evidence](REVIEW-EVIDENCE.json), [source hashes](SOURCE-HASHES.json), [validation](VALIDATION.md).

Reviewed [final scope](../screen-08-slice-02-gates-2026-10-29/SLICE-02-FINAL-SCOPE.md), [proposal](../screen-08-slice-02-plan-2026-10-29/SLICE-02-PROPOSAL.md), [flow](../screen-08-slice-02-plan-2026-10-29/FLOW.md), [test contract](../screen-08-slice-02-plan-2026-10-29/TEST-CONTRACT-REVIEW.md), [native acceptance](../screen-08-slice-02-plan-2026-10-29/NATIVE-ACCEPTANCE.md), both gate decisions, technical contract, regression ledger, actual source and [storage implementation report](../screen-08-storage-safety-2026-10-29/REPORT.md). Historical proposal language saying the storage prerequisite is unimplemented is superseded by the verified storage evidence; historical artifacts are preserved.

Targeted GitHub preflight refreshed issue #424 (zero comments; last updated 23 October), develop `9f8470077dfa8eb7663246905bffd3cf8a0c6591`, main `88191e77e55a489804c49bccccf6307b5876b41d`. The owner's newer explicit restrictions govern this task. No remote branch changes or same-dirty-revision CI are claimed.

## Eight readiness checks

| Check | Actual current source / conclusion |
|---|---|
| Classified observations | Satisfied: `walkStorage.ts:79–120` distinguishes empty, current, terminal, blocked and unavailable. Blocked includes malformed, invalid-schema, wrong-city and unsupported-phase records. Read failure is unavailable, never empty. `finishedAt !== undefined`, including zero, identifies terminal records. |
| Guarded preview writes | Satisfied: `commitCurrentWalkPreview` at line 122 verifies receipt city/store/exact raw bytes in the queue, checks intent and controller validity, snapshots input, consumes receipt at the write boundary, then rechecks bytes and validity before writing. New/replay cannot replace unfinished current; Customize requires the expected current identity. |
| Real consumers | Satisfied: NativeWalkFlow observes before initialization; guarded Build and saved replay use the receipt. Current preview/active hydrate without replay. Saved replay collision offers recovery/resume instead of overwriting. Read/corrupt/stale/write failures retain inputs and use explicit recovery. |
| Lease vs freshness | Compatible, not yet integrated: `plannerReturnIntent.ts` is metadata-only and pure on resolve. Actual native route key plus per-controller token identify a mounted draft; storage receipt separately conditions a write. Neither is a saved journey ID or authentication capability. |
| Continue / Back / Edit | Feasible within existing state owner, not implemented: keep live values in NativeWalkFlow; add one new-draft cursor and optional edit-return marker. Do not use route params, a second store, or hydration to restore those selections. |
| Legacy controls / guest / resume | Current controls and guest paths remain intact. New integration must distinguish eligible new drafts from legacy planner, add, Customize, current resume and saved replay. `previewIntent === "new"` alone is insufficient because legacy planner also uses it. |
| Five assertions | All five original case contexts remain verbatim. Precisely bounded future migration below; no tests changed now. |
| Frozen visuals / acceptance | No required restyling of 01–07 or 09–13 identified. Only approved 08 footer semantics change; retain its hero, typography, crop, attribution and supporting copy. New footer and unnumbered remaining-constraints composition require native acceptance. |

Storage guarantees are queued compare/write within one runtime, not cross-process CAS. Already-issued asynchronous native writes cannot be rolled back by later cancellation. Generic `persistCurrentWalk` and legacy `loadCurrentWalk` remain compatibility APIs; new preview integration must use the guarded contract, and must not infer absence from the legacy reader's `undefined` result. No storage migration, new namespace, durable draft, overwrite consent, or new storage dependency is proposed.

## Exact proposed production boundary

These are files eligible for a **future explicit authorization**, not permission to edit them now.

| File | Only permitted responsibility in proposed Slice 02 |
|---|---|
| `mobile/src/app/city/[citySlug]/walk.tsx` | Validate city/saved/source/add intent; pass actual native route key; normalize controller identity without locale or return markers. Existing key includes city/saved/add but omits source; use the frozen helper contract, not a new identity system. |
| `mobile/src/components/NativeWalkFlow.tsx` | New-draft cursor, retained Back/Edit state, direct constraints, real publication/revocation/browse ticket, focus safety, preserved storage recovery and separate legacy/current/saved/add/Customize modes. |
| `mobile/src/components/FirstExperience.tsx` | Independent Continue Planning primary and optional Explore city secondary callbacks in the approved footer only. |
| `mobile/src/lib/firstExperienceCopy.ts` | Exhaustive planning label in all seven existing locales; retain existing copy. |
| `mobile/src/app/city/[citySlug]/index.tsx` | Complete intent parsing, focused owning-stack validation/revalidation, exact single pop dispatch or truthful ordinary planner fallback; complete assistant envelope. Keep approved Hub visuals. |
| `mobile/src/app/city/[citySlug]/assistant.tsx` | Parse and forward the full same-city envelope through existing discovery dismiss; fully clear invalid context, including actual merged native params. Final Hub validation remains mandatory. |
| `mobile/src/lib/plannerNavigationCopy.ts` — new, proposed | Small exhaustive UI-only Edit/summary/recovery copy. No state, routing runtime or domain ownership. |

Freeze `walkStorage.ts`, Slice 01 helper and its tests, route/domain/backend/auth/payment contracts, other screen styles/assets and root navigation. Canonical saved links use `source: "account"` or omit source; no need to extend the helper to an invented local source. Use existing Expo Router navigation context, not an additional provider. If another production file or public storage API is needed, stop and review that expansion first.

Tests may add real adapter/assistant integration coverage and update the existing behavior, Hub, FirstExperience, native-v2, editorial and pending-ledger suites as necessary. Only B01–B05 authorize prospective assertion evolution; all unrelated assertions stay. Preserve original evidence and do not fake a cursor/native pop/helper just to satisfy a mock.

## Required transition and lease contract

1. Enter new-draft mode only for onboarding entry, healthy empty/terminal observation and no existing journey, saved replay or add intent. Preserve existing account/guest initialization once. Existing unfinished current restores its exact phase; saved replay creates a separate new preview only when the observed slot permits it.
2. New-draft cursor: interests → time/return-by → optional location → confirmation (08) → **constraints**. Continue Planning moves directly to constraints without Hub, repeated interests, preview write or Start. Keep existing walking style, dynamic category filters, manual/GPS start, anywhere/loop/destination, duration and walking return-by.
3. Internal Back: constraints → confirmation → location → time → interests. Edit Interests from constraints returns to constraints on Continue, Skip or Back, preserving all other fields. Handle modal priority, Android Back and iOS gesture guard. Ordinary native exit remains possible from the genuine entry boundary.
4. Optional Explore reserves one browse ticket, commits constraints, then publishes a ready lease for the actual controller route key/token and normalized new-draft scope, and pushes one Hub. A second tap cannot push another Hub. Do not publish while still rendering confirmation or during recovery. Direct Continue does not need a Hub detour.
5. Hub Build parses all five envelope fields, requires the focused final owning stack, exact target route/scope and a live ready lease. Re-read and re-resolve immediately before one synchronous stack-targeted pop; no asynchronous gap, cached target, global boolean Back or replacement draft. Validate intermediate-screen pop counts as well as one-level return.
6. Helper resolve does not consume anything. Consume/invalidate the browse ticket and revoke the matching lease when used; revoke readiness on leaving eligible constraints, Build, recovery, scope/content invalidation or unmount. Blur behind the supported browse Hub alone must not revoke the retained controller. Re-publication, if needed later, follows a fresh healthy constraints commit. Reconciliation requires a complete live route-key inventory, not a child stack snapshot.
7. Invalid, stale, cold-runtime, wrong-city/key/token or missing target cannot authorize a pop or promise restored unsaved settings. A focused ordinary Hub may take its normal planner path; an inactive handler must not navigate. Saved/current hydration then remains truthful. Forwarded assistant params alone never prove liveness.

### Storage/focus rule that integration must preserve

Do not add cursor, locale, focus or return-envelope changes to the hydration dependencies. Do not call hydration `storageRetry` on normal return: that can reapply defaults or replay a saved route. Maintain the existing request epoch/ticket protection across genuine scope changes and explicit recovery.

On focus return, perform a non-destructive classified observation and content-readiness check before enabling Build. Current, blocked or unavailable results enter retained-input recovery and revoke readiness. **Keep the original draft receipt for final queued commit**; do not silently adopt a newly observed empty/terminal receipt. Each observation issues a distinct opaque receipt, so JavaScript object equality cannot prove slot freshness. Same-kind byte changes may be rejected only at final commit. This limitation does not permit an overwrite; it means focus alone cannot promise exact byte freshness.

There is currently no public pure receipt-validation API. A requirement to prove exact raw-byte equality before Build, rather than at the existing guarded commit, would need a separately reviewed boundary expansion. No such API is required for the current non-overwrite contract. Explicit Retry after a rejected/uncertain attempt remains the existing recovery operation: re-observe, recognize an already-written attempted preview, or offer Resume/discovery on conflict. Do not silently drop inputs or treat a read error as missing data. Make its legacy numeric-step reset mode-aware through the new cursor without changing legacy behavior.

## Exact legacy assertion migrations — proposed, unchanged now

Current lines below refer to the reviewed dirty revision; [verbatim contexts and hashes](LEGACY-ASSERTION-INVENTORY.json) preserve exact originals.

| ID / source / case | Old expectation | Required stronger replacement |
|---|---|---|
| B01 — `mobile/tests/city-hub-actions.test.tsx:215`; `returns only Screen 08 city entry to its retained planner (%s, %s)` | Boolean flag plus canGoBack allows one global Back. Three parameter rows. | Positive fixture must supply an actual ready lease and full envelope; assert exact owning stack/source/target and pop count (one and multiple levels), one dispatch, zero global Back/new draft push, retained real values and zero write/Start. Retain both original negative rows and add bare-flag/canBack=true, stale/wrong/missing/inactive cases. Do not auto-publish leases for negative fixtures or alias pop to the old Back spy. |
| B02 — `mobile/tests/walk-flow.behavior.tsx:1273` (historical 1252); `Screen 08 preserves onboarding without generating a walk > supports Back through location/time/interests and retains choices after city entry` | Exact Hub push with only city/boolean, then extra legacy Continue before Build. | Exact complete five-field envelope from the real route key/token; one push only after constraints commit/publication. Preserve all food/180/deadline, Back, no-GPS/no-premature-write assertions and actual resulting settings. Replace the obsolete extra Continue action with real retained constraints return; no dummy UI action for the test. |
| B03 — `mobile/tests/city-hub-actions.test.tsx:236`; `carries the retained-planner entry through the Guide fallback route` | Exact assistant link carries city/boolean only. | Exact full same-city version/key/token envelope. Malformed/bare/other-city input clears all return context. Keep exact-object equality; forwarding is syntax, final Hub still validates liveness. |
| B04 — `mobile/tests/native-v2-regressions.test.tsx:457`; `dismisses the Guide fallback to the same hub while retaining its planner return context` | Boolean prop produces Hub link with city/section/boolean. | Typed full envelope, exact Hub destination and existing `dismiss=true` assertion preserved. Invalid/bare/direct entry clears every return marker, including native merged params; verify one Hub and final real return, not only a link's data attribute. |
| B05 — `mobile/tests/city-hub-editorial-v1.test.ts:44`; `Screen 09 integration boundaries > preserves virtualized places, actual tours, account ownership and planner navigation` | Source must contain the literal boolean condition. | Replace only that source-spelling expectation with linked real valid/invalid return behavior in B01/I01–I03. Keep the case and account ownership, real tours, virtualization, location and no-invented-copy assertions. No dead literal/comment or vacuous source check. |

Five assertion sites in four files; seven executed expectations because B01 has three rows. The exact prior assertions cannot remain as contradictory positive boolean contracts once behavior changes; owner authorization must explicitly include this bounded migration. Do not delete, skip or relabel these cases as TODO to get green. Unrelated Back and existing negative regression coverage remains.

## Regression conversion and next tests

Current exact-source evidence is reused, not rerun for this read-only task: **1,039 ordinary passes, nine expected-failure variants, 17 TODOs, zero unexpected failures (1,065 tests)**. The 47-case contract ledger is **18 passed / eight expected-failure cases / 20 pending / one blocked**. Expected failures are known failures, not functionality passes.

Storage already converted S02/S04/S05/S07/E03/E04 and activated S01/S03/S06 after real behavior passed. Do not count them again as navigation gains. Existing evidence includes 37 new storage unit cases and 11 controller cases; all 318 original assertion chains, five legacy contexts, Slice 01 and frozen 05–08 callback/render blocks were preserved by the prerequisite.

Future Slice 02 conversion targets: **T01, T02, T05, I02, I03, I08, A01 EN and DE** — seven cases/eight variants, only after every real assertion passes. **D03 remains expected failure**. D04 time-zone intent and D01 day/zone metadata remain pending; these technical case IDs are separate from owner decisions D01–D14, which remain pending.

Activate full R01–R04, T04/T06/T07, I01/I04/I05/I06/I07, E06, C01 and G04 variants where technically feasible; do not mark partial G01–G03 storage coverage as whole-flow acceptance. Native A02 remains blocked until actual device evidence. Keep Slice 01's 11 ordinary passes and pending adapter integration visible.

Next regression requirements:

- Real controller and native adapter: direct Continue, normal Back chain, Edit Continue/Skip/Back, skipped values, all controls retained including hydrated 90 and changed 240 budgets; only explicit Build generates and Start executes.
- Lease lifecycle: commit ordering, double taps, token-conditional revoke, full stack inventory, one/multi-level targeted pop, wrong city/key/token, duplicate same-city controller, removed target, cold start, stale/inactive handler, assistant dismiss param merging.
- Focus/storage: changed current during browse, read error/corrupt record, same-kind changed bytes, no receipt refresh bypass, late GPS/content/network result after invalidation, uncertain write explicit Retry, no duplicate candidate/write/Start.
- Guest and existing authenticated session without auth changes; current preview/active exact restoration versus explicit saved replay and source linkage. Legacy add/Customize and no-onboarding planner remain distinct.
- Frozen visuals/callbacks and exhaustive locale copy; no account/location requirement, no new city/route data or transport features.

Prior exact-source TypeScript, standard Expo lint (zero warnings), seven-locale/681-key i18n and iOS/Android Hermes exports passed. Optional strict changed-test lint reported five pre-existing `import/first` warnings and exited 1; no new errors. The prerequisite documented one narrow existing Start-event purity exception while preserving its runtime AST. Exports are unsigned bundle checks, not native acceptance. No new lint/test/build/device runs are claimed here; full relevant gates must run again after integration changes.

## Native acceptance and remaining limitations

Use the [existing native acceptance matrix](../screen-08-slice-02-plan-2026-10-29/NATIVE-ACCEPTANCE.md) against the exact integrated dirty-source manifest, actual bundle and API environment. Standard iPhone 402×874 and small 375×667, English/German default and maximum accessibility text; narrow Android with recorded dimensions, hardware Back and TalkBack; iOS swipe guard, VoiceOver, keyboard/time picker, safe areas and scroll reachability. Smoke-check existing RTL and all seven copy variants. Capture footer, constraints top/bottom, Edit and retained Back/Hub-return values. Preserve approved original captures as comparison anchors.

Verify genuine native focused-stack pop and assistant dismiss merging, not only mocked DOM links. Repeat existing authenticated and guest sessions separately. No live auth, spoken screen-reader, interactive simulator or Android/device acceptance is supplied by the prior storage exports or this review. Unsaved drafts are session/controller-only; process death cannot restore them from a lease. Current storage is not a durable planner draft or cross-runtime lock. Midnight/time-zone defects remain separately tracked; no whole-flow time-integrity or release claim.

## Stop and owner decision

Recommended next decision: authorize **only** seven-file Slice 02 navigation integration plus the specified B01–B05 stronger migration and relevant tests, preserving verified storage and Slice 01. Require the focused/full mobile gates and native acceptance above before closing it. Review any required boundary expansion before implementation.

This task changed documentation only. No production/test implementation, legacy deletion, commit, push, merge or deployment. Approved Screens 01–13 remain preserved; Screen 14 and owner decisions D01–D14 remain **PENDING**. No Screen 15 or subsequent slice is started.
