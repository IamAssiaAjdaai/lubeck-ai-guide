// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ path: "/", params: {} as Record<string, string>, scroll: vi.fn(), offset: vi.fn(), back: vi.fn(), locale: "en", log: vi.fn() }));
vi.mock("expo-router", () => ({
  Link: ({ children }: React.PropsWithChildren) => <>{children}</>,
  Stack: { Screen: () => null },
  useFocusEffect: (callback: React.EffectCallback) => React.useEffect(callback, [callback]),
  usePathname: () => state.path, useLocalSearchParams: () => state.params,
  useRoute: () => ({ name: state.path === "/" ? "index" : state.path === "/saved" ? "saved" : "city/[citySlug]/index" }),
  useNavigation: () => ({ isFocused: () => true, addListener: () => () => {} }),
  useRouter: () => ({ navigate: vi.fn(), dismissTo: vi.fn(), canGoBack: () => true, back: state.back }),
}));
vi.mock("react-native", () => ({
  BackHandler: { addEventListener: () => ({ remove: vi.fn() }) },
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
  useWindowDimensions: () => ({ width: 390 }),
  View: ({ children, testID, style, accessibilityRole }: React.PropsWithChildren<{ testID?: string; style?: unknown; accessibilityRole?: string }>) => <div role={accessibilityRole} data-testid={testID} data-style={JSON.stringify(style)}>{children}</div>,
  TextInput: ({ accessibilityLabel }: { accessibilityLabel: string }) => <input aria-label={accessibilityLabel} />,
  Text: ({ children, numberOfLines, style, accessibilityRole, adjustsFontSizeToFit }: React.PropsWithChildren<{ numberOfLines?: number; style?: unknown; accessibilityRole?: string; adjustsFontSizeToFit?: boolean }>) => <span role={accessibilityRole === "header" ? "heading" : accessibilityRole} data-style={JSON.stringify(style)} data-lines={numberOfLines} data-fit={adjustsFontSizeToFit}>{children}</span>,
  Pressable: ({ children, onPress, accessibilityLabel, accessibilityRole }: React.PropsWithChildren<{ onPress: () => void; accessibilityLabel?: string; accessibilityRole?: string }>) => <button role={accessibilityRole} aria-label={accessibilityLabel} onClick={onPress}>{children}</button>,
  ScrollView: React.forwardRef(({ children }: React.PropsWithChildren, ref) => {
    React.useImperativeHandle(ref, () => ({ scrollTo: state.scroll }));
    return <div data-testid="scroll-content">{children}</div>;
  }),
  FlatList: React.forwardRef(({ ListHeaderComponent }: { ListHeaderComponent: React.ReactNode }, ref) => {
    React.useImperativeHandle(ref, () => ({ scrollToOffset: state.offset }));
    return <div data-testid="list-content">{ListHeaderComponent}</div>;
  }),
}));
vi.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children, edges, style }: React.PropsWithChildren<{ edges: string[]; style: unknown }>) => <div data-testid="safe-area" data-style={JSON.stringify(style)} data-edges={JSON.stringify(edges)}>{children}</div> }));
vi.mock("expo-image", () => ({ Image: () => null }));
vi.mock("../src/lib/haptics", () => ({ triggerCitywalkHaptic: vi.fn() }));
vi.mock("../src/lib/motion", () => ({ useReducedMotion: () => true }));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: ({ ios }: { ios: string }) => <span data-testid="icon" data-icon={ios} /> }));
vi.mock("../src/components/LocaleSelector", () => ({ LocaleSelector: () => <button>Language</button> }));
vi.mock("../src/localization/LocaleProvider", () => ({ useNativeLocale: () => ({ locale: state.locale, direction: state.locale === "ar" ? "rtl" : "ltr", messages: getNativeMessages(state.locale as "en" | "de" | "ar") }) }));
vi.mock("../src/components/NativeContentImage", () => ({ NativeContentImage: () => null }));
vi.mock("../src/components/CitywalkLoading", () => ({ CitywalkLoading: () => null }));
vi.mock("../src/components/MediaAttribution", () => ({ MediaAttribution: () => null }));
vi.mock("../src/hooks/usePublicContent", () => ({ usePublicCities: () => ({ status: "available", data: { cities: [{ slug: "lubeck", name: "Lübeck", media: [], resolvedLocale: "de" }] } }), prefetchPublicCity: vi.fn() }));
vi.mock("../src/lib/api/instance", () => ({ citywalkApi: { resolveUrl: (url: string) => url } }));
vi.mock("../src/lib/location", () => ({ requestForegroundLocation: vi.fn() }));
vi.mock("../src/lib/location.expo", () => ({ expoForegroundLocationAdapter: {} }));
vi.mock("../src/lib/auth/client", () => ({ nativeAuthClient: { useSession: () => ({ data: undefined, isPending: false }) } }));
vi.mock("../src/lib/tripStorage", () => ({ loadLocalTrips: async () => [] }));
import { t as translate } from "@citywalk/i18n";
import { getNativeMessages } from "../src/lib/localization";
import AccountScreen from "../src/app/account";
import HomeScreen from "../src/app/index";
import { AppText, EmptyState, Screen, VirtualizedScreen } from "../src/components/ui";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
beforeEach(() => { vi.stubGlobal("require", () => 1); vi.stubGlobal("__DEV__", true); vi.stubEnv("EXPO_PUBLIC_CITYWALK_QA_LOGS", "1"); vi.spyOn(console, "info").mockImplementation(state.log); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); state.locale = "en"; });
describe("actual native screen/chrome wiring (native view refs mocked)", () => {
  it.each([["/", {}, "home"], ["/saved", {}, "saved"], ["/saved", { view: "trips" }, "trips"], ["/account", {}, "profile"]] as const)("one tap reaches the %s ScrollView ref", (path, params, tab) => {
    state.path = path; state.params = params;
    render(<Screen><span>Content</span></Screen>);
    fireEvent.click(screen.getByRole("tab", { name: walkCopy("en")[tab] }));
    expect(state.scroll).toHaveBeenCalledExactlyOnceWith({ y: 0, animated: true });
    expect(state.log).toHaveBeenCalledExactlyOnceWith(`[TAB_PRESS] ${tab} active=true action=scroll-top`);
  });
  it("hides bottom tabs on nested city content", () => {
    state.path = "/city/lubeck"; state.params = { citySlug: "lubeck" };
    render(<VirtualizedScreen data={[]} renderItem={() => null} />);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(state.offset).not.toHaveBeenCalled();
  });
  it.each(["/city/lubeck", "/city/lubeck/place/holstentor", "/city/lubeck/walk"])("keeps Back in one compact header outside content at %s", path => {
    state.path = path; state.params = { citySlug: "lubeck" };
    render(<Screen>Place or walk content</Screen>);
    const header = screen.getByTestId("native-header");
    expect(header.parentElement).toBe(screen.getByTestId("safe-area"));
    expect(screen.getByTestId("scroll-content").contains(header)).toBe(false);
    const back = within(header).getByRole("button", { name: "Back" });
    expect(within(header).getByRole("link", { name: "CITYWALK" })).toBeTruthy();
    expect(within(header).getByText("Language")).toBeTruthy();
    fireEvent.click(back); expect(state.back).toHaveBeenCalledOnce();
    expect(header.dataset.style).toContain('"minHeight":48');
  });
  it.each(["/", "/saved", "/account"])("omits Back on root %s", path => {
    state.path = path; state.params = {};
    render(<Screen>Content</Screen>);
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(screen.getByTestId("safe-area").dataset.edges).toContain("bottom");
  });
  it("mirrors only the navigation chevron in the Arabic compact header", () => {
    state.path = "/city/lubeck"; state.params = { citySlug: "lubeck" }; state.locale = "ar";
    render(<Screen>Content</Screen>);
    const header = screen.getByTestId("native-header");
    expect(header.dataset.style).toContain('"direction":"rtl"');
    expect(within(header).getByTestId("icon").dataset.icon).toBe("chevron.right");
    expect(header.dataset.style).not.toContain("scaleX");
  });
});


it.each(["en", "ar"])("wires the real %s Home route, its forwarded ref and one active Home press", locale => {
  state.path = "/"; state.params = {}; state.locale = locale;
  render(<HomeScreen />);
  expect(screen.getByRole("heading", { name: walkCopy(locale).homeTitle })).toBeTruthy();
  expect(screen.getAllByTestId("scroll-content")).toHaveLength(1);
  state.scroll.mockClear();
  fireEvent.click(screen.getByRole("tab", { name: walkCopy(locale).home }));
  expect(state.scroll).toHaveBeenCalledExactlyOnceWith({ y: 0, animated: true });
  expect(state.log).toHaveBeenCalledWith("[TAB_PRESS] home active=true action=scroll-top");
});

it("keeps Arabic Home direction and all five bottom labels on wrapping tabs", () => {
  state.path = "/"; state.params = {}; state.locale = "ar";
  render(<HomeScreen />);
  expect(screen.getByTestId("safe-area").dataset.style).toContain('"direction":"rtl"');
  const t = walkCopy("ar");
  expect(screen.getAllByRole("tab").map(tab => tab.getAttribute("aria-label"))).toEqual([t.home, t.explore, t.trips, t.saved, t.profile]);
  for (const tab of screen.getAllByRole("tab")) expect(tab.querySelector("[data-lines]")).toBeNull();
  expect(screen.getByText("لوبيك")).toBeTruthy();
  expect(screen.getByText("هامبورغ")).toBeTruthy();
  expect(screen.getByText("دوسلدورف")).toBeTruthy();
});


it("right-aligns Arabic headings and fallback prose despite legacy left/center styles", () => {
  state.locale = "ar";
  render(<><AppText style={{ textAlign: "left", writingDirection: "ltr" }}>Fallback description</AppText><EmptyState title="لا توجد نتائج" description="حاول مرة أخرى" icon={null} /></>);
  const fallback = screen.getByText("\u2068Fallback description\u2069");
  const styles = JSON.parse(fallback.dataset.style!);
  expect(styles.at(-1)).toEqual({ textAlign: "right" });
  expect(styles).toContainEqual({ textAlign: "left", writingDirection: "ltr" });
  const title = screen.getByText("لا توجد نتائج");
  expect(JSON.parse(title.dataset.style!).at(-1)).toEqual({ writingDirection: "rtl", textAlign: "right" });
});


it.each(["ar", "de"] as const)("keeps one header language control on the actual %s Profile screen", async locale => {
  state.path = "/account"; state.params = {}; state.locale = locale;
  render(<AccountScreen />);
  expect(screen.getAllByRole("button", { name: "Language" })).toHaveLength(1);
  expect(screen.getByTestId("native-header").contains(screen.getByRole("button", { name: "Language" }))).toBe(true);
  expect(screen.queryByText(getNativeMessages(locale).language)).toBeNull();
  await screen.findByText(translate(locale, "profile.accountValue"));
  if (locale === "ar") {
    const title = screen.getByText(content => content.replace(/[\u2066-\u2069]/g, "") === translate(locale, "profile.nativeAccountTitle"));
    expect(JSON.parse(title.dataset.style!).at(-1)).toMatchObject({ writingDirection: "rtl", textAlign: "right" });
  }
});
it("uses Arabic embedded city names before bidi-isolating the CITYWALK brand", () => {
  state.locale = "ar";
  render(<AppText style={{ writingDirection: "ltr" }}>المركز التاريخي لمدينة Lübeck · CITYWALK</AppText>);
  expect(screen.getByText("المركز التاريخي لمدينة لوبيك · \u2068CITYWALK\u2069")).toBeTruthy();
});


it("keeps readable unbounded tab labels in the bar below the scroll content", () => {
  state.path = "/"; state.params = {}; state.locale = "de";
  render(<HomeScreen />);
  const bar = screen.getByRole("tablist");
  expect(bar.dataset.style).toContain('"flexShrink":0');
  expect(bar.parentElement).toBe(screen.getByTestId("safe-area"));
  expect(screen.getByTestId("scroll-content").nextElementSibling).toBe(bar);
  for (const tab of screen.getAllByRole("tab")) {
    const text = tab.querySelector('[data-fit]') as HTMLElement;
    expect(text.dataset.fit).toBe("false");
    expect(text.dataset.lines).toBeUndefined();
  }
});
