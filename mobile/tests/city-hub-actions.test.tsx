// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NativeLocale, PublicPlaceCard } from "../src/lib/api/contracts";

type LayoutEvent = { nativeEvent: { layout: { y: number } } };
const state = vi.hoisted(() => ({
  userId: undefined as string | undefined, interestsLoaded: vi.fn(), width: 390, fontScale: 1, locale: "en" as NativeLocale, citySlug: "lubeck",
  scrollToOffset: vi.fn(), requestLocation: vi.fn(), returnToPlanner: undefined as string | undefined, back: vi.fn(), canGoBack: true,
  dispatch: vi.fn(), focused: true, setParams: vi.fn(), nativeStack: undefined as unknown,
  s08ReturnParams: {} as Record<string, string>,
  headerLayout: undefined as ((event: LayoutEvent) => void) | undefined,
  placesLayout: undefined as ((event: LayoutEvent) => void) | undefined,
}));
const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

vi.mock("../src/lib/auth/client", () => ({ nativeAuthClient: { useSession: () => ({ data: state.userId ? { user: { id: state.userId } } : null }) } }));
vi.mock("../src/lib/travelerStyle", () => ({ loadTravelerStyle: state.interestsLoaded }));
vi.mock("../src/components/CityPhotoCredits", () => ({ CityPhotoCredits: () => null }));
vi.mock("../src/components/CityHubHero", () => ({ CityHubHero: () => null }));
vi.mock("expo-router", () => ({
  useRoute: () => ({ key: "hub-route", params: { citySlug: state.citySlug, returnToPlanner: state.returnToPlanner, ...state.s08ReturnParams } }),
  useNavigation: () => ({ isFocused: () => state.focused, getState: () => state.nativeStack, dispatch: state.dispatch, setParams: state.setParams }),
  router: { canGoBack: () => state.canGoBack, back: state.back },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ citySlug: state.citySlug, returnToPlanner: state.returnToPlanner, ...state.s08ReturnParams }),
  Link: ({ children, href, onPress }: React.PropsWithChildren<{ href: unknown; onPress?: (event: React.MouseEvent) => void }>) => {
    const child = children as React.ReactElement<{ style?: unknown }>;
    if (Array.isArray(child.props.style)) throw new Error("Link asChild needs a flattened style");
    return <div data-route={JSON.stringify(href)} onClick={onPress}>{children}</div>;
  },
}));
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  useWindowDimensions: () => ({ width: state.width, fontScale: state.fontScale }),
  StyleSheet: { create: (s: unknown) => s, flatten: (s: unknown) => flatten(s), hairlineWidth: 1 },
  View: ({ children, testID, style, onLayout }: React.PropsWithChildren<{ testID?: string; style?: unknown; onLayout?: (event: LayoutEvent) => void }>) => {
    if (onLayout) state.placesLayout = onLayout;
    return <div data-testid={testID} data-style={JSON.stringify(flatten(style))}>{children}</div>;
  },
}));
vi.mock("../src/components/ui", () => ({
  AppText: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  SectionTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
  StatusMessage: ({ children }: React.PropsWithChildren) => <div role="status">{children}</div>,
  Screen: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  MotionView: ({ children, onLayout }: React.PropsWithChildren<{ onLayout?: (event: LayoutEvent) => void }>) => {
    if (onLayout) state.headerLayout = onLayout;
    return <div>{children}</div>;
  },
  PressableSurface: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  PrimaryButton: ({ label, tone = "primary", style, compact, wrapLabel, busy, disabled, onPress }: {
    label: string; tone?: string; style?: unknown; compact?: boolean; wrapLabel?: boolean;
    busy?: boolean; disabled?: boolean; onPress?: () => void;
  }) => <button data-tone={tone} data-compact={Boolean(compact)} data-wrap={Boolean(wrapLabel)}
    data-style={JSON.stringify(flatten(style))} disabled={busy || disabled} onClick={onPress}>{label}</button>,
  VirtualizedScreen: React.forwardRef(function MockVirtualizedScreen({ ListHeaderComponent, data, renderItem }: {
    ListHeaderComponent: React.ReactNode; data: PublicPlaceCard[];
    renderItem: (props: { item: PublicPlaceCard }) => React.ReactNode;
  }, ref) {
    React.useImperativeHandle(ref, () => ({ scrollToOffset: state.scrollToOffset }));
    return <main>{ListHeaderComponent}<div data-testid="visible-places" data-order={data.map(p => p.slug).join(",")}>
      {data.map(item => <div key={item.slug}>{renderItem({ item })}</div>)}
    </div></main>;
  }),
}));
vi.mock("../src/components/ImageOverlayHero", () => ({ ImageOverlayHero: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("../src/components/WalkControls", () => ({ WalkChoices: () => null }));
vi.mock("../src/components/WalkMembershipControl", () => ({ WalkMembershipControl: () => null }));
vi.mock("../src/components/NativeContentImage", () => ({ NativeContentImage: () => null }));
vi.mock("../src/components/NativeCityMap", () => ({ NativeCityMap: () => null }));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/components/MediaAttribution", () => ({ MediaAttribution: () => null }));
vi.mock("../src/components/CitywalkLoading", () => ({ CitywalkLoading: () => null }));
vi.mock("../src/components/ContentRecovery", () => ({ ContentRecovery: () => null }));
vi.mock("../src/lib/location", () => ({ requestForegroundLocation: state.requestLocation }));
vi.mock("../src/lib/location.expo", () => ({ expoForegroundLocationAdapter: {} }));
vi.mock("../src/lib/haptics", () => ({ triggerCitywalkHaptic: vi.fn() }));
vi.mock("../src/lib/api/instance", () => ({ citywalkApi: { resolveUrl: (value: string) => value } }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({
  locale: state.locale, direction: state.locale === "ar" ? "rtl" : "ltr", messages: getNativeMessages(state.locale),
}) }));
vi.mock("../src/hooks/usePublicContent", () => ({
  usePublicCity: () => ({ status: "available", data: {
    city: { slug: state.citySlug, content: { name: "Test city" } }, places, tours: [],
  } }),
  prefetchPublicPlace: vi.fn(),
}));

import { plannerReturnIntents, normalizePlannerIntentScope } from "../src/lib/plannerReturnIntent";
import CityScreen, { returnToRetainedPlanner } from "../src/app/city/[citySlug]/index";
import citySource from "../src/app/city/[citySlug]/index.tsx?raw";
import uiSource from "../src/components/ui.tsx?raw";
import { textLayout } from "../src/design/responsiveText";
import { getNativeMessages } from "../src/lib/localization";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";

// Test fixtures only. Production still renders published API content and coordinates.
const places: PublicPlaceCard[] = [
  { slug: "far-place", category: "see", durationMinutes: 10, coordinates: { lat: 53.9, lng: 10.7 },
    requestedLocale: "en", resolvedLocale: "en", didFallback: false, tags: [], media: [],
    content: { name: "Far place", shortDescription: "Test fixture" } },
  { slug: "near-place", category: "see", durationMinutes: 10, coordinates: { lat: 53.86, lng: 10.68 },
    requestedLocale: "en", resolvedLocale: "en", didFallback: false, tags: [], media: [],
    content: { name: "Near place", shortDescription: "Test fixture" } },
];

beforeEach(() => {
  vi.clearAllMocks();
  state.userId = undefined; state.interestsLoaded.mockResolvedValue({ interests: ["food"], walking: "balanced", minutes: 120 });
  state.width = 390; state.fontScale = 1; state.locale = "en"; state.citySlug = "lubeck";
  state.focused = true; state.nativeStack = undefined; state.dispatch.mockClear(); state.setParams.mockClear(); plannerReturnIntents.revoke("walk-route", "draft-mount");
  state.s08ReturnParams = {}; state.returnToPlanner = undefined; state.canGoBack = true;
  state.headerLayout = undefined; state.placesLayout = undefined;
  state.requestLocation.mockReset().mockResolvedValue({ status: "denied" });
});
afterEach(cleanup);

function measurePlaces() {
  act(() => {
    state.headerLayout?.({ nativeEvent: { layout: { y: 20 } } });
    state.placesLayout?.({ nativeEvent: { layout: { y: 320 } } });
  });
}
function routeFor(button: HTMLElement) {
  return JSON.parse(button.closest("[data-route]")!.getAttribute("data-route")!);
}

describe("focused native City Hub actions (native bridges mocked)", () => {
  it.each(["en", "de", "da", "sv", "nl", "es", "ar"] as const)("offers three secondary shortcuts and one primary builder in %s", locale => {
    state.locale = locale;
    render(<CityScreen />);
    const t = walkCopy(locale);
    const group = screen.getByTestId("city-hub-quick-actions");
    const actions = within(group).getAllByRole("button");
    expect(actions.map(action => action.textContent)).toEqual([t.places, t.near, t.ask]);
    expect(JSON.parse(group.dataset.style!)).toMatchObject({ direction: locale === "ar" ? "rtl" : "ltr", flexWrap: "wrap" });
    for (const action of actions) {
      expect(action.dataset.tone).toBe("secondary");
      expect(action.dataset.compact).toBe("true");
      expect(action.dataset.wrap).toBe("true");
      expect(JSON.parse(action.dataset.style!)).toMatchObject({ minHeight: 64 });
    }
    const builder = screen.getByRole("button", { name: t.build });
    expect(builder.dataset.tone).toBe("primary");
    expect(screen.getAllByRole("button").filter(button => button.dataset.tone === "primary")).toEqual([builder]);
    expect(routeFor(builder)).toEqual({ pathname: "/city/[citySlug]/walk", params: { citySlug: "lubeck" } });
    expect(routeFor(within(group).getByRole("button", { name: t.ask }))).toEqual({ pathname: "/city/[citySlug]/assistant", params: { citySlug: "lubeck" } });
    expect(within(group).queryByRole("button", { name: t.saved })).toBeNull();
    expect(state.requestLocation).not.toHaveBeenCalled();
  });

  it.each([320, 390, 430])("adapts three actions live to larger text at width %s without clamping labels", width => {
    state.width = width;
    const view = render(<CityScreen />);
    for (const scale of [1, 1.1, 1.3, 2, 3, 1]) {
      state.fontScale = scale; view.rerender(<CityScreen />);
      const actions = within(screen.getByTestId("city-hub-quick-actions")).getAllByRole("button");
      expect(actions).toHaveLength(3);
      for (const action of actions) {
        const style = JSON.parse(action.dataset.style!);
        expect(style.width).toBeCloseTo(textLayout(width, scale, 3).quickWidth);
        expect(style).not.toHaveProperty("height");
        expect(action.dataset.wrap).toBe("true");
      }
    }
  });

  it("keeps the Explore root navigation shell and does not hardcode a city into actions", () => {
    state.citySlug = "berlin";
    render(<CityScreen />);
    const t = walkCopy("en");
    expect(routeFor(screen.getByRole("button", { name: t.build })).params.citySlug).toBe("berlin");
    expect(routeFor(screen.getByRole("button", { name: t.ask })).params.citySlug).toBe("berlin");
    expect(citySource).toContain("<VirtualizedScreen");
    expect(citySource).not.toContain("navigation={false}");
    expect(citySource).not.toContain('pathname: "/saved"');
    expect(uiSource.slice(uiSource.indexOf("export function VirtualizedScreen"))).toContain("<NativeBottomNavigation");
  });

  it("scrolls Places to the measured list section without requesting GPS", () => {
    render(<CityScreen />); measurePlaces();
    fireEvent.click(screen.getByRole("button", { name: walkCopy("en").places }));
    expect(state.scrollToOffset).toHaveBeenCalledWith({ offset: 340, animated: true });
    expect(state.requestLocation).not.toHaveBeenCalled();
  });

  it("requests location only on tap, prevents duplicate taps while busy, and sorts published coordinates", async () => {
    let resolveLocation!: (value: unknown) => void;
    state.requestLocation.mockImplementationOnce(() => new Promise(resolve => { resolveLocation = resolve; }));
    render(<CityScreen />); measurePlaces();
    expect(screen.getByTestId("visible-places").dataset.order).toBe("far-place,near-place");
    const near = screen.getByRole("button", { name: walkCopy("en").near });
    fireEvent.click(near); fireEvent.click(near);
    expect(state.requestLocation).toHaveBeenCalledTimes(1);
    expect((near as HTMLButtonElement).disabled).toBe(true);
    await act(async () => resolveLocation({ status: "available", location: { latitude: 53.86, longitude: 10.68 } }));
    expect((near as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByTestId("visible-places").dataset.order).toBe("near-place,far-place");
    expect(screen.getByRole("status").textContent).toBe(walkCopy("en").nearest);
    expect(state.scrollToOffset).toHaveBeenCalledWith({ offset: 340, animated: true });
  });

  it("keeps browsing available after denied location without inventing a nearby order", async () => {
    render(<CityScreen />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: walkCopy("en").near })));
    expect(screen.getByRole("status").textContent).toBe(walkCopy("en").gpsHelp);
    expect(screen.getByTestId("visible-places").dataset.order).toBe("far-place,near-place");
    expect(state.scrollToOffset).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: walkCopy("en").near }) as HTMLButtonElement).disabled).toBe(false);
  });
});

it.each([["1", true, 1], [undefined, true, 0], ["1", false, 0]] as const)("returns only Screen 08 city entry to its retained planner (%s, %s)", (returnToPlanner, canGoBack, calls) => {
  state.returnToPlanner = returnToPlanner; state.canGoBack = canGoBack; state.back.mockClear();
  if (calls) {
    const envelope = plannerReturnIntents.publish({ citySlug: "lubeck", routeKey: "walk-route", mountToken: "draft-mount", ready: "constraints", normalizedIntentScope: normalizePlannerIntentScope({ citySlug: "lubeck" })! })!;
    state.s08ReturnParams = { ...envelope };
    state.nativeStack = { key: "root", type: "stack", stale: false, index: 1, routes: [{ name: "city/[citySlug]/walk", key: "walk-route", params: { citySlug: "lubeck" } }, { name: "city/[citySlug]/index", key: "hub-route", params: envelope }] };
  }
  render(<CityScreen />);
  fireEvent.click(screen.getByRole("button", { name: walkCopy(state.locale).build }));
  expect(state.back).not.toHaveBeenCalled();
  expect(state.dispatch).toHaveBeenCalledTimes(calls);
  if (calls) expect(state.dispatch).toHaveBeenCalledWith({ type: "POP", payload: { count: 1 }, source: "hub-route", target: "root" });
  state.returnToPlanner = undefined; state.canGoBack = true;
});

 it("loads preference defaults only for the current authenticated owner and remains guest accessible", async () => {
   const view = render(<CityScreen />);
   expect(state.interestsLoaded).not.toHaveBeenCalled();
   state.userId = "account-one";
   await act(async () => view.rerender(<CityScreen />));
   expect(state.interestsLoaded).toHaveBeenLastCalledWith("account-one");
   state.userId = "account-two";
   await act(async () => view.rerender(<CityScreen />));
   expect(state.interestsLoaded).toHaveBeenLastCalledWith("account-two");
   state.userId = undefined;
   view.rerender(<CityScreen />);
   expect(screen.getByRole("button", { name: walkCopy("en").build })).toBeTruthy();
 });

it("carries the retained-planner entry through the Guide fallback route", () => {
  state.returnToPlanner = "1";
  state.s08ReturnParams = { plannerReturnVersion: "1", plannerRouteKey: "walk-route", plannerDraftToken: "draft-mount" };
  render(<CityScreen />);
  expect(routeFor(screen.getByRole("button", { name: walkCopy("en").ask }))).toEqual({ pathname: "/city/[citySlug]/assistant", params: { citySlug: "lubeck", returnToPlanner: "1", plannerReturnVersion: "1", plannerRouteKey: "walk-route", plannerDraftToken: "draft-mount" } });
  state.returnToPlanner = undefined;
});


const s08NavigationGap = it;
describe("S08 navigation identity gaps — no lease substitute", () => {
  s08NavigationGap("[S08 PASS][I03] bare returnToPlanner flag cannot authorize arbitrary Back", () => {
    state.returnToPlanner = "1"; state.canGoBack = true;
    render(<CityScreen />);
    fireEvent.click(screen.getByRole("button", { name: walkCopy("en").build }));
    expect(state.back).not.toHaveBeenCalled();
  });
  s08NavigationGap("[S08 PASS][I02] forged/mismatched mount token cannot resume a same-city draft", () => {
    state.returnToPlanner = "1"; state.canGoBack = true;
    state.s08ReturnParams = { plannerReturnVersion: "1", plannerRouteKey: "unrelated-route", plannerDraftToken: "retired-mount" };
    render(<CityScreen />);
    fireEvent.click(screen.getByRole("button", { name: walkCopy("en").build }));
    expect(state.back).not.toHaveBeenCalled();
  });
  s08NavigationGap("[S08 PASS][I08] Guide entry retains the complete return envelope", () => {
    state.returnToPlanner = "1";
    state.s08ReturnParams = { plannerReturnVersion: "1", plannerRouteKey: "walk-route", plannerDraftToken: "draft-mount" };
    render(<CityScreen />);
    expect(routeFor(screen.getByRole("button", { name: walkCopy("en").ask })).params).toMatchObject(state.s08ReturnParams);
  });
});

describe("B01/B05 real owning-stack return adapter", () => {
  function context(extra = false) {
    const envelope = plannerReturnIntents.publish({ citySlug: "lubeck", routeKey: "walk-route", mountToken: "draft-mount", ready: "constraints", normalizedIntentScope: normalizePlannerIntentScope({ citySlug: "lubeck" })! })!;
    return { params: envelope, citySlug: "lubeck", focusedRouteKey: "hub-route", isFocused: true,
      stack: { type: "stack", stale: false, key: "root", index: extra ? 2 : 1, routes: [
        { key: "walk-route", name: "city/[citySlug]/walk", params: { citySlug: "lubeck" } },
        ...(extra ? [{ key: "place-route", name: "city/[citySlug]/place/[placeSlug]", params: { citySlug: "lubeck" } }] : []),
        { key: "hub-route", name: "city/[citySlug]/index", params: envelope },
      ] } };
  }
  it.each([false, true])("revalidates, dispatches one exact pop and consumes the lease (intermediate=%s)", extra => {
    const snapshot = context(extra), read = vi.fn(() => snapshot), dispatch = vi.fn();
    expect(returnToRetainedPlanner(read, dispatch)).toBe(true);
    expect(read).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: "POP", payload: { count: extra ? 2 : 1 }, source: "hub-route", target: "root" });
    expect(returnToRetainedPlanner(read, dispatch)).toBe(false);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
  it("rejects a stack change between resolution and dispatch without consuming the live lease", () => {
    const snapshot = context(), dispatch = vi.fn();
    const read = vi.fn().mockReturnValueOnce(snapshot).mockReturnValue({ ...snapshot, isFocused: false });
    expect(returnToRetainedPlanner(read, dispatch)).toBe(false); expect(dispatch).not.toHaveBeenCalled();
    expect(plannerReturnIntents.resolve(snapshot)).toBeDefined();
  });
  it.each(["city", "token", "route", "cold", "inactive", "duplicate"])("B05 preserves real valid/invalid planner navigation: %s", invalid => {
    const snapshot = context();
    if (invalid === "city") snapshot.citySlug = "hamburg";
    if (invalid === "token") snapshot.params = { ...snapshot.params, plannerDraftToken: "retired" };
    if (invalid === "route") snapshot.stack.routes[0].key = "missing";
    if (invalid === "cold") plannerReturnIntents.revoke("walk-route", "draft-mount");
    if (invalid === "inactive") snapshot.isFocused = false;
    if (invalid === "duplicate") snapshot.stack.routes[1].key = "walk-route";
    const dispatch = vi.fn(); expect(returnToRetainedPlanner(() => snapshot, dispatch)).toBe(false); expect(dispatch).not.toHaveBeenCalled();
  });
  it("bare/malformed envelopes are cleared from the actual native params port", () => {
    state.returnToPlanner = "1"; state.s08ReturnParams = { plannerRouteKey: "orphan" };
    render(<CityScreen />);
    expect(state.setParams).toHaveBeenCalledWith({ returnToPlanner: undefined, plannerReturnVersion: undefined, plannerRouteKey: undefined, plannerDraftToken: undefined });
    expect(routeFor(screen.getByRole("button", { name: walkCopy("en").ask }))).toEqual({ pathname: "/city/[citySlug]/assistant", params: { citySlug: "lubeck" } });
  });
});
