// @vitest-environment jsdom
import { subscribeAccountWalks } from "../src/lib/accountWalks";
import React, { useEffect } from "react";
import { t as translate, sharedLocales } from "@citywalk/i18n";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  guest: false,
  saved: [] as import("@citywalk/traveler-core/walkJourney").WalkJourney[],
  current: undefined as import("../src/lib/walkStorage").CurrentWalk | undefined,
  changed: undefined as ((current: import("../src/lib/walkStorage").CurrentWalk | undefined) => void) | undefined,
  load: vi.fn(),
  persist: vi.fn(),
  save: vi.fn(),
  share: vi.fn(),
  feedback: vi.fn(),
  location: vi.fn(),
  locale: "en",
  contentStatus: "available",
  holdPresentation: false,
  presented: undefined as (() => void) | undefined,
}));

vi.mock("../src/hooks/useAccountWalks", () => ({ useAccountWalks: () => { const [, refresh] = React.useReducer(n => n + 1, 0); useEffect(() => subscribeAccountWalks(() => refresh()), []); return { userId: mocks.guest ? undefined : "test-user", walks: mocks.saved, loading: false, error: false, refresh: vi.fn() }; } }));
vi.mock("../src/lib/auth/client", () => ({ nativeAuthClient: { getSession: async () => ({ data: mocks.guest ? null : { user: { id: "test-user" } } }) } }));
vi.mock("../src/lib/api/instance", () => ({ citywalkApi: { fetchAuthenticated: async (_path: string, init: RequestInit) => {
  if (init.method === "GET") return Response.json({ walks: mocks.saved.map(w => ({ id: w.id, route: { citySlug: w.citySlug, stopSlugs: [...w.visited, ...w.remaining], settings: w.settings, finish: w.finish }, createdAt: "2026-09-27T00:00:00Z", updatedAt: "2026-09-27T00:00:00Z" })) });
  const { route, id } = JSON.parse(init.body as string);
  if (init.method === "DELETE") { mocks.saved = mocks.saved.filter(w => w.id !== id); return Response.json({ removed: true }); }
  const actual = await import("@citywalk/traveler-core");
  const duplicate = mocks.saved.find(w => actual.savedRouteIdentity(w) === actual.savedRouteIdentity({ citySlug: route.citySlug, remaining: route.stopSlugs, visited: [], finish: route.finish }));
  const record = { id: duplicate?.id ?? id ?? "server-record", route, createdAt: "2026-09-27T00:00:00Z", updatedAt: "2026-09-27T00:00:00Z" };
  if (!duplicate) { const next = mocks.saved.filter(w => w.id !== record.id).concat(actual.accountSavedJourney(record)); await mocks.save(next); mocks.saved = next; }
  return Response.json({ walk: record });
} } }));
vi.mock("../src/lib/storeReview", () => ({ storeReview: { afterCompletion: async () => ({ status: "unavailable" }), configuredUrl: () => undefined } }));
vi.mock("../src/components/ImageOverlayHero", () => ({ ImageOverlayHero: () => null }));
vi.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ citySlug: "city" }),
  Link: ({ children, href, push }: React.PropsWithChildren<{ href: unknown; push?: boolean }>) =>
    <a data-route={JSON.stringify(href)} data-push={String(Boolean(push))}>{children}</a>,
  useRouter: () => ({ replace: vi.fn() }), router: { push: vi.fn() },
}));
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  StyleSheet: { create: (styles: unknown) => styles },
  View: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ActivityIndicator: () => <span>Loading</span>,
  Modal: ({
    visible,
    children,
  }: {
    visible: boolean;
    children: React.ReactNode;
  }) => (visible ? <div role="dialog">{children}</div> : null),
  AppState: { currentState: "active" },
  BackHandler: { addEventListener: () => ({ remove: vi.fn() }) },
  Linking: { openURL: vi.fn() },
  Share: { share: mocks.share },
}));
vi.mock("../src/components/ui", () => ({
  Screen: ({
    children,
    footer,
  }: {
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
    <main>
      {children}
      {footer}
    </main>
  ),
  AppText: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  SectionTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  StatusMessage: ({ children }: { children: React.ReactNode }) => (
    <div role="status">{children}</div>
  ),
  PrimaryButton: ({
    label,
    onPress,
    disabled,
    busy,
  }: {
    label: string;
    onPress?: () => void;
    disabled?: boolean;
    busy?: boolean;
  }) => (
    <button disabled={disabled || busy} onClick={onPress}>
      {label}
    </button>
  ),
}));
vi.mock("../src/components/WalkControls", () => ({
  WalkChoices: ({
    label,
    options,
    selected,
    onSelect,
  }: {
    label: string;
    options: { value: string; label: string }[];
    selected: string[];
    onSelect: (value: string) => void;
  }) => (
    <fieldset>
      <legend>{label}</legend>
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={selected.includes(o.value)}
          onClick={() => onSelect(o.value)}
        >
          {o.label}
        </button>
      ))}
    </fieldset>
  ),
  WalkPlacePicker: ({
    label,
    options,
    selected,
    onSelect,
  }: {
    label: string;
    options: { value: string; label: string }[];
    selected: string[];
    onSelect: (value: string) => void;
  }) => (
    <fieldset>
      <legend>{label}</legend>
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={selected.includes(o.value)}
          onClick={() => onSelect(o.value)}
        >
          {o.label}
        </button>
      ))}
    </fieldset>
  ),
  WalkInput: ({
    label,
    value,
    onChangeText,
  }: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
  }) => (
    <label>
      {label}
      <input value={value} onChange={(e) => onChangeText(e.target.value)} />
    </label>
  ),
}));
vi.mock("../src/components/NativeIcon", () => ({ NativeIcon: () => null }));
vi.mock("../src/components/V2Presentation", () => ({
  V2Hero: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <header>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </header>
  ),
  StepProgress: ({ label }: { label: string }) => <span>{label}</span>,
  V2Loading: ({ stage, onReady, onPresented }: { stage: string; onReady: () => void; onPresented: () => void }) => {
    React.useEffect(onReady, [onReady]);
    React.useEffect(() => { mocks.presented = onPresented; if (!mocks.holdPresentation) onPresented(); }, [onPresented]);
    return <span data-testid="build-stage">{stage}</span>;
  },
  V2WalkError: ({ retry, close, recoveryLabel }: { retry: () => void; close: () => void; recoveryLabel?: string }) => (
    <div role="alert">
      <button onClick={retry}>{recoveryLabel ?? "Retry"}</button>
      <button onClick={close}>Back</button>
    </div>
  ),
  MetricSummary: ({ items }: { items: { label: string; value: string }[] }) => (
    <dl>
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  ),
  V2Itinerary: ({
    places,
  }: {
    places: { slug: string; content: { name: string } }[];
  }) => (
    <ol>
      {places.map((p) => (
        <li key={p.slug}>{p.content.name}</li>
      ))}
    </ol>
  ),
}));
vi.mock("../src/components/NativeCityMap", () => ({
  NativeCityMap: () => <div>Native map boundary</div>,
}));
vi.mock("../src/components/NativeLiveWalkCard", () => ({
  NativeLiveWalkCard: () => <div>Live Walk companion</div>,
}));
vi.mock("../src/lib/backgroundWalk", () => ({
  completeCitywalkLiveWalk: vi.fn(async () => undefined),
  disableCitywalkLiveWalk: vi.fn(async () => undefined),
  enableCitywalkLiveWalk: vi.fn(async () => "enabled"),
  getLiveWalkRuntimeStatus: vi.fn(async () => ({ status: "disabled" })),
  publishForegroundLiveWalkLocation: vi.fn(async () => undefined),
  refreshCitywalkLiveActivity: vi.fn(async () => true),
}));
vi.mock("../src/lib/liveWalkStorage", () => ({
  loadLiveWalkSession: vi.fn(async () => undefined),
  subscribeLiveWalkSession: vi.fn(() => () => undefined),
  markLiveWalkRouteUpdated: vi.fn(async () => undefined),
  syncLiveWalkSession: vi.fn(async (input: Record<string, unknown>) => ({
    version: 1,
    ...input,
    enabled: false,
    routeSignature: "test-route",
    proximity: { state: "normal", arrivalSamples: 0 },
  })),
}));
vi.mock("../src/lib/liveWalkPresentation", () => ({
  buildLiveWalkDiagnostics: vi.fn(() => ({ baseline: "duration_budget" })),
  buildLiveWalkPresentation: vi.fn(() => ({
    props: {
      cityLabel: "CITYWALK · City",
      state: "normal",
      stateLabel: "NEXT",
      destination: "Place 0",
      distanceEta: "620 m away · ~8 min",
      progress: 0,
      progressLabel: "0 / 4 stops",
      remainingLabel: "2 h left",
      finishLabel: "Finish ~19:00",
      compactEta: "8m",
    },
    timing: {},
    targetDistanceMeters: 620,
    targetEtaMinutes: 8,
  })),
}));
vi.mock("../src/lib/location.expo", () => ({
  expoForegroundLocationAdapter: {},
}));
vi.mock("../src/lib/location", () => ({
  requestForegroundLocation: mocks.location,
}));
vi.mock("../src/lib/walkStorage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/walkStorage")>();
  const store = {
    getItem: async (key: string) => key === "citywalk:native:v2:saved" ? JSON.stringify(mocks.saved) : mocks.current ? JSON.stringify({ ...mocks.current.journey, nativePhase: mocks.current.phase }) : null,
    setItem: async (_key: string, value: string) => {
      const stored = JSON.parse(value);
      if (_key === "citywalk:native:v2:saved") { await mocks.save(stored); mocks.saved = stored; return; }
      await mocks.persist(stored);
      if (stored) {
        const { nativePhase, ...journey } = stored;
        mocks.current = { journey, phase: nativePhase === "preview" ? "preview" : "active" };
      } else mocks.current = undefined;
      mocks.changed?.(mocks.current);
    },
  };
  return {
  ...actual,
  startCurrentWalk: (city: string, id: string, places: readonly PublicPlaceCard[], ready: boolean) => actual.startCurrentWalk(city, id, places, ready, store),
  removeNativeWalk: (city: string, id: string) => actual.removeNativeWalk(city, id, store),
  clearCurrentWalk: (city: string, expected: import("../src/lib/walkStorage").CurrentWalk | undefined) => actual.clearCurrentWalk(city, expected, store),
  loadCurrentWalk: async () => {
    if (mocks.current) return mocks.current;
    const journey = await mocks.load();
    mocks.current = journey ? { journey, phase: "active" } : undefined;
    return mocks.current;
  },
  subscribeCurrentWalk: (_city: string, changed: typeof mocks.changed) => { mocks.changed = changed; return () => { mocks.changed = undefined; }; },
  loadSavedWalks: async () => mocks.saved,
  persistCurrentWalk: async (journey: import("@citywalk/traveler-core/walkJourney").WalkJourney, phase: "preview" | "active") => {
    await mocks.persist(journey); mocks.current = { journey, phase }; mocks.changed?.(mocks.current);
  },
  changeCurrentWalk: async (_city: string, change: (current: typeof mocks.current) => NonNullable<typeof mocks.current>) => {
    const next = change(mocks.current); await mocks.persist(next.journey); mocks.current = next; mocks.changed?.(next.journey.finishedAt ? undefined : next); return next;
  },
  saveNativeWalk: (journey: import("@citywalk/traveler-core/walkJourney").WalkJourney, places: readonly PublicPlaceCard[], ready: boolean) => actual.saveNativeWalk(journey, places, ready, store),
  saveCurrentAccountWalk: (journey: import("@citywalk/traveler-core/walkJourney").WalkJourney, places: readonly PublicPlaceCard[], ready: boolean, persist: Parameters<typeof actual.saveCurrentAccountWalk>[3]) => actual.saveCurrentAccountWalk(journey, places, ready, persist, store),
  saveWalkFeedback: mocks.feedback,
}; });
vi.mock("../src/lib/tripStorage", () => ({ loadLocalTrips: async () => [] }));
vi.mock("../src/localization/LocaleProvider", () => ({
  useNativeLocale: () => ({
    locale: mocks.locale,
    messages: { tripSaveFailed: "Save failed", unavailable: "Unavailable" },
  }),
}));
vi.mock("../src/components/CitywalkLoading", () => ({ CitywalkLoading: ({ label }: { label: string }) => <span data-testid="content-loader">{label}</span> }));
vi.mock("../src/hooks/usePublicContent", () => ({ usePublicCity: () => mocks.contentStatus === "loading" ? { status: "loading" } : { status: "available", data: { city: { content: { name: "City" } }, places } } }));
vi.mock("../src/components/WalkMembershipControl", () => ({ WalkMembershipControl: () => null }));
import WalkScreen from "../src/app/city/[citySlug]/walk";
import { discoveryCopy } from "../src/design/discoveryCopy";
import { NativeWalkFlow } from "../src/components/NativeWalkFlow";
import type { PublicPlaceCard } from "../src/lib/api/contracts";
import { walkCopy } from "@citywalk/traveler-core/walkCopy";
const places: PublicPlaceCard[] = Array.from({ length: 6 }, (_, i) => ({
  slug: `place-${i}`,
  category: "see",
  coordinates: { lat: 53.865 + i * 0.001, lng: 10.68 },
  durationMinutes: 20,
  tags: ["history"],
  media: [],
  requestedLocale: "en",
  resolvedLocale: "en",
  didFallback: false,
  content: { name: `Place ${i}`, shortDescription: "Published place" },
}));
function setup(authorizeStart?: () => Promise<boolean>) {
  mocks.load.mockResolvedValue(undefined);
  mocks.persist.mockResolvedValue(undefined);
  mocks.save.mockResolvedValue(undefined);
  mocks.feedback.mockResolvedValue(undefined);
  mocks.share.mockResolvedValue({});
  mocks.location.mockResolvedValue({ status: "denied" });
  render(<NativeWalkFlow citySlug="city" cityName="City" places={places} authorizeStart={authorizeStart} />);
}
afterEach(() => {
  mocks.holdPresentation = false; mocks.presented = undefined;
  cleanup();
  mocks.current = undefined; mocks.changed = undefined; mocks.saved = [];
  vi.clearAllMocks();
  mocks.locale = "en"; mocks.guest = false;
  mocks.contentStatus = "available";
  vi.unstubAllGlobals();
});
async function preview() {
  const t = walkCopy(mocks.locale);
  await screen.findByRole("button", { name: t.continue });
  fireEvent.click(screen.getByRole("button", { name: t.continue }));
  fireEvent.click(screen.getByRole("button", { name: t.continue }));
  fireEvent.click(screen.getByRole("button", { name: t.buildAction }));
  await screen.findByRole("button", { name: t.startWalk });
}
describe("rendered native V2 flow (native bridges mocked, not device acceptance)", () => {
  it("revalidates the plan when its last stop disappears during Start authorization", async () => {
    let allow!: (value: boolean) => void;
    const authorize = vi.fn(() => new Promise<boolean>(resolve => { allow = resolve; }));
    setup(authorize); await preview();
    const writes = mocks.persist.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: walkCopy("en").startWalk }));
    await waitFor(() => expect(authorize).toHaveBeenCalledOnce());
    act(() => { mocks.current = { ...mocks.current!, journey: { ...mocks.current!.journey, remaining: [] } }; });
    await act(async () => { allow(true); });
    expect(mocks.current?.phase).toBe("preview");
    expect(mocks.persist).toHaveBeenCalledTimes(writes);
    expect(screen.queryByRole("button", { name: walkCopy("en").visited })).toBeNull();
  });
  it("keeps the exact preview when Start authorization is dismissed, then starts once authorized", async () => {
    const authorize = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    setup(authorize);
    await preview();
    const before = structuredClone(mocks.current);
    const writes = mocks.persist.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: walkCopy("en").startWalk }));
    await waitFor(() => expect(authorize).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole("button", { name: walkCopy("en").startWalk }).hasAttribute("disabled")).toBe(false));
    expect(mocks.current).toEqual(before);
    expect(mocks.persist).toHaveBeenCalledTimes(writes);
    fireEvent.click(screen.getByRole("button", { name: walkCopy("en").startWalk }));
    await screen.findByRole("button", { name: walkCopy("en").visited });
    expect(authorize).toHaveBeenCalledTimes(2);
    expect(mocks.persist).toHaveBeenCalledTimes(writes + 1);
  });
  it.each(sharedLocales)(
    "plans, previews, saves and starts in %s",
    async (locale) => {
      mocks.locale = locale;
      setup();
      await preview();
      const t = walkCopy(locale);
      fireEvent.click(screen.getByRole("button", { name: translate(mocks.locale, "saved.saveWalk") }));
      await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
      fireEvent.click(screen.getByRole("button", { name: t.startWalk }));
    await screen.findByRole("button", { name: t.visited });
      await screen.findByRole("button", { name: t.visited });
      expect(mocks.persist).toHaveBeenCalledTimes(3); // Draft, saved-record lineage, then Start.
      expect(mocks.current?.journey).toMatchObject({ accountSavedWalkId: mocks.saved[0].id });
    },
  );
  it("retains the itinerary until a shortening proposal is confirmed", async () => {
    setup();
    await preview();
    const t = walkCopy("en");
    fireEvent.click(screen.getByRole("button", { name: t.startWalk }));
    await screen.findByRole("button", { name: t.visited });
    expect(screen.getAllByRole("button", { name: t.shorten })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: t.shorten }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    const before = mocks.persist.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: t.keep }));
    expect(mocks.persist).toHaveBeenCalledTimes(before);
    fireEvent.click(screen.getByRole("button", { name: t.shorten }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: t.confirm })));
    expect(mocks.persist).toHaveBeenCalledTimes(before + 1);
    expect(mocks.persist.mock.lastCall![0].remaining.length).toBeLessThan(
      mocks.persist.mock.calls[0][0].remaining.length,
    );
  });
  it("records visited highlights, finish feedback and native share requests", async () => {
    setup();
    await preview();
    const t = walkCopy("en");
    fireEvent.click(screen.getByRole("button", { name: t.startWalk }));
    await screen.findByRole("button", { name: t.visited });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: t.visited })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: t.finish })));
    expect(
      screen.getByRole("heading", { name: "You explored City" }),
    ).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: "Share feedback" }));
    fireEvent.click(screen.getByRole("button", { name: t.yes }));
    await waitFor(() =>
      expect(mocks.feedback).toHaveBeenCalledWith(
        expect.any(String),
        "fit",
        "yes",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: t.share }));
    expect(mocks.share.mock.lastCall![0].message).toContain("Place 0");
  });
  it("handles denied GPS and invalid return-by without generating a route", async () => {
    setup();
    const t = walkCopy("en");
    await screen.findByRole("button", { name: t.continue });
    fireEvent.change(screen.getByLabelText(t.returnBy), {
      target: { value: "25:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: t.continue }));
    fireEvent.click(screen.getByRole("button", { name: t.continue }));
    fireEvent.click(screen.getByRole("button", { name: t.current }));
    await screen.findByText(t.gpsHelp);
    fireEvent.click(screen.getByRole("button", { name: t.buildAction }));
    await screen.findByText(t.invalid);
    expect(mocks.persist).not.toHaveBeenCalled();
  });
  it("confirms a return-only route without losing visited history", async () => {
    setup();
    await preview();
    const t = walkCopy("en");
    fireEvent.click(screen.getByRole("button", { name: t.startWalk }));
    await screen.findByRole("button", { name: t.visited });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: t.visited })));
    fireEvent.click(screen.getByRole("button", { name: t.takeBack }));
    fireEvent.click(screen.getByRole("button", { name: t.tripStart }));
    const before = mocks.persist.mock.calls.length;
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(mocks.persist).toHaveBeenCalledTimes(before);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: t.confirm })));
    expect(mocks.persist.mock.lastCall![0].remaining).toEqual([]);
    expect(mocks.persist.mock.lastCall![0].visited).toEqual(["place-0"]);
    expect(mocks.persist.mock.lastCall![0].takeBack).toBe(true);
    expect(screen.getByRole("heading", { name: t.tripStart })).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: translate("en", "liveWalk.continueWalk"),
      }),
    ).toBeTruthy();
  });
  it.each(["en", "de"])("offers a closable Add stop sheet and confirms one addition in %s", async (locale) => {
    mocks.locale = locale;
    mocks.load.mockResolvedValueOnce({
      id: "active", citySlug: "city", settings: { minutes: 120, interests: ["history"], walking: "balanced", start: places[0].coordinates },
      remaining: ["place-0"], visited: ["place-2"], position: places[0].coordinates, historyDistance: 0, startedAt: Date.now(),
    });
    render(<NativeWalkFlow citySlug="city" cityName="City" places={places} />);
    const t = walkCopy(locale);
    fireEvent.click(await screen.findByRole("button", { name: t.add }));
    let sheet = within(screen.getByRole("dialog"));
    expect(sheet.queryByRole("button", { name: "Place 0" })).toBeNull();
    expect(sheet.queryByRole("button", { name: "Place 2" })).toBeNull();
    fireEvent.click(sheet.getByRole("button", { name: translate(locale, "common.close") }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.persist).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: t.add }));
    sheet = within(screen.getByRole("dialog"));
    fireEvent.click(sheet.getByRole("button", { name: "Place 1" }));
    expect(mocks.persist).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: t.confirm })));
    expect(mocks.persist.mock.lastCall![0].remaining).toEqual(["place-0", "place-1"]);
    fireEvent.click(screen.getByRole("button", { name: t.add }));
    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Place 1" })).toBeNull();
  });
  it("explains a rejected Add stop inside the sheet and lets the traveler close it", async () => {
    mocks.load.mockResolvedValueOnce({
      id: "full", citySlug: "city", settings: { minutes: 1, interests: ["history"], walking: "balanced", start: places[0].coordinates },
      remaining: ["place-0"], visited: [], position: places[0].coordinates, historyDistance: 0, startedAt: Date.now(),
    });
    render(<NativeWalkFlow citySlug="city" cityName="City" places={places} />);
    const t = walkCopy("en");
    fireEvent.click(await screen.findByRole("button", { name: t.add }));
    const sheet = within(screen.getByRole("dialog"));
    fireEvent.click(sheet.getByRole("button", { name: "Place 1" }));
    expect(sheet.getByRole("status").textContent).toBe(t.noEligible);
    expect(mocks.persist).not.toHaveBeenCalled();
    fireEvent.click(sheet.getByRole("button", { name: translate("en", "common.close") }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("opens a place-detail add request as a proposal, without silently changing the route", async () => {
    const time = Date.now();
    const active = {
      id: "active",
      citySlug: "city",
      settings: {
        minutes: 120,
        interests: ["history"],
        walking: "balanced",
        start: places[0].coordinates,
      },
      remaining: ["place-0"],
      visited: [],
      position: places[0].coordinates,
      historyDistance: 0,
      startedAt: time,
    };
    mocks.load.mockResolvedValueOnce(active);
    render(
      <NativeWalkFlow
        citySlug="city"
        cityName="City"
        places={places}
        addSlug="place-1"
      />,
    );
    await screen.findByRole("dialog");
    expect(mocks.persist).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(
      screen.getByRole("button", { name: walkCopy("en").confirm }),
    ));
    expect(mocks.persist.mock.lastCall![0].remaining).toEqual([
      "place-0",
      "place-1",
    ]);
  });
  it("updates an open preview after another screen removes a stop", async () => {
    setup(); await preview();
    // The preview text can render before its subscription effect has mounted.
    await waitFor(() => expect(mocks.changed).toBeTypeOf("function"));
    expect(screen.getByText("Place 0")).toBeTruthy();
    const next = { ...mocks.current!, journey: { ...mocks.current!.journey, remaining: ["place-1"] } };
    act(() => { mocks.current = next; mocks.changed?.(next); });
    expect(screen.queryByText("Place 0")).toBeNull();
    expect(screen.getByText("Place 1")).toBeTruthy();
    expect(screen.getByRole("button", { name: walkCopy("en").startWalk })).toBeTruthy();
  });
  it("updates an active stop and discards a stale proposal after external membership changes", async () => {
    setup(); await preview(); const t = walkCopy("en");
    fireEvent.click(screen.getByRole("button", { name: t.startWalk }));
    await screen.findByRole("button", { name: t.visited });
    fireEvent.click(screen.getByRole("button", { name: t.skip }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    const next = { ...mocks.current!, journey: { ...mocks.current!.journey, remaining: ["place-1"] } };
    act(() => { mocks.current = next; mocks.changed?.(next); });
    expect(screen.queryByRole("dialog")).toBeNull();
    const route = JSON.parse(screen.getByRole("button", { name: t.read }).closest("a")!.dataset.route!);
    expect(route.params.placeSlug).toBe("place-1");
  });
  it("clears a mounted route when its current walk finishes elsewhere", async () => {
    setup(); await preview();
    act(() => mocks.changed?.(undefined));
    expect(screen.queryByRole("button", { name: walkCopy("en").startWalk })).toBeNull();
    expect(screen.getByRole("button", { name: walkCopy("en").buildAction })).toBeTruthy();
  });
  it("does not enter active mode when the start write fails", async () => {
    setup(); await preview();
    mocks.persist.mockRejectedValueOnce(new Error("disk full"));
    fireEvent.click(screen.getByRole("button", { name: walkCopy("en").startWalk }));
    await screen.findByText("Save failed");
    expect(mocks.current?.phase).toBe("preview");
    expect(screen.queryByRole("button", { name: walkCopy("en").visited })).toBeNull();
  });
  it("keeps a failed save visible without blocking the route", async () => {
    setup();
    await preview();
    mocks.save.mockRejectedValueOnce(new Error("storage unavailable"));
    fireEvent.click(screen.getByRole("button", { name: walkCopy("en").save }));
    await screen.findByText("Save failed");
    expect(
      screen.getByRole("button", { name: walkCopy("en").startWalk }),
    ).toBeTruthy();
  });
});


describe("current-stop action identity", () => {
  const namedPlaces = ["holstentor", "marienkirche", "schiffergesellschaft"].map((slug, i) => ({
    ...places[i], slug, content: { name: slug, shortDescription: "Published place" },
  }));
  it.each(["holstentor", "marienkirche"])("binds Listen, Read and Ask to %s, then the next stop", async (slug) => {
    const next = slug === "holstentor" ? "marienkirche" : "holstentor";
    mocks.load.mockResolvedValueOnce({ id: "walk", citySlug: "lubeck",
      settings: { minutes: 120, interests: ["history"], walking: "balanced", start: places[0].coordinates },
      remaining: [slug, next], visited: [], position: places[0].coordinates,
      historyDistance: 0, startedAt: Date.now(),
    });
    mocks.persist.mockResolvedValue(undefined);
    render(<NativeWalkFlow citySlug="lubeck" cityName="Lübeck" places={namedPlaces} />);
    const t = walkCopy("en");
    await screen.findByRole("button", { name: t.read });
    function assertActions(expected: string) {
      for (const [label, focus] of [[t.listen, "audio"], [t.read, "story"], [t.ask, undefined]]) {
        const link = screen.getByRole("button", { name: label }).closest("a")!;
        const route = JSON.parse(link.dataset.route!);
        expect(route.params).toEqual({ citySlug: "lubeck", placeSlug: expected, ...(focus ? { focus } : {}) });
        expect(route.pathname).toBe(focus ? "/city/[citySlug]/place/[placeSlug]" : "/city/[citySlug]/guide/[placeSlug]");
        expect(link.dataset.push).toBe("true");
      }
    }
    assertActions(slug);
    fireEvent.click(screen.getByRole("button", { name: t.skip }));
    assertActions(slug); // proposal alone must not change action context
    await act(async () => fireEvent.click(screen.getByRole("button", { name: t.confirm })));
    assertActions(next);
  });
  it("keeps completed local planning visible until its native presentation finishes", async () => {
    mocks.holdPresentation = true;
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
    setup();
    const t = walkCopy("en");
    await screen.findByRole("button", { name: t.continue });
    fireEvent.click(screen.getByRole("button", { name: t.continue }));
    fireEvent.click(screen.getByRole("button", { name: t.continue }));
    fireEvent.click(screen.getByRole("button", { name: t.buildAction }));
    await waitFor(() => expect(screen.getByTestId("build-stage").textContent).toBe("matching"));
    for (let stage = 0; stage < 4; stage++) await act(async () => frames.shift()!(0));
    expect(screen.getByTestId("build-stage").textContent).toBe("choosing");
    expect(screen.queryByRole("button", { name: t.startWalk })).toBeNull();
    await act(async () => mocks.presented?.());
    expect(screen.getByRole("button", { name: t.startWalk })).toBeTruthy();
  });
  it("shows actual build stages before preview without percentage or delayed completion", async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
    setup();
    const t = walkCopy("en");
    await screen.findByRole("button", { name: t.continue });
    fireEvent.click(screen.getByRole("button", { name: t.continue }));
    fireEvent.click(screen.getByRole("button", { name: t.continue }));
    fireEvent.click(screen.getByRole("button", { name: t.buildAction }));
    for (const stage of ["matching", "checking", "fitting", "choosing"]) {
      await waitFor(() => expect(screen.getByTestId("build-stage").textContent).toBe(stage));
      expect(screen.queryByRole("button", { name: t.startWalk })).toBeNull();
      await act(async () => frames.shift()!(0));
    }
    expect(screen.getByRole("button", { name: t.startWalk })).toBeTruthy();
    vi.unstubAllGlobals();
  });
});


describe("the actual Expo walk route loading boundary", () => {
  it("keeps the current native walk mounted through a locale content fetch", async () => {
    const view = render(<WalkScreen />);
    await preview();
    fireEvent.click(screen.getByRole("button", { name: walkCopy("en").startWalk }));
    await screen.findByRole("button", { name: walkCopy("en").visited });
    const loads = mocks.load.mock.calls.length;
    const persistCalls = mocks.persist.mock.calls.length;
    mocks.locale = "de"; mocks.contentStatus = "loading";
    view.rerender(<WalkScreen />);
    expect(screen.queryByTestId("content-loader")).toBeNull();
    expect(mocks.load).toHaveBeenCalledTimes(loads);
    mocks.contentStatus = "available";
    view.rerender(<WalkScreen />);
    expect(mocks.load).toHaveBeenCalledTimes(loads);
    expect(mocks.persist).toHaveBeenCalledTimes(persistCalls);
  });
  it.each(["en", "de", "ar"] as const)("separates content fetch from real planner progress in %s", async locale => {
    mocks.locale = locale; mocks.contentStatus = "loading";
    mocks.load.mockResolvedValue(undefined);
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
    const { rerender } = render(<WalkScreen />);
    expect(screen.getByTestId("content-loader").textContent).toBe(discoveryCopy(locale).loadingWalkContent);
    expect(screen.queryByTestId("build-stage")).toBeNull();
    mocks.contentStatus = "available";
    rerender(<WalkScreen />);
    const t = walkCopy(locale);
    await screen.findByRole("button", { name: t.continue });
    fireEvent.click(screen.getByRole("button", { name: t.continue }));
    fireEvent.click(screen.getByRole("button", { name: t.continue }));
    fireEvent.click(screen.getByRole("button", { name: t.buildAction }));
    await waitFor(() => expect(screen.getByTestId("build-stage").textContent).toBe("matching"));
    expect(screen.queryByTestId("content-loader")).toBeNull();
    for (let stage = 0; stage < 4; stage++) await act(async () => frames.shift()!(0));
    expect(screen.getByRole("button", { name: t.startWalk })).toBeTruthy();
  });
});

describe("empty previews and confirmed start-over planning", () => {
  it("immediately disables Start when the last stop is removed and offers rebuild", async () => {
    setup(); await preview();
    const t = walkCopy("en");
    await waitFor(() => expect(mocks.changed).toBeTypeOf("function"));
    act(() => {
      mocks.current = { ...mocks.current!, journey: { ...mocks.current!.journey, remaining: [] } };
      mocks.changed?.(mocks.current);
    });
    const writes = mocks.persist.mock.calls.length;
    const start = screen.getByRole("button", { name: t.startWalk }) as HTMLButtonElement;
    expect(start.disabled).toBe(true); fireEvent.click(start);
    expect(mocks.persist).toHaveBeenCalledTimes(writes);
    expect(mocks.current?.phase).toBe("preview");
    expect(screen.getByText(t.emptyHelp)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: t.rebuild }));
    await screen.findByRole("dialog");
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: t.confirm }));
    await screen.findByRole("button", { name: t.continue });
    expect(screen.queryByRole("button", { name: t.startWalk })).toBeNull();
    expect(mocks.current).toBeUndefined(); expect(mocks.feedback).not.toHaveBeenCalled();
  });
  it.each([[], ["missing"]].map(remaining => ({ remaining })))("restores preview $remaining with safe empty/unresolved recovery", async ({ remaining }) => {
    mocks.current = { phase: "preview", journey: { id: "restored", citySlug: "city", remaining, visited: [], settings: { minutes: 120, interests: ["history"], walking: "balanced", start: places[0].coordinates }, startedAt: 10, historyDistance: 0, position: places[0].coordinates } };
    render(<NativeWalkFlow citySlug="city" cityName="City" places={places} />);
    const t = walkCopy("en"), start = await screen.findByRole("button", { name: t.startWalk });
    expect((start as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(remaining.length ? t.planContentUnavailable : t.emptyHelp)).toBeTruthy();
    expect(mocks.persist).not.toHaveBeenCalled();
  });
  it("keeps loading distinct and re-enables a valid preview after refreshed content arrives", async () => {
    const view = render(<WalkScreen />); await preview();
    const t = walkCopy("en"); mocks.contentStatus = "loading"; view.rerender(<WalkScreen />);
    expect((screen.getByRole("button", { name: t.startWalk }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("content-loader").textContent).toBe(discoveryCopy("en").loadingWalkContent);
    expect(screen.queryByText(t.emptyHelp)).toBeNull();
    mocks.contentStatus = "available"; view.rerender(<WalkScreen />);
    expect((screen.getByRole("button", { name: t.startWalk }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("shows recovery rather than indefinite loading after a preview content failure", async () => {
    const view = render(<NativeWalkFlow citySlug="city" cityName="City" places={places} />); await preview();
    const t = walkCopy("en");
    view.rerender(<NativeWalkFlow citySlug="city" cityName="City" places={places} contentStatus="error" />);
    expect(screen.queryByTestId("content-loader")).toBeNull();
    expect(screen.getByText(t.planContentUnavailable)).toBeTruthy();
    expect((screen.getByRole("button", { name: t.startWalk }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("keeps the preview unchanged when rebuild confirmation is cancelled", async () => {
    setup(); await preview(); const t = walkCopy("en"), before = structuredClone(mocks.current);
    const writes = mocks.persist.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: t.rebuild }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: translate("en", "common.cancel") }));
    expect(mocks.current).toEqual(before); expect(mocks.persist).toHaveBeenCalledTimes(writes);
    expect((screen.getByRole("button", { name: t.startWalk }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("keeps a failed reset and its recovery feedback visible inside confirmation", async () => {
    setup(); await preview(); const t = walkCopy("en"), before = structuredClone(mocks.current);
    fireEvent.click(screen.getByRole("button", { name: t.rebuild }));
    const dialog = await screen.findByRole("dialog");
    mocks.persist.mockRejectedValueOnce(new Error("disk full"));
    fireEvent.click(within(dialog).getByRole("button", { name: t.confirm }));
    await within(dialog).findByText("Save failed"); expect(mocks.current).toEqual(before);
    fireEvent.click(within(dialog).getByRole("button", { name: translate("en", "common.cancel") }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it.each(sharedLocales)("Cancel preserves exact active progress; Confirm rebuilds step 1 and a fresh preview in %s", async locale => {
    mocks.locale = locale; setup(); await preview(); const t = walkCopy(locale);
    fireEvent.click(screen.getByRole("button", { name: t.startWalk }));
    await screen.findByRole("button", { name: t.visited });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: t.visited })));
    const before = structuredClone(mocks.current), writes = mocks.persist.mock.calls.length;
    fireEvent.click(
      screen.getByRole("button", {
        name: translate(locale, "liveWalk.manageWalk"),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: t.rebuild }));
    let dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(t.rebuildHelp)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: translate(locale, "common.cancel") }));
    expect(mocks.current).toEqual(before); expect(mocks.persist).toHaveBeenCalledTimes(writes);
    expect(screen.getByRole("button", { name: t.visited })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: t.rebuild })); dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: t.confirm }));
    await screen.findByRole("button", { name: t.continue });
    expect((screen.getByLabelText(t.returnBy) as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("button", { name: t.hour2 }).getAttribute("aria-pressed")).toBe("true");
    expect(mocks.current).toBeUndefined(); expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.feedback).not.toHaveBeenCalled();
    await preview();
    const next = mocks.current!;
    expect(next.phase).toBe("preview"); expect(next.journey.id).not.toBe(before!.journey.id);
    expect(next.journey.citySlug).toBe("city"); expect(next.journey.visited).toEqual([]);
    expect(next.journey.historyDistance).toBe(0); expect(next.journey.settings.deadline).toBeUndefined();
    expect(next.journey.settings.minutes).toBe(120); expect(next.journey.settings.walking).toBe("balanced");
    expect(next.journey.settings.interests).toEqual(["history", "architecture"]);
    expect(next.journey.finishedAt).toBeUndefined();
    fireEvent.click(screen.getByRole("button", { name: t.startWalk }));
    await screen.findByRole("button", { name: t.visited });
    expect(mocks.current?.journey.id).toBe(next.journey.id);
    expect(new Set(mocks.current?.journey.remaining).size).toBe(mocks.current?.journey.remaining.length);
    expect(mocks.locale).toBe(locale);
  });
  it("offers true rebuild after an empty calculation rather than retrying its previous inputs", async () => {
    const expensive = places.map(place => ({ ...place, durationMinutes: 500 }));
    mocks.load.mockResolvedValue(undefined); mocks.persist.mockResolvedValue(undefined);
    render(<NativeWalkFlow citySlug="city" cityName="City" places={expensive} />);
    const t = walkCopy("en");
    await screen.findByRole("button", { name: t.continue });
    fireEvent.click(screen.getByRole("button", { name: t.hour1 }));
    fireEvent.click(screen.getByRole("button", { name: t.continue }));
    fireEvent.click(screen.getByRole("button", { name: t.continue }));
    fireEvent.click(screen.getByRole("button", { name: t.buildAction }));
    fireEvent.click(await screen.findByRole("button", { name: t.rebuild }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: t.confirm }));
    await screen.findByRole("button", { name: t.continue });
    expect(screen.getByRole("button", { name: t.hour2 }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("button", { name: t.startWalk })).toBeNull();
  });
});

describe("rendered Save eligibility backed by canonical persistence", () => {
  it.each(sharedLocales)("disables zero-stop Save and explains recovery in %s", async locale => {
    mocks.locale = locale; setup(); await preview(); const t = walkCopy(locale);
    fireEvent.click(screen.getByRole("button", { name: translate(mocks.locale, "saved.saveWalk") }));
    await screen.findByText(translate(mocks.locale, "saved.accountDone"));
    const saved = structuredClone(mocks.saved); expect(saved).toHaveLength(1);
    act(() => { mocks.current = { ...mocks.current!, journey: { ...mocks.current!.journey, remaining: [] } }; mocks.changed?.(mocks.current); });
    const save = screen.getByRole("button", { name: translate(mocks.locale, "saved.updateWalk") }) as HTMLButtonElement;
    expect(save.disabled).toBe(true); expect(screen.getByText(t.saveEmpty)).toBeTruthy();
    expect(screen.queryByText(translate(mocks.locale, "saved.accountDone"))).toBeNull();
    fireEvent.click(save); expect(mocks.saved).toEqual(saved); expect(mocks.save).toHaveBeenCalledOnce();
    expect((screen.getByRole("button", { name: t.startWalk }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: t.rebuild })).toBeTruthy();
  });
  it("rechecks a stale enabled button against the current persisted empty route", async () => {
    setup(); await preview(); const t = walkCopy("en");
    // Model a storage update before the subscriber/UI callback is delivered.
    mocks.current = { ...mocks.current!, journey: { ...mocks.current!.journey, remaining: [] } };
    fireEvent.click(screen.getByRole("button", { name: translate(mocks.locale, "saved.saveWalk") }));
    await screen.findByText(t.saveEmpty);
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.saved).toEqual([]);
    expect(screen.queryByText(translate(mocks.locale, "saved.accountDone"))).toBeNull();
  });
  it("keeps Save unavailable during content loading without calling the plan empty", async () => {
    const view = render(<WalkScreen />); await preview(); const t = walkCopy("en");
    mocks.contentStatus = "loading"; view.rerender(<WalkScreen />);
    expect((screen.getByRole("button", { name: translate(mocks.locale, "saved.saveWalk") }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText(t.saveEmpty)).toBeNull(); expect(mocks.save).not.toHaveBeenCalled();
    mocks.contentStatus = "available"; view.rerender(<WalkScreen />);
    expect((screen.getByRole("button", { name: translate(mocks.locale, "saved.saveWalk") }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("opens an old empty saved record with blocked Start/Save and recovery, without purging it", async () => {
    setup(); await preview();
    const empty = { ...mocks.current!.journey, remaining: [] };
    cleanup(); mocks.current = undefined; mocks.saved = [empty]; mocks.persist.mockClear();
    render(<NativeWalkFlow citySlug="city" cityName="City" places={places} savedId={empty.id} />);
    const t = walkCopy("en");
    await screen.findByRole("button", { name: t.startWalk });
    expect((screen.getByRole("button", { name: t.startWalk }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: translate(mocks.locale, "saved.walkSaved") }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: t.rebuild })).toBeTruthy();
    expect(mocks.saved).toEqual([empty]);
  });
  it("saves a finished itinerary with zero remaining stops and preserves the original visit", async () => {
    const completed = { id: "visited", citySlug: "city", remaining: [], visited: ["place-0"], settings: { minutes: 120, interests: ["history"], walking: "balanced", start: places[0].coordinates }, position: places[0].coordinates, historyDistance: 20, startedAt: 10 };
    mocks.load.mockResolvedValue(completed); mocks.persist.mockResolvedValue(undefined); mocks.save.mockResolvedValue(undefined);
    render(<NativeWalkFlow citySlug="city" cityName="City" places={places} />); const t = walkCopy("en");
    fireEvent.click(await screen.findByRole("button", { name: t.finish }));
    await screen.findByText(t.finished.replace("{city}", "City"));
    const save = screen.getByRole("button", { name: translate(mocks.locale, "saved.saveWalk") }) as HTMLButtonElement;
    expect(save.disabled).toBe(false); fireEvent.click(save);
    await screen.findByText(translate(mocks.locale, "saved.accountDone"));
    expect(mocks.saved[0].remaining).toEqual(["place-0"]); expect(mocks.saved[0].visited).toEqual([]);
    expect(mocks.saved[0].finishedAt).toBeUndefined();
    expect(mocks.current?.journey.finishedAt).toBeTypeOf("number");
  });
});


describe("rendered saved route state", () => {
  it("reopened route shows Saved, a changed route shows Update, and external removal resets Save", async () => {
    setup(); await preview();
    fireEvent.click(screen.getByRole("button", { name: translate("en", "saved.saveWalk") }));
    const savedButton = await screen.findByRole("button", { name: translate("en", "saved.walkSaved") });
    expect((savedButton as HTMLButtonElement).disabled).toBe(true);
    const record = structuredClone(mocks.saved[0]);
    cleanup(); mocks.current = undefined;
    render(<NativeWalkFlow citySlug="city" cityName="City" places={places} savedId={record.id} accountSaved />);
    expect((await screen.findByRole("button", { name: translate("en", "saved.walkSaved") }) as HTMLButtonElement).disabled).toBe(true);
    act(() => { mocks.current = { ...mocks.current!, journey: { ...mocks.current!.journey, remaining: mocks.current!.journey.remaining.slice(0, 1) } }; mocks.changed?.(mocks.current); });
    const update = await screen.findByRole("button", { name: translate("en", "saved.updateWalk") });
    fireEvent.click(update);
    await screen.findByRole("button", { name: translate("en", "saved.walkSaved") });
    expect(mocks.saved).toHaveLength(1); expect(mocks.saved[0].id).toBe(record.id);
    const { removeAccountWalk } = await import("../src/lib/accountWalks");
    await act(async () => { await removeAccountWalk("test-user", record.id); });
    expect((screen.getByRole("button", { name: translate("en", "saved.saveWalk") }) as HTMLButtonElement).disabled).toBe(false);
    expect((mocks.current as import("../src/lib/walkStorage").CurrentWalk | undefined)?.journey.remaining).toHaveLength(1);
  });
});

it("guest Save opens a cancelable gate without changing current walk or permanent records", async () => {
  mocks.guest = true; setup(); await preview();
  const before = JSON.stringify(mocks.current), writes = mocks.persist.mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: translate("en", "saved.saveWalk") }));
  const gate = screen.getByRole("dialog");
  expect(within(gate).getByText(translate("en", "saved.gateDescription"))).toBeTruthy();
  fireEvent.click(within(gate).getByRole("button", { name: translate("en", "saved.continueWithoutSaving") }));
  expect(screen.queryByRole("dialog")).toBeNull(); expect(JSON.stringify(mocks.current)).toBe(before);
  expect(mocks.persist.mock.calls.length).toBe(writes); expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.saved).toEqual([]);
});

it.each(["sign-up", "sign-in"] as const)("guest gate pushes %s without resetting or saving the walk", async entry => {
  mocks.guest = true; setup(); await preview();
  const before = JSON.stringify(mocks.current);
  fireEvent.click(screen.getByRole("button", { name: translate("en", "saved.saveWalk") }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: translate("en", entry === "sign-up" ? "profile.signUp" : "profile.signIn") }));
  const { router } = await import("expo-router");
  expect(router.push).toHaveBeenCalledWith({ pathname: "/account", params: { entry, returnToWalk: "1" } });
  expect(screen.queryByRole("dialog")).toBeNull(); expect(JSON.stringify(mocks.current)).toBe(before); expect(mocks.save).not.toHaveBeenCalled();
});
