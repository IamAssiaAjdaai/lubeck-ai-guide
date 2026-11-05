import { parseCityRouteIdentity } from "./routing";

const ID_LIMIT = 256;
export const PLANNER_RETURN_LEASE_LIMIT = 32;
const WALK_ROUTE = "city/[citySlug]/walk";
const HUB_ROUTE = "city/[citySlug]/index";

type Params = Readonly<Record<string, unknown>>;
export type PlannerReturnEnvelope = Readonly<{
  citySlug: string;
  returnToPlanner: "1";
  plannerReturnVersion: "1";
  plannerRouteKey: string;
  plannerDraftToken: string;
}>;
export type PlannerReturnLease = Readonly<{
  citySlug: string;
  routeKey: string;
  mountToken: string;
  normalizedIntentScope: string;
  ready: "constraints";
}>;
export type PlannerReturnContext = Readonly<{
  params: unknown;
  citySlug: unknown;
  stack: unknown;
  focusedRouteKey: unknown;
  isFocused: boolean;
}>;
export type PlannerReturnTarget = Readonly<{
  stackKey: string;
  sourceRouteKey: string;
  targetRouteKey: string;
  mountToken: string;
  popCount: number;
}>;

function record(value: unknown): Params | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Params : undefined;
}
function boundedId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= ID_LIMIT &&
    !/[\s\u0000-\u001f\u007f]/u.test(value);
}
function city(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 128) return undefined;
  return parseCityRouteIdentity(value)?.citySlug;
}

/** Identity only: locale/return markers are deliberately not hydration scope. */
export function normalizePlannerIntentScope(value: unknown): string | undefined {
  const params = record(value);
  const citySlug = city(params?.citySlug);
  if (!params || !citySlug) return undefined;
  if (params.saved !== undefined && !boundedId(params.saved)) return undefined;
  if (params.source !== undefined && params.source !== "account") return undefined;
  if (params.add !== undefined && !city(params.add)) return undefined;
  return JSON.stringify([citySlug, params.saved ?? null, params.source === "account", params.add ?? null]);
}

/** Project only the versioned scalar envelope; never copy settings or location. */
export function parsePlannerReturnEnvelope(value: unknown): PlannerReturnEnvelope | undefined {
  const params = record(value);
  const citySlug = city(params?.citySlug);
  if (!params || !citySlug || params.returnToPlanner !== "1" || params.plannerReturnVersion !== "1" ||
      !boundedId(params.plannerRouteKey) || !boundedId(params.plannerDraftToken)) return undefined;
  return Object.freeze({
    citySlug, returnToPlanner: "1", plannerReturnVersion: "1",
    plannerRouteKey: params.plannerRouteKey, plannerDraftToken: params.plannerDraftToken,
  });
}

/**
 * One JS-runtime metadata registry, not a draft/settings store or auth capability.
 * Publish only AFTER a healthy new-draft constraints render commits. Revoke on
 * leaving that state, Build/recovery/scope change and unmount. Those controller
 * integrations are intentionally separate from this dependency slice.
 */
export function createPlannerReturnIntents() {
  const leases = new Map<string, PlannerReturnLease>();

  function publish(value: PlannerReturnLease): PlannerReturnEnvelope | undefined {
    const citySlug = city(value.citySlug);
    if (!citySlug || !boundedId(value.routeKey) || !boundedId(value.mountToken) ||
        value.ready !== "constraints" ||
        value.normalizedIntentScope !== normalizePlannerIntentScope({ citySlug })) return undefined;
    if (!leases.has(value.routeKey) && leases.size >= PLANNER_RETURN_LEASE_LIMIT) return undefined;
    // Explicit projection prevents even structurally compatible caller extras from being retained.
    leases.set(value.routeKey, Object.freeze({
      citySlug, routeKey: value.routeKey, mountToken: value.mountToken,
      normalizedIntentScope: value.normalizedIntentScope, ready: "constraints",
    }));
    return parsePlannerReturnEnvelope({
      citySlug, returnToPlanner: "1", plannerReturnVersion: "1",
      plannerRouteKey: value.routeKey, plannerDraftToken: value.mountToken,
    });
  }

  function revoke(routeKey: string, mountToken: string): boolean {
    if (leases.get(routeKey)?.mountToken !== mountToken) return false;
    return leases.delete(routeKey);
  }

  /** Caller must supply the COMPLETE live route-key inventory, across owning stacks. */
  function reconcile(liveRouteKeys: unknown): boolean {
    if (!Array.isArray(liveRouteKeys) || !liveRouteKeys.every(boundedId)) return false;
    const live = new Set<string>(liveRouteKeys);
    for (const key of leases.keys()) if (!live.has(key)) leases.delete(key);
    return true;
  }

  /**
   * Pure resolution against a fresh, focused OWNING stack snapshot. Never scan
   * nested stacks, dispatch, create a route, or restore values. Future callers
   * must re-read/re-resolve immediately before synchronous owning-stack pop;
   * no async gap and no caching this result for a later press.
   */
  function resolve(context: PlannerReturnContext): PlannerReturnTarget | undefined {
    const envelope = parsePlannerReturnEnvelope(context.params);
    const citySlug = city(context.citySlug);
    if (!envelope || envelope.citySlug !== citySlug || context.isFocused !== true ||
        !boundedId(context.focusedRouteKey)) return undefined;
    const lease = leases.get(envelope.plannerRouteKey);
    if (!lease || lease.citySlug !== citySlug || lease.mountToken !== envelope.plannerDraftToken ||
        lease.ready !== "constraints") return undefined;

    const stack = record(context.stack);
    if (!stack || stack.type !== "stack" || stack.stale !== false || !boundedId(stack.key) ||
        !Number.isSafeInteger(stack.index) || !Array.isArray(stack.routes) ||
        stack.index !== stack.routes.length - 1 || stack.routes.length < 2) return undefined;
    const routes: Params[] = [];
    const keys = new Set<string>();
    for (const raw of stack.routes) {
      const route = record(raw);
      if (!route || !boundedId(route.key) || typeof route.name !== "string" || keys.has(route.key)) return undefined;
      keys.add(route.key);
      routes.push(route);
    }
    const index = stack.index as number;
    const focused = routes[index];
    if (focused.key !== context.focusedRouteKey || focused.name !== HUB_ROUTE) return undefined;
    const focusedEnvelope = parsePlannerReturnEnvelope(focused.params);
    if (!focusedEnvelope || focusedEnvelope.citySlug !== citySlug ||
        focusedEnvelope.plannerRouteKey !== envelope.plannerRouteKey ||
        focusedEnvelope.plannerDraftToken !== envelope.plannerDraftToken) return undefined;

    const targetIndex = routes.findIndex(route => route.key === envelope.plannerRouteKey);
    if (targetIndex < 0 || targetIndex >= index) return undefined;
    const target = routes[targetIndex];
    if (target.name !== WALK_ROUTE || normalizePlannerIntentScope(target.params) !== lease.normalizedIntentScope) return undefined;
    return Object.freeze({
      stackKey: stack.key, sourceRouteKey: context.focusedRouteKey,
      targetRouteKey: envelope.plannerRouteKey, mountToken: lease.mountToken,
      popCount: index - targetIndex,
    });
  }

  return Object.freeze({ publish, revoke, reconcile, resolve });
}

// Never serialized. A cold module/runtime starts empty even with restored route params.
export const plannerReturnIntents = createPlannerReturnIntents();
