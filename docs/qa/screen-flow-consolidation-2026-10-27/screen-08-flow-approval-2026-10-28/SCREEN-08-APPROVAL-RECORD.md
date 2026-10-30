# Screen 08 — owner approval record

**Decision date: 28 October 2026 · UX/FLOW: APPROVED · IMPLEMENTATION: NOT AUTHORIZED · EXECUTION: NOT IMPLEMENTED**

Authority: the owner's explicit message “CITYWALK — Screen 08 Flow Design Approval,” approving the PROPOSED flow described in SCREEN-08-FLOW-REVIEW.md. This is a documentation update only. No app/test code, storage, database, branch, payment or infrastructure changes.

## Approved specification and preservation

The exact reviewed specification is preserved as [SCREEN-08-FLOW-REVIEW.approved-specification.md](SCREEN-08-FLOW-REVIEW.approved-specification.md); its SHA-256 is recorded in [owner-approval-event.json](owner-approval-event.json). The current review page/document now shows UX approval while keeping implementation unauthorized. Pre-update consolidation and review documents are archived under `previous-documents/`, including their prior integrity manifests.

The original owner's JSON remains byte-for-byte unchanged. **S08's original worksheet choice remains REBUILD FLOW**, with its original empty note. UX approval is recorded as a separate dated event; it does not rewrite that selection. The other S decisions are unchanged. D01–D14 remain PENDING. Screen 14 remains PENDING / not visually approved.

## Approved behavior

1. Ask interests once, with repetition only through an explicit Edit Interests action.
2. After Screen 08, Continue Planning advances directly into the remaining planner constraints in the existing city-scoped controller.
3. Explore [city] remains an optional secondary browsing exit. It is no longer a mandatory Hub detour.
4. Back preserves current selections and does not replay completed introductory steps unintentionally. Explicit review/Back to an earlier step remains deliberate.
5. Existing current walks resume without Screens 05–08. Existing saved-route replay remains a separate preview session rather than pretending to resume old execution/deadline.
6. Preserve manual/GPS start, finish/loop/destination, category filters, walking preference, duration and walking-based return-by constraints.
7. Explicit Build creates the route preview; Screen 08 does not generate a route.
8. Explicit Start begins Active Walk; neither browsing nor confirmation starts execution.

## Status ledger

| Gate | Current status | Meaning |
|---|---|---|
| S08 UX/navigation design | **APPROVED** | Owner approved the referenced journey, not product edits |
| Original S08 UI design | Previously approved and preserved | New primary/secondary footer has no implemented visual capture yet |
| Implementation permission | **NOT AUTHORIZED** | No UI, controller, storage or test code edits are allowed now |
| Technical dependency specifications | Prepared; review/acceptance pending | See next proposal and verification matrix |
| Existing baseline tests | **117 passed / 8 files** | Current implementation only; includes legacy Hub-return assertions |
| Approved-flow regression tests | **NOT EXECUTED — not implemented** | Cannot claim green evidence for the proposed transitions |
| English/German proposed footer and accessibility | **PENDING** | Copy specified; actual rendered/assistive-technology evidence required |
| Small iPhone / Android layout acceptance | **PENDING** | No new layout or native capture has been produced |
| Durable unbuilt draft storage | Outside smallest proposed slice | Existing mounted session state is retained; no process-death promise |
| D01–D14 / Screen 14 | **PENDING** | No broader consolidation/execution approval inferred |
| Commit / push / PR / merge / deployment / deletion | **NOT AUTHORIZED** | No action performed |

## Existing baseline verification

Ran only unchanged existing tests:

```text
npm run test:run -- tests/first-experience.test.tsx tests/walk-flow.test.tsx tests/city-hub-actions.test.tsx tests/location-permission.test.tsx tests/select-interests.test.tsx tests/available-time.test.tsx tests/return-by-picker.test.tsx tests/walk-storage.test.ts
```

Result: **8 test files passed; 117 tests passed; exit 0**. [Raw log](logs/current-baseline-tests.log). Native bridges and services are mocked in these suites; they do not establish simulator/device layout acceptance, provider behavior or the new flow. In particular, current walk-flow tests explicitly expect the old Screen 08 Hub push and current Hub tests use `returnToPlanner` + `canGoBack`; those tests must evolve after authorization to verify the approved behavior and stronger identity checks.

## Next gate

Review [NEXT-IMPLEMENTATION-PROPOSAL.md](NEXT-IMPLEMENTATION-PROPOSAL.md) and [PREIMPLEMENTATION-VERIFICATION.md](PREIMPLEMENTATION-VERIFICATION.md). The next proposed authorization is a narrowly scoped technical-contract/test phase, followed by separately authorized product implementation—not a code merge or a whole-app consolidation. All seven prerequisite areas remain open until their future evidence is recorded. No existing baseline pass closes them by implication.
