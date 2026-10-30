# Gate 2 — obsolete Back assertions and stronger replacements

**29 October 2026 · Complete current-source inventory · Proposal only**

Inventory: **five assertion sites across four files**—four behavior sites and one source-text coupling. B01 is a three-row parameterized case, so these sites produce seven existing assertion executions (three plus four singles). Only B01's positive row directly asserts unsafe global Back. Other sites encode its boolean-only URL propagation or implementation spelling; they must not all be described as positive Back assertions.

The previous proposal listed four behavior sites. This review adds the source-text assertion in `city-hub-editorial-v1.test.ts:44`. Search covered current `mobile/tests`, `src` and `packages` test/spec/behavior files plus runtime `returnToPlanner` references. Existing valid negative/Back tests and Slice 01 helper tests are identified separately below. All files remain unchanged.

[Verbatim assertions and complete surrounding cases with source hashes](legacy-assertions.verbatim.json). Local line links: [source evidence](SOURCE-EVIDENCE.md).

## Replacement contract shared by these tests

Use the **real** `plannerReturnIntents` singleton and existing versioned parser/normalizer. A valid positive fixture has: city C, actual native walk route key K, controller mount token T, matching normalized fresh-draft scope, a published committed constraints lease, and a complete focused owning native stack with exact earlier `city/[citySlug]/walk` target. Negative fixtures intentionally omit/mismatch these fields. Mock only native navigation/I/O, never the helper or planner transitions.

For a valid Hub return: prevent default `/walk` link, acquire one synchronous press lock, re-read final stack, resolve again with stable owning/source/target/token, call that owning stack's `pop(finalCount)` once, never global `router.back` or a duplicate walk push. Confirm retained real controller settings and no build/persist/Start. For invalid identity on a focused Hub: **no pop and no global Back**, ordinary same-city `/walk` href/default navigation available with no restore claim. For lost focus during the press: no action from the inactive screen. Do not infer validity from canGoBack.

For forwarding, choose one precise policy: **forward a complete syntactically parsed same-city v1 envelope, otherwise no envelope.** Syntactic forwarding is not a live-draft claim: even a complete but expired envelope must fail final lease/stack validation at Hub Build. Do not partially forward the boolean. When a native dismiss/param merge can retain earlier params, explicitly clear all transient fields on the target through supported Expo APIs; merely omitting fields does not prove native state was cleared. Verify that merge behavior natively.

## B01 — parameterized Hub return test

**File/case:** `mobile/tests/city-hub-actions.test.tsx:211–217`, “returns only Screen 08 city entry to its retained planner (%s, %s)”. Assertion at line 215:

```ts
expect(state.back).toHaveBeenCalledTimes(calls);
```

| Original row | Old behavior | Required replacement |
|---|---|---|
| `returnToPlanner="1", canGoBack=true, calls=1` | Any back destination is treated as the retained planner; no key/token/lease/stack proof | Keep the **positive retained-return capability**, but give it a real full-envelope/live-lease/owning-stack fixture. Assert one owning `pop(1)`, zero global Back, prevented default, no duplicate walk push, exact retained settings and no persistence/Start. Add pop(2+) with intermediate supported screens and two same-city draft instances; target exact K/T |
| `returnToPlanner=undefined, canGoBack=true, calls=0` | Normal Hub does not use special return | Preserve `state.back` zero-call assertion, add owning-pop zero-call and exact ordinary `/city/[citySlug]/walk` city href/default behavior. No resume claim even if a different draft is alive |
| `returnToPlanner="1", canGoBack=false, calls=0` | No native Back available, fallback | Preserve zero global Back. Expand to missing native target/state/focus/lease: no pop, ordinary hydration when focused; no action when focus lost. The global boolean alone is irrelevant—an additional positive fixture with a valid owning target verifies exact stack identity is authoritative |

Also retain/add **bare flag + canGoBack=true → no pop/Back**, the existing I03 counterexample. The old positive fixture must not be given a fake lease automatically in shared setup: it is a negative scenario under the approved contract. Split/rename positive and negative rows explicitly so neither intent disappears.

Illustrative replacement assertions (specification only):

```ts
expect(owningNavigation.pop).toHaveBeenCalledTimes(1);
expect(owningNavigation.pop).toHaveBeenCalledWith(1);
expect(state.back).not.toHaveBeenCalled();
expect(pushNewWalk).not.toHaveBeenCalled();
```

Those call assertions alone are not sufficient. Verify the real final resolver input, exact target/mount/stack and retained controller values; no aliasing pop to `state.back` to manufacture compatibility.

## B02 — Screen 08 browse URL / retained values

**File/case:** `mobile/tests/walk-flow.behavior.tsx:1225–1261` (loaded by `walk-flow.test.tsx`), “Screen 08 preserves onboarding without generating a walk > supports Back through location/time/interests and retains choices after city entry”. Exact old assertion at line 1252:

```ts
expect(mocks.routePush).toHaveBeenCalledWith({ pathname: "/city/[citySlug]", params: { citySlug: "lubeck", returnToPlanner: "1" } });
```

**Old:** 08 pushes a Hub carrying only city/boolean and later returns to legacy interests/Continue. The surrounding assertions also correctly check selected food, 180 minutes, return-by, location-free access and no premature write.

**New:** optional Explore first commits constraints and publishes the real lease, then pushes one selected-city Hub carrying the complete v1 envelope; primary Continue planning never pushes Hub. Replace the single exact URL expectation with **exact complete-object equality**, not subset matching:

```ts
expect(mocks.routePush).toHaveBeenCalledTimes(1);
expect(mocks.routePush).toHaveBeenCalledWith({
  pathname: "/city/[citySlug]",
  params: {
    citySlug: "lubeck", returnToPlanner: "1", plannerReturnVersion: "1",
    plannerRouteKey: mountedWalkRouteKey, plannerDraftToken: mountedControllerToken,
  },
});
```

K/T must come from the actual mounted route and controller publication (a spy that calls through the real helper is allowed), not by copying whatever URL the component pushed as its own oracle. Check publish-before-push order and cursor=constraints, double tap/Strict Mode one push, exact allowed keys with no settings/GPS/auth payload. Preserve **every surrounding capability assertion** (city, values, deadline, no persistence/location request). Update only the obsolete Arrange/Act “extra Continue after browse” to the real native return/constraints path; do not leave an artificial intermediate Continue in production solely for this test. Add the same retained fingerprint for the direct primary path and explicit Back/Edit chains.

## B03 — Hub → Guide fallback forwarding

**File/case:** `mobile/tests/city-hub-actions.test.tsx:233–238`, “carries the retained-planner entry through the Guide fallback route”. Old line 236:

```ts
expect(routeFor(screen.getByRole("button", { name: walkCopy("en").ask }))).toEqual({ pathname: "/city/[citySlug]/assistant", params: { citySlug: "lubeck", returnToPlanner: "1" } });
```

**Old:** bare boolean is propagated as if enough context. **New:** keep Guide discovery working and compare the **exact assistant route plus all five envelope fields** (`citySlug`, return flag, version, route key, mount token). Add missing/bare/malformed/array/wrong-city cases expecting the exact ordinary assistant route with no return fields. Complete-but-expired context may be forwarded syntactically but must never resume at the final Hub; test the round trip. No guide-answer capability is introduced.

Retain and strengthen I08's existing full-envelope `toMatchObject` expectation with exact object/allowed-key assertions; do not weaken B03 from equality to that subset. Positive identity tests must use a real fixture lease when they claim later live return; forwarding by itself does not require or prove liveness.

## B04 — assistant → same Hub dismiss

**File/case:** `mobile/tests/native-v2-regressions.test.tsx:453–458`, “dismisses the Guide fallback to the same hub while retaining its planner return context”. Old route assertion at line 457:

```ts
expect(JSON.parse(link.dataset.route!)).toEqual({ pathname: "/city/[citySlug]", params: { citySlug: "lubeck", section: "places", returnToPlanner: "1" } });
```

**Old:** boolean component prop produces boolean-only destination. **New:** supply a typed complete envelope through the actual proposed interface; expect the exact same Hub route and `section:"places"` plus **every v1 envelope field**. Preserve line 456 **unchanged**:

```ts
expect(link.dataset.dismiss).toBe("true");
```

Add the ordinary boolean-only route-entry negative via the real screen/parser (not an `as any` prop escape): exact city/section destination without transient return data; no pop/restore. Add mismatched/malformed envelope clearing and a valid full-context round trip to the real Hub return logic. Verify only one Hub remains after native dismiss when supported. Do not change dismissTo to push, drop the section target or lose guest discovery to get green.

## B05 — City Hub source-text coupling

**File/case:** `mobile/tests/city-hub-editorial-v1.test.ts:40–47`, “Screen 09 integration boundaries > preserves virtualized places, actual tours, account ownership and planner navigation”. Line 44:

```ts
expect(hub).toContain('params.returnToPlanner === "1"');
```

This checks an implementation spelling; it does **not**, by itself, prove unsafe Back or correct navigation. It may fail when proper parsing replaces that inline condition, even when behavior is stronger. Do not keep a dead condition/comment merely to satisfy the string search, nor replace it with another source-token check masquerading as functional coverage.

**Replacement:** retire only this literal expectation under the explicit owner-approved contract migration, linking its planner-navigation intent to ordinary rendered B01/I01–I03 coverage: real valid lease → exact one pop; bare/malformed/no lease → no pop and ordinary same-city href; press/focus race → no arbitrary action. Keep the existing editorial case and **all its other assertions**—account ownership, actual suggested tours, virtualization, explicit location and no fabricated copy—unchanged. The original source assertion remains verbatim in the historical artifact. No whole test/case is deleted; its navigation requirement is strengthened at the correct runtime seam.

## Valid assertions that remain (not obsolete)

- I03 `city-hub-actions.test.tsx:247` and I02 `:254`: `expect(state.back).not.toHaveBeenCalled()` remains intact; add zero owning-pop and actual fallback checks. Convert expected-failure wrappers only when real behavior and every assertion pass.
- I08 `:260` full identity subset check remains; add exact shape and assistant/native round-trip evidence.
- All 11 executable `planner-return-intent.test.ts` helper assertions and unchanged I06 TODO: preserve Slice 01 source/tests byte-for-byte. Add integration cases in the real controller/Hub suites, never a helper mock.
- Unrelated `welcome.test.tsx` Introduction Back, `native-screen-chrome.test.tsx` header Back, account guest-return checks and valid root/tab behavior are **not** boolean planner-return authorization and remain untouched.
- B02's other selected-state/city/deadline/no-write assertions and B04 dismiss semantics are protected as listed above.
- T05's Back destination expectation stays; its obsolete precondition/action through an extra legacy Continue needs an explicitly documented fixture/action update, not a weaker expected destination. A01 can receive the real future planning callback without weakening its independent-button assertions.

## Coverage conservation and future migration procedure

1. Freeze current source/case contexts/hashes as this review does. No code or test changes now.
2. After **explicit owner authorization**, change only the five identified assertion contracts and the corresponding Arrange/Act/native-port inputs. Preserve existing case intent/names or add traceable successor names. Keep all unrelated assertions and discoverable tests.
3. Record B01–B05 → replacement ordinary test names/files and original I01/I02/I03/I06/I07/I08/R01/T05/G04 coverage in a migration ledger. Exact old assertions are preserved verbatim for comparison, not treated as passing future behavior.
4. Run real new assertions red against old behavior; implement the authorized feature, then ordinary green. Do not silently skip, use TODO/expected-failure wrappers for obsolete expectations, reduce exact objects to subsets, or alias spies. No legacy boolean bypass just to preserve a count.
5. Keep new negative cases and all unrelated expected failures/TODOs visible; distinguish unit passes, historical superseded expectations, native acceptance and owner approval. A permanent red legacy expectation hidden by `it.fails` is not the proposed resolution.

**Recommended owner resolution:** approve this narrowly enumerated stronger assertion migration as part of a separately authorized implementation. Literal execution of the old positive boolean Back assertion and the new bare-flag rejection is logically incompatible on the same fixture. Preservation means retaining the original evidence and capability coverage while intentionally versioning the changed behavior; it cannot mean both contradictory runtime expectations pass. This review does not grant that implementation permission.
