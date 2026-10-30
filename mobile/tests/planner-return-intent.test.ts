import { describe, expect, it, vi } from "vitest";
import {
  createPlannerReturnIntents,
  normalizePlannerIntentScope,
  parsePlannerReturnEnvelope,
  PLANNER_RETURN_LEASE_LIMIT,
} from "../src/lib/plannerReturnIntent";

// Synthetic native-state fixtures; no city content, draft/settings store or navigation replica.
const citySlug = "test-city";
const envelope = {
  citySlug, returnToPlanner: "1", plannerReturnVersion: "1",
  plannerRouteKey: "walk-instance", plannerDraftToken: "draft-mount-one",
} as const;
const lease = {
  citySlug, routeKey: envelope.plannerRouteKey, mountToken: envelope.plannerDraftToken,
  normalizedIntentScope: normalizePlannerIntentScope({ citySlug })!, ready: "constraints",
} as const;
const walk = { key: lease.routeKey, name: "city/[citySlug]/walk", params: { citySlug } };
const hub = { key: "hub-instance", name: "city/[citySlug]/index", params: envelope };
function stack(routes: readonly Record<string, unknown>[] = [walk, hub], index = routes.length - 1) {
  return { key: "owning-stack", type: "stack", stale: false, index, routes };
}
function context(overrides: Record<string, unknown> = {}) {
  return { params: envelope, citySlug, stack: stack(), focusedRouteKey: hub.key, isFocused: true, ...overrides };
}
function ready() {
  const intents = createPlannerReturnIntents();
  expect(intents.publish(lease)).toEqual(envelope);
  return intents;
}

describe("Screen 08 real transient return-intent helper (integration remains pending)", () => {
  it("[I01] resolves exact earlier key/token/city to one owning-stack pop request without navigating", () => {
    const intents = ready();
    expect(intents.resolve(context())).toEqual({
      stackKey: "owning-stack", sourceRouteKey: hub.key, targetRouteKey: walk.key,
      mountToken: lease.mountToken, popCount: 1,
    });
    // Resolution neither consumes readiness nor creates a draft/session.
    expect(intents.resolve(context())).toEqual(intents.resolve(context()));
  });

  it("[I01] chooses the exact one of two same-city instances and ignores locale/marker changes", () => {
    const intents = ready();
    const other = { ...walk, key: "another-walk" };
    expect(intents.publish({ ...lease, routeKey: other.key, mountToken: "other-mount" })).toBeDefined();
    expect(intents.resolve(context({ stack: stack([walk, other, hub]) }))?.popCount).toBe(2);
    const localized = { ...walk, params: { citySlug, locale: "de", returnToPlanner: "1" } };
    expect(intents.resolve(context({ stack: stack([localized, hub]) }))?.targetRouteKey).toBe(walk.key);
  });

  it("[I01] normalizes actual city/saved/source/add scope while excluding locale and markers", () => {
    const normal = normalizePlannerIntentScope({ citySlug });
    expect(normal).toBe(normalizePlannerIntentScope({ citySlug, locale: "de", plannerDraftToken: "ignored" }));
    for (const params of [{ citySlug, saved: "saved-1" }, { citySlug, source: "account" }, { citySlug, add: "old-market" }]) {
      expect(normalizePlannerIntentScope(params)).not.toBe(normal);
      expect(ready().resolve(context({ stack: stack([{ ...walk, params }, hub]) }))).toBeUndefined();
    }
    expect(normalizePlannerIntentScope({ citySlug, saved: "saved-1", source: "account" }))
      .not.toBe(normalizePlannerIntentScope({ citySlug, saved: "saved-1" }));
    for (const params of [undefined, { citySlug: [citySlug] }, { citySlug, saved: [] }, { citySlug, saved: "" }, { citySlug, source: "unknown" }, { citySlug, add: "../invalid" }]) {
      expect(normalizePlannerIntentScope(params)).toBeUndefined();
    }
  });

  it("[I01] rejects malformed/bare/versioned/array/oversized envelopes and projects metadata only", () => {
    for (const params of [undefined, {}, { citySlug, returnToPlanner: "1" },
      ...Object.keys(envelope).map(key => ({ ...envelope, [key]: [envelope[key as keyof typeof envelope]] })),
      { ...envelope, plannerReturnVersion: "2" }, { ...envelope, returnToPlanner: "0" },
      { ...envelope, citySlug: "../city" }, { ...envelope, citySlug: "a".repeat(129) },
      { ...envelope, plannerRouteKey: "x".repeat(257) }, { ...envelope, plannerDraftToken: "" },
      { ...envelope, plannerDraftToken: "token\n" }]) {
      expect(parsePlannerReturnEnvelope(params)).toBeUndefined();
      expect(ready().resolve(context({ params }))).toBeUndefined();
    }
    expect(parsePlannerReturnEnvelope({ ...envelope, settings: { minutes: 120 }, gps: { lat: 1 } })).toEqual(envelope);
  });

  it("[I01] rejects wrong city, token, target name, readiness and scope", () => {
    const intents = ready();
    expect(intents.resolve(context({ citySlug: "other-city" }))).toBeUndefined();
    expect(intents.resolve(context({ params: { ...envelope, plannerDraftToken: "forged" } }))).toBeUndefined();
    expect(intents.resolve(context({ params: { ...envelope, plannerRouteKey: "missing" } }))).toBeUndefined();
    expect(intents.resolve(context({ stack: stack([{ ...walk, name: "city/[citySlug]/tour/[tourSlug]" }, hub]) }))).toBeUndefined();
    expect(intents.resolve(context({ stack: stack([{ ...walk, params: { citySlug: "other-city" } }, hub]) }))).toBeUndefined();
    expect(intents.publish({ ...lease, ready: "confirmation" } as unknown as typeof lease)).toBeUndefined();
    expect(intents.publish({ ...lease, normalizedIntentScope: "forged" })).toBeUndefined();
  });

  it("[I04] cold module cannot revive a serialized stack/envelope or an old runtime lease", async () => {
    const warm = await import("../src/lib/plannerReturnIntent");
    expect(warm.plannerReturnIntents.publish(lease)).toEqual(envelope);
    expect(warm.plannerReturnIntents.resolve(context())).toBeDefined();
    const restored = JSON.parse(JSON.stringify(context()));
    vi.resetModules();
    const cold = await import("../src/lib/plannerReturnIntent");
    expect(cold.plannerReturnIntents.resolve(restored)).toBeUndefined();
    expect(createPlannerReturnIntents().resolve(restored)).toBeUndefined();
    warm.plannerReturnIntents.revoke(lease.routeKey, lease.mountToken);
  });

  it("[I05] old token cleanup cannot revoke replacement; matching cleanup revokes readiness", () => {
    const intents = ready();
    const replacement = { ...lease, mountToken: "replacement-mount" };
    const next = intents.publish(replacement);
    expect(next).toBeDefined();
    expect(intents.revoke(lease.routeKey, lease.mountToken)).toBe(false);
    expect(intents.resolve(context())).toBeUndefined();
    const nextHub = { ...hub, params: next! };
    const nextContext = context({ params: next, stack: stack([walk, nextHub]) });
    expect(intents.resolve(nextContext)).toBeDefined();
    expect(intents.revoke(replacement.routeKey, replacement.mountToken)).toBe(true);
    expect(intents.resolve(nextContext)).toBeUndefined();
  });

  it("[I05] projects and freezes only bounded lease metadata; caller extras and mutation are not retained", () => {
    const intents = createPlannerReturnIntents();
    const mutable = { ...lease, mountToken: String(lease.mountToken), settings: { minutes: 240 }, gps: { lat: 1 }, journey: { id: "not-stored" } };
    const published = intents.publish(mutable)!;
    expect(Object.keys(published).sort()).toEqual(Object.keys(envelope).sort());
    expect(Object.isFrozen(published)).toBe(true);
    mutable.mountToken = "caller-mutated";
    mutable.normalizedIntentScope = "caller-mutated";
    expect(intents.resolve(context())).toBeDefined();
    expect(Object.keys(intents).sort()).toEqual(["publish", "reconcile", "resolve", "revoke"]);
  });

  it("[I05] bounds live entries without evicting valid drafts; revoke/orphan reconciliation frees capacity", () => {
    const intents = ready();
    for (let i = 1; i < PLANNER_RETURN_LEASE_LIMIT; i++) {
      expect(intents.publish({ ...lease, routeKey: `walk-${i}` })).toBeDefined();
    }
    expect(intents.publish({ ...lease, routeKey: "overflow" })).toBeUndefined();
    expect(intents.resolve(context())).toBeDefined();
    expect(intents.publish({ ...lease, mountToken: "replacement" })).toBeDefined();
    // A complete live-key inventory is required; invalid/incomplete native state is not a cleanup signal.
    expect(intents.reconcile(undefined)).toBe(false);
    expect(intents.reconcile([lease.routeKey, ["array-key"]])).toBe(false);
    expect(intents.reconcile([lease.routeKey])).toBe(true);
    expect(intents.publish({ ...lease, routeKey: "overflow" })).toBeDefined();
    expect(intents.reconcile([])).toBe(true);
    expect(intents.resolve(context())).toBeUndefined();
  });

  it("[I07] resolves final owning-stack count with intermediate screens; never scans a nested or unrelated stack", () => {
    const intents = ready();
    const legal = { key: "legal-instance", name: "legal", params: {} };
    expect(intents.resolve(context({ stack: stack([walk, legal, hub]) }))).toEqual({
      stackKey: "owning-stack", sourceRouteKey: hub.key, targetRouteKey: walk.key,
      mountToken: lease.mountToken, popCount: 2,
    });
    const nested = { key: "nested", name: "other-stack", params: {}, state: stack([walk]) };
    expect(intents.resolve(context({ stack: stack([nested, hub]) }))).toBeUndefined();
    expect(intents.resolve(context({ stack: { ...stack(), type: "tab" } }))).toBeUndefined();
    expect(intents.resolve(context({ isFocused: false }))).toBeUndefined();
    expect(intents.resolve(context({ focusedRouteKey: "unrelated-hub" }))).toBeUndefined();
  });

  it("[I07] re-resolution rejects removed/changed/future/duplicate targets and malformed/unfocused state", () => {
    const intents = ready();
    expect(intents.resolve(context())).toBeDefined();
    for (const state of [undefined, {}, { ...stack(), stale: true }, { ...stack(), index: -1 },
      { ...stack(), index: 0.5 }, stack([hub]), stack([hub, walk], 0), stack([walk, walk, hub]),
      stack([{ ...walk, params: { citySlug, saved: "new-intent" } }, hub]),
      stack([walk, { ...hub, params: { ...envelope, plannerDraftToken: "changed" } }]),
      stack([walk, { ...hub, name: "city/[citySlug]/explore" }]),
      stack([walk, { ...hub, params: { ...envelope, citySlug: "other-city" } }])]) {
      expect(intents.resolve(context({ stack: state }))).toBeUndefined();
    }
    expect(intents.revoke(lease.routeKey, lease.mountToken)).toBe(true);
    expect(intents.resolve(context())).toBeUndefined();
  });

  // Unchanged gate: helper success cannot prove React commit order or native navigation integration.
  it.todo("[S08 PENDING][I06] Committed cursor/lease registration order is absent; double-tap-before-registration test requires the actual callback/helper.");
});
