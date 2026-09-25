// @vitest-environment jsdom
import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  persist: vi.fn(),
  save: vi.fn(),
  share: vi.fn(),
  feedback: vi.fn(),
  location: vi.fn(),
  locale: "en",
}));
vi.mock("expo-router", () => ({
  Link: ({ children, href, push }: React.PropsWithChildren<{ href: unknown; push?: boolean }>) =>
    <a data-route={JSON.stringify(href)} data-push={String(Boolean(push))}>{children}</a>,
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("react-native", () => ({
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
  }: {
    label: string;
    onPress?: () => void;
    disabled?: boolean;
  }) => (
    <button disabled={disabled} onClick={onPress}>
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
  V2Loading: ({ stage }: { stage: string }) => <span data-testid="build-stage">{stage}</span>,
  V2WalkError: ({ retry, close }: { retry: () => void; close: () => void }) => (
    <div role="alert">
      <button onClick={retry}>Retry</button>
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
vi.mock("../src/lib/location.expo", () => ({
  expoForegroundLocationAdapter: {},
}));
vi.mock("../src/lib/location", () => ({
  requestForegroundLocation: mocks.location,
}));
vi.mock("../src/lib/walkStorage", () => ({
  loadActiveWalk: mocks.load,
  loadSavedWalks: async () => [],
  persistActiveWalk: mocks.persist,
  saveNativeWalk: mocks.save,
  saveWalkFeedback: mocks.feedback,
}));
vi.mock("../src/lib/tripStorage", () => ({ loadLocalTrips: async () => [] }));
vi.mock("../src/localization/LocaleProvider", () => ({
  useNativeLocale: () => ({
    locale: mocks.locale,
    messages: { tripSaveFailed: "Save failed", unavailable: "Unavailable" },
  }),
}));
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
function setup() {
  mocks.load.mockResolvedValue(undefined);
  mocks.persist.mockResolvedValue(undefined);
  mocks.save.mockResolvedValue(undefined);
  mocks.feedback.mockResolvedValue(undefined);
  mocks.share.mockResolvedValue({});
  mocks.location.mockResolvedValue({ status: "denied" });
  render(<NativeWalkFlow citySlug="city" cityName="City" places={places} />);
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.locale = "en";
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
  it.each(["en", "de", "ar"])(
    "plans, previews, saves and starts in %s",
    async (locale) => {
      mocks.locale = locale;
      setup();
      await preview();
      const t = walkCopy(locale);
      fireEvent.click(screen.getByRole("button", { name: t.save }));
      await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
      fireEvent.click(screen.getByRole("button", { name: t.startWalk }));
      await screen.findByRole("button", { name: t.visited });
      expect(mocks.persist).toHaveBeenCalledOnce();
    },
  );
  it("retains the itinerary until a shortening proposal is confirmed", async () => {
    setup();
    await preview();
    const t = walkCopy("en");
    fireEvent.click(screen.getByRole("button", { name: t.startWalk }));
    fireEvent.click(
      screen.getByRole("button", { name: `${t.tired} · ${t.shorten}` }),
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    const before = mocks.persist.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: t.keep }));
    expect(mocks.persist).toHaveBeenCalledTimes(before);
    fireEvent.click(
      screen.getByRole("button", { name: `${t.tired} · ${t.shorten}` }),
    );
    fireEvent.click(screen.getByRole("button", { name: t.confirm }));
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
    fireEvent.click(screen.getByRole("button", { name: t.visited }));
    fireEvent.click(screen.getByRole("button", { name: t.finish }));
    expect(
      screen.getByRole("heading", { name: "You explored City" }),
    ).toBeTruthy();
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
    fireEvent.click(screen.getByRole("button", { name: t.visited }));
    fireEvent.click(screen.getByRole("button", { name: t.takeBack }));
    fireEvent.click(screen.getByRole("button", { name: t.tripStart }));
    const before = mocks.persist.mock.calls.length;
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(mocks.persist).toHaveBeenCalledTimes(before);
    fireEvent.click(screen.getByRole("button", { name: t.confirm }));
    expect(mocks.persist.mock.lastCall![0].remaining).toEqual([]);
    expect(mocks.persist.mock.lastCall![0].visited).toEqual(["place-0"]);
    expect(screen.getByRole("heading", { name: t.remaining })).toBeTruthy();
    expect(screen.getByRole("button", { name: t.navigate })).toBeTruthy();
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
    fireEvent.click(
      screen.getByRole("button", { name: walkCopy("en").confirm }),
    );
    expect(mocks.persist.mock.lastCall![0].remaining).toEqual([
      "place-0",
      "place-1",
    ]);
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
    fireEvent.click(screen.getByRole("button", { name: t.confirm }));
    assertActions(next);
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
