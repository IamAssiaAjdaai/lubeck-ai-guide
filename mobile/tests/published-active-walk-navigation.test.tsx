import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { curatedResumeIndex, type CuratedExecutionState } from "@citywalk/traveler-core";
import { createMobileTripPlaceParams, parseMobileTripContext } from "../src/lib/tripNavigation";
import { openCuratedProgress, updateCuratedProgress, changeCuratedExecutionState } from "../src/lib/curatedProgressStorage";
import type { WalkStore } from "../src/lib/walkStorage";
import type { StackRouter as BaseStackRouter } from "expo-router/build/react-navigation/routers/StackRouter";

// Execute the installed Expo StackRouter including its path-identity override.
// Native rendering imports are isolated, but reducers, params and ID matching are
// package source, not hand-written substitutes. This is NOT a mounted native stack.
const require = createRequire(import.meta.url);
const stackFile = require.resolve("expo-router/build/layouts/StackClient");
const screensFile = require.resolve("expo-router/build/useScreens");
const screensSource = readFileSync(screensFile, "utf8");
const singularStart = screensSource.indexOf("function getSingularId(");
const singularEnd = screensSource.indexOf("//# sourceMappingURL", singularStart);
if (singularStart < 0 || singularEnd < singularStart) throw Error("Review installed Expo path-identity loader after SDK change");
const getSingularId = vm.runInNewContext(`${screensSource.slice(singularStart, singularEnd)}; getSingularId`);
const exportsObject: { StackRouter?: typeof BaseStackRouter } = {};
const renderingOnly = new Set([
  "../link/preview/LinkPreviewContext", "./stack-utils", "../utils/children", "../views/Protected",
]);
const baseRouter = require("expo-router/build/react-navigation/routers/StackRouter");
const packageRequire = createRequire(stackFile);
vm.runInNewContext(readFileSync(stackFile, "utf8"), {
  exports: exportsObject,
  require: (name: string) => {
    if (name === "./withLayoutContext") return { withLayoutContext: () => () => null };
    if (name === "../fork/native-stack/createNativeStackNavigator") return { createNativeStackNavigator: () => ({ Navigator: () => null }) };
    if (name === "../react-navigation/native") return baseRouter;
    if (name === "../useScreens") return { getSingularId };
    if (renderingOnly.has(name)) return {};
    if (["react", "react/jsx-runtime", "nanoid/non-secure", "../navigationParams"].includes(name)) return packageRequire(name);
    throw Error(`Unreviewed Expo dependency in navigation harness: ${name}`);
  },
}, { filename: stackFile });
if (!exportsObject.StackRouter) throw Error("Installed Expo StackRouter export missing");
const StackRouter = exportsObject.StackRouter;
const placeRoute = "city/[citySlug]/place/[placeSlug]";
const previewRoute = "city/[citySlug]/tour/[tourSlug]";
const exploreRoute = "city/[citySlug]/explore";
const options = { routeNames: ["index", previewRoute, exploreRoute, placeRoute], routeParamList: {}, routeGetIdList: {} };
const trip = { id: "published-editorial-route", citySlug: "test-city", source: "published" as const, stopSlugs: ["first", "second", "third", "fourth"] };
const executionParams = createMobileTripPlaceParams(trip, 0);
const previewParams = { citySlug: trip.citySlug, tourSlug: "editorial-route" };
function harness() {
  const reducer = StackRouter({ initialRouteName: "index" });
  let state = reducer.getInitialState(options);
  const actions: { type: string; source?: string; target?: string }[] = [];
  function dispatch(action: Parameters<typeof reducer.getStateForAction>[1]) {
    actions.push(action);
    const next = reducer.getStateForAction(state, action, options);
    if (!next || next.stale !== false) throw Error("Unexpected unhandled or partial navigation state");
    state = next;
  }
  function go(type: "NAVIGATE" | "PUSH", name: string, params: object) {
    dispatch({ type, target: state.key, payload: { name, params } });
  }
  function back(kind: "header" | "android" | "ios-dismiss") {
    if (kind === "ios-dismiss") dispatch({ type: "POP", target: state.key, source: state.routes[state.index].key, payload: { count: 1 } });
    else dispatch({ type: "GO_BACK", target: state.key, source: state.routes[state.index].key });
  }
  return { go, back, actions, get state() { return state; }, get focused() { return state.routes[state.index]; } };
}
function published(h = harness()) {
  h.go("NAVIGATE", previewRoute, previewParams);
  h.go("NAVIGATE", placeRoute, executionParams);
  return h;
}
function memory() {
  const values = new Map<string, string>();
  const io = { readError: false, writeError: false };
  const store: WalkStore = {
    getItem: async key => { if (io.readError) throw Error("Test read failure"); return values.get(key) ?? null; },
    setItem: async (key, value) => { if (io.writeError) throw Error("Test write failure"); values.set(key, value); },
  };
  return { values, io, store };
}
const progressKey = "citywalk:native:v1:curated:test-city:editorial-route";
const customKey = "citywalk:native:v2:active:test-city";

it("reproduces the original same-path NAVIGATE key reuse as a negative control", () => {
  const h = published(), key = h.focused.key, index = h.state.index;
  h.go("NAVIGATE", placeRoute, { citySlug: trip.citySlug, placeSlug: "first" });
  expect(h.focused.key).toBe(key);
  expect(h.state.index).toBe(index);
  expect(parseMobileTripContext(h.focused.params!)).toBeUndefined();
  h.back("header");
  expect(h.focused.name).toBe(previewRoute);
});

describe.each(["header", "android", "ios-dismiss"] as const)("actual stack action: %s", kind => {
  it.each(["first", "second"])("pushes %s ordinary Details and restores the original execution key and all trip params", slug => {
    const h = published(), origin = structuredClone(h.focused), index = h.state.index;
    h.go("PUSH", placeRoute, { citySlug: trip.citySlug, placeSlug: slug });
    expect(h.state.index).toBe(index + 1);
    expect(h.focused.key).not.toBe(origin.key);
    expect(h.state.routes[index]).toEqual(origin);
    expect(h.focused.params).toEqual({ citySlug: trip.citySlug, placeSlug: slug });
    expect(parseMobileTripContext(h.focused.params!)).toBeUndefined();
    h.back(kind);
    expect(h.state.index).toBe(index);
    expect(h.focused).toEqual(origin);
    expect(parseMobileTripContext(h.focused.params!)).toMatchObject({ source: "published", currentStopIndex: 0, stopSlugs: trip.stopSlugs });
    expect(h.actions.at(-1)?.type).toBe(kind === "ios-dismiss" ? "POP" : "GO_BACK");
  });
});

it("repeated same/different Details cycles do not grow the stack or consume an extra Back", () => {
  const h = published(), origin = structuredClone(h.focused), length = h.state.routes.length;
  for (const slug of ["first", "third", "first", "fourth", "first"]) {
    h.go("PUSH", placeRoute, { citySlug: trip.citySlug, placeSlug: slug });
    h.back("header");
    expect(h.state.routes).toHaveLength(length);
    expect(h.focused).toEqual(origin);
  }
  h.back("android");
  expect(h.focused.name).toBe(previewRoute);
});

it.each(["active", "paused", "ended"] as const)("preserves %s durable nonzero visited/skipped progress across Details, Back and cold resume", async phase => {
  const { store, values } = memory();
  values.set(customKey, "independent custom active walk");
  let progress = await openCuratedProgress(trip.citySlug, "editorial-route", trip.stopSlugs, store);
  progress = await updateCuratedProgress(progress, 0, "visited", store);
  progress = await updateCuratedProgress(progress, 1, "skipped", store);
  if (phase !== "active") progress = await changeCuratedExecutionState(progress, phase as CuratedExecutionState, store);
  const bytes = values.get(progressKey), h = published(), origin = structuredClone(h.focused);
  expect(curatedResumeIndex(progress)).toBe(2);
  // The URL anchor stays first; the live cursor is restored from durable progress.
  for (const slug of ["first", "third"]) {
    h.go("PUSH", placeRoute, { citySlug: trip.citySlug, placeSlug: slug });
    h.back("header");
    expect(h.focused).toEqual(origin);
    const restored = await openCuratedProgress(trip.citySlug, "editorial-route", trip.stopSlugs, store);
    expect(restored).toEqual(progress);
    expect(curatedResumeIndex(restored)).toBe(2);
  }
  const cold = published(), coldOrigin = structuredClone(cold.focused);
  cold.go("PUSH", placeRoute, { citySlug: trip.citySlug, placeSlug: "first" });
  cold.back("android");
  expect(cold.focused).toEqual(coldOrigin);
  expect(await openCuratedProgress(trip.citySlug, "editorial-route", trip.stopSlugs, store)).toEqual(progress);
  expect(values.get(progressKey)).toBe(bytes);
  expect(values.get(customKey)).toBe("independent custom active walk");
});

it("ordinary Explore Detail/Back keeps its original filter/search/map params and route key", () => {
  const h = harness();
  h.go("NAVIGATE", exploreRoute, { citySlug: trip.citySlug, category: "see", query: "museum", view: "map" });
  const origin = structuredClone(h.focused);
  h.go("NAVIGATE", placeRoute, { citySlug: trip.citySlug, placeSlug: "first" });
  expect(h.focused.params).toEqual({ citySlug: trip.citySlug, placeSlug: "first" });
  h.back("header");
  expect(h.focused).toEqual(origin);
});

it.each(["read", "write"] as const)("does not replace or advance stored progress after a %s failure and Details/Back", async failure => {
  const { store, values, io } = memory();
  const progress = await openCuratedProgress(trip.citySlug, "editorial-route", trip.stopSlugs, store);
  values.set(customKey, "custom slot must survive");
  const bytes = values.get(progressKey), h = published(), origin = structuredClone(h.focused);
  io.readError = failure === "read"; io.writeError = failure === "write";
  if (failure === "read") await expect(openCuratedProgress(trip.citySlug, "editorial-route", trip.stopSlugs, store)).rejects.toThrow("Test read failure");
  else await expect(updateCuratedProgress(progress, 0, "visited", store)).rejects.toThrow("Test write failure");
  h.go("PUSH", placeRoute, { citySlug: trip.citySlug, placeSlug: "first" });
  h.back("header");
  expect(h.focused).toEqual(origin);
  expect(values.get(progressKey)).toBe(bytes);
  expect(values.get(customKey)).toBe("custom slot must survive");
  io.readError = false; io.writeError = false;
  expect(await openCuratedProgress(trip.citySlug, "editorial-route", trip.stopSlugs, store)).toEqual(progress);
});
