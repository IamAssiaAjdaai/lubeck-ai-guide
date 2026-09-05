import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PlaceDiscovery, {
  type DiscoveryPlace,
} from "@/components/travel/PlaceDiscovery";
import { localizePlaceCategories } from "@/data/placeCategories";
import { formatDistance, formatWalkingTime } from "@/lib/distance";
import { getTranslations } from "@/lib/i18n";


const { capture, mapUnavailable } = vi.hoisted(() => ({
  capture: vi.fn(),
  mapUnavailable: { value: false },
}));

vi.mock("posthog-js", () => ({
  default: { capture },
}));

vi.mock("@/components/map/CityMap", () => ({
  default: ({
    places: mapPlaces,
    userLocation,
    userLocationLabel,
    locationStatus,
    locationControlLabel,
    onLocationControl,
    centerUserLocationRequest,
    mapLabels,
  }: {
    places: readonly DiscoveryPlace[];
    userLocation?: { lat: number; lng: number };
    userLocationLabel: string;
    locationStatus: string;
    locationControlLabel: string;
    onLocationControl: () => void;
    centerUserLocationRequest: number;
    mapLabels: { unavailable: string };
  }) => {
    if (mapUnavailable.value) {
      return <div role="status">{mapLabels.unavailable}</div>;
    }

    return <div data-testid="city-map">
      <button
        type="button"
        aria-label={locationControlLabel}
        aria-busy={locationStatus === "requesting"}
        disabled={locationStatus === "requesting" || locationStatus === "unsupported"}
        data-location-status={locationStatus}
        onClick={onLocationControl}
      />
      <div
        data-testid="city-map-marker-count"
        data-user-location={userLocation ? "available" : "absent"}
        data-user-location-label={userLocationLabel}
        data-center-request={centerUserLocationRequest}
        data-first-distance-meters={mapPlaces[0]?.distance?.distanceMeters}
        data-first-walking-minutes={mapPlaces[0]?.distance?.walkingMinutes}
      >
        {mapPlaces.length}
      </div>
    </div>;
  },
}));

const places = [
  {
    slug: "museum",
    category: "see",
    name: "Museum",
    shortDescription: "A museum without a supplied image.",
    duration: "30 min",
    durationMinutes: 30,
    coordinates: { lat: 53.86, lng: 10.68 },
    requestedLocale: "en",
    actualLocale: "en",
    contentDirection: "ltr",
    didFallback: false,
    detailHref: "/en/test-city/museum",
  },
  {
    slug: "cafe",
    category: "eat",
    name: "Cafe",
    shortDescription: "A cafe without a supplied image.",
    duration: "45 min",
    durationMinutes: 45,
    coordinates: { lat: 53.87, lng: 10.69 },
    requestedLocale: "fr",
    actualLocale: "en",
    contentDirection: "ltr",
    didFallback: true,
    fallbackLabel: "Content shown in English",
  },
  {
    slug: "theatre",
    category: "fun",
    name: "Theatre",
    shortDescription: "A theatre without a supplied image.",
    duration: "90 min",
    durationMinutes: 90,
    coordinates: { lat: 53.88, lng: 10.7 },
    requestedLocale: "en",
    actualLocale: "en",
    contentDirection: "ltr",
    didFallback: false,
    detailHref: "/en/test-city/theatre",
  },
] as const satisfies readonly DiscoveryPlace[];

describe("PlaceDiscovery", () => {
  afterEach(() => {
    cleanup();
    capture.mockReset();
    mapUnavailable.value = false;
    vi.unstubAllGlobals();
  });

  it("filters cards, map markers, and tracks category selection", async () => {
    render(
      <section>
        <h2 id="places-heading">Places</h2>
        <PlaceDiscovery
          places={places}
          categories={localizePlaceCategories(getTranslations("en"))}
          locale="en"
          city="test-city"
          direction="ltr"
          labelledBy="places-heading"
          locationLabels={getTranslations("en").location}
          mapLabels={getTranslations("en").map}
          distanceLabels={getTranslations("en").distance}
          storyLabel={getTranslations("en").landmark.listenStory}
        />
      </section>,
    );

    expect(screen.getByText("Museum")).not.toBeNull();
    expect(screen.getByText("Cafe")).not.toBeNull();
    expect(screen.getByText("Theatre")).not.toBeNull();
    expect((await screen.findByTestId("city-map-marker-count")).textContent).toBe(
      "3",
    );

    const allButton = screen.getByRole("button", { name: "All (3)" });
    const eatButton = screen.getByRole("button", { name: "Eat (1)" });

    expect(allButton.getAttribute("aria-pressed")).toBe("true");
    expect(eatButton.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(eatButton);

    expect(screen.queryByText("Museum")).toBeNull();
    expect(screen.getByText("Cafe")).not.toBeNull();
    expect(screen.queryByText("Theatre")).toBeNull();
    expect(screen.getByTestId("city-map-marker-count").textContent).toBe("1");
    expect(screen.getByText("Content shown in English")).not.toBeNull();
    expect(allButton.getAttribute("aria-pressed")).toBe("false");
    expect(eatButton.getAttribute("aria-pressed")).toBe("true");
    expect(capture).toHaveBeenCalledWith("place_category_selected", {
      category: "eat",
      city: "test-city",
      locale: "en",
    });
  });

  it("keeps Arabic chrome RTL while English fallback content is LTR", () => {
    const englishFallback = {
      ...places[1],
      requestedLocale: "ar",
      tags: ["hidden-gem"],
      visitNote: "Please respect residents' privacy.",
      fallbackLabel: "المحتوى باللغة English",
    } as const satisfies DiscoveryPlace;

    render(
      <section dir="rtl">
        <h2 id="arabic-places-heading">الأماكن</h2>
        <PlaceDiscovery
          places={[englishFallback]}
          categories={localizePlaceCategories(getTranslations("ar"))}
          locale="ar"
          city="test-city"
          direction="rtl"
          labelledBy="arabic-places-heading"
          locationLabels={getTranslations("ar").location}
          mapLabels={getTranslations("ar").map}
          distanceLabels={getTranslations("ar").distance}
          storyLabel={getTranslations("ar").landmark.listenStory}
          hiddenGemLabel={
            getTranslations("ar").tourPreferences["hidden-gems"]
          }
        />
      </section>,
    );

    const content = screen.getByRole("heading", { name: "Cafe" }).closest(
      "[lang]",
    );

    expect(screen.getByRole("group").closest("[dir]")?.getAttribute("dir")).toBe(
      "rtl",
    );
    expect(content?.getAttribute("lang")).toBe("en");
    expect(content?.getAttribute("dir")).toBe("ltr");
    expect(screen.getByText("المحتوى باللغة English")).not.toBeNull();
    expect(
      screen.getByText(
        getTranslations("ar").tourPreferences["hidden-gems"],
      ),
    ).not.toBeNull();
    expect(
      screen.getByText("Please respect residents' privacy."),
    ).not.toBeNull();
  });

  it("keeps place cards and category filtering usable when the map fails", () => {
    mapUnavailable.value = true;
    const t = getTranslations("en");

    render(
      <section>
        <h2 id="fallback-places-heading">Places</h2>
        <PlaceDiscovery
          places={places}
          categories={localizePlaceCategories(t)}
          locale="en"
          city="test-city"
          direction="ltr"
          labelledBy="fallback-places-heading"
          locationLabels={t.location}
          mapLabels={t.map}
          distanceLabels={t.distance}
          storyLabel={t.landmark.listenStory}
        />
      </section>,
    );

    expect(screen.getByText(t.map.unavailable)).not.toBeNull();
    expect(screen.getByText("Museum")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Eat (1)" }));
    expect(screen.queryByText("Museum")).toBeNull();
    expect(screen.getByText("Cafe")).not.toBeNull();
  });

  it("requests location only after user action and passes it to the map", async () => {
    const getCurrentPosition = vi.fn<Geolocation["getCurrentPosition"]>(
      (success) =>
        success({
          coords: { latitude: 53.865, longitude: 10.686, accuracy: 9 },
          timestamp: 2468,
        } as GeolocationPosition),
    );
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    render(
      <section>
        <h2 id="location-places-heading">Places</h2>
        <PlaceDiscovery
          places={places}
          categories={localizePlaceCategories(getTranslations("en"))}
          locale="en"
          city="test-city"
          direction="ltr"
          labelledBy="location-places-heading"
          locationLabels={getTranslations("en").location}
          mapLabels={getTranslations("en").map}
          distanceLabels={getTranslations("en").distance}
          storyLabel={getTranslations("en").landmark.listenStory}
        />
      </section>,
    );

    const map = await screen.findByTestId("city-map-marker-count");
    const gpsControl = screen.getByRole("button", { name: "Use my location" });
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(map.getAttribute("data-user-location")).toBe("absent");
    expect(map.getAttribute("data-user-location-label")).toBe("Your location");
    expect(map.getAttribute("data-first-distance-meters")).toBeNull();
    expect(gpsControl.closest('[data-testid="city-map"]')).not.toBeNull();
    expect(
      screen.getByText(
        "Your location stays in this browser and is used only for nearby features on this page.",
      ).tagName,
    ).toBe("P");

    fireEvent.click(gpsControl);

    await waitFor(() => {
      expect(map.getAttribute("data-user-location")).toBe("available");
      expect(capture).toHaveBeenCalledWith("location_available", {
        city: "test-city",
        locale: "en",
      });
    });
    expect(getCurrentPosition).toHaveBeenCalledOnce();
    expect(capture).toHaveBeenCalledWith("location_requested", {
      city: "test-city",
      locale: "en",
    });

    const firstDistanceMeters = Number(
      map.getAttribute("data-first-distance-meters"),
    );
    const firstWalkingMinutes = Number(
      map.getAttribute("data-first-walking-minutes"),
    );
    expect(firstDistanceMeters).toBeGreaterThan(0);
    expect(
      screen.getByText(formatDistance(firstDistanceMeters, "en") ?? ""),
    ).not.toBeNull();
    expect(
      screen.getByText(
        formatWalkingTime(
          firstWalkingMinutes,
          "en",
          getTranslations("en").distance.walkingMinutes,
        ) ?? "",
      ),
    ).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Your location" }));

    expect(getCurrentPosition).toHaveBeenCalledOnce();
    expect(map.getAttribute("data-center-request")).toBe("1");
    expect(
      capture.mock.calls.filter(([eventName]) =>
        eventName === "location_requested",
      ),
    ).toHaveLength(1);

    const locationEvents = capture.mock.calls.filter(([eventName]) =>
      String(eventName).startsWith("location_"),
    );
    expect(JSON.stringify(locationEvents)).not.toMatch(
      /latitude|longitude|accuracy|timestamp|distance|walkingMinutes|\blat\b|\blng\b|53\.865|10\.686/,
    );
  });

  it("keeps the map and retry control usable after permission denial", async () => {
    const getCurrentPosition = vi.fn<Geolocation["getCurrentPosition"]>(
      (_, error) =>
        error?.({
          code: 1,
          message: "Denied",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        }),
    );
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    render(
      <section>
        <h2 id="denied-places-heading">Places</h2>
        <PlaceDiscovery
          places={places}
          categories={localizePlaceCategories(getTranslations("en"))}
          locale="en"
          city="test-city"
          direction="ltr"
          labelledBy="denied-places-heading"
          locationLabels={getTranslations("en").location}
          mapLabels={getTranslations("en").map}
          distanceLabels={getTranslations("en").distance}
          storyLabel={getTranslations("en").landmark.listenStory}
        />
      </section>,
    );

    const originalOrder = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);

    expect(originalOrder).toEqual([
      "Museum",
      "Cafe",
      "Theatre",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Use my location" }));

    const retryControl = await screen.findByRole("button", {
      name: "Try again",
    });

    const orderAfterDenial = screen
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);

    expect(orderAfterDenial).toEqual([
      "Museum",
      "Cafe",
      "Theatre",
    ]);
    expect(retryControl.hasAttribute("disabled")).toBe(false);
    expect(screen.getByTestId("city-map")).not.toBeNull();
    expect(screen.getByText("Museum")).not.toBeNull();
    expect(
      screen.getByText(
        "Location permission was denied. Allow it in your browser settings and try again.",
      ),
    ).not.toBeNull();
    expect(capture).toHaveBeenCalledWith("location_permission_denied", {
      city: "test-city",
      locale: "en",
    });
  });

  it("ranks place cards from nearest to farthest after location becomes available", async () => {
  const getCurrentPosition = vi.fn<Geolocation["getCurrentPosition"]>(
    (success) =>
      success({
        coords: {
          latitude: 53.865,
          longitude: 10.686,
          accuracy: 9,
        },
        timestamp: 2468,
      } as GeolocationPosition),
  );

  vi.stubGlobal("navigator", {
    geolocation: { getCurrentPosition },
  });

  const t = getTranslations("en");

  render(
    <section>
      <h2 id="near-me-heading">Places</h2>

      <PlaceDiscovery
        places={places}
        categories={localizePlaceCategories(t)}
        locale="en"
        city="test-city"
        direction="ltr"
        labelledBy="near-me-heading"
        locationLabels={t.location}
        mapLabels={t.map}
        distanceLabels={t.distance}
        storyLabel={getTranslations("en").landmark.listenStory}
      />
    </section>,
  );

  const beforeLocation = screen
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);

  expect(beforeLocation).toEqual([
    "Museum",
    "Cafe",
    "Theatre",
  ]);

  fireEvent.click(
    await screen.findByRole("button", {
      name: t.location.use,
    }),
  );

  await waitFor(() => {
    const afterLocation = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);

    expect(afterLocation).toEqual([
      "Cafe",
      "Museum",
      "Theatre",
    ]);
  });
  });

  it("shows an arrival prompt once when live location enters the radius", async () => {
    let watchSuccess: PositionCallback | undefined;

    const getCurrentPosition =
      vi.fn<Geolocation["getCurrentPosition"]>((success) =>
        success({
          coords: {
            latitude: 53.85,
            longitude: 10.67,
            accuracy: 8,
          },
          timestamp: 1000,
        } as GeolocationPosition),
      );

    const watchPosition =
      vi.fn<Geolocation["watchPosition"]>((success) => {
        watchSuccess = success;
        return 10;
      });

    const clearWatch =
      vi.fn<Geolocation["clearWatch"]>();

    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition,
        watchPosition,
        clearWatch,
      },
    });

    const t = getTranslations("en");

    render(
      <section>
        <h2 id="arrival-heading">Places</h2>

        <PlaceDiscovery
          places={places}
          categories={localizePlaceCategories(t)}
          locale="en"
          city="test-city"
          direction="ltr"
          labelledBy="arrival-heading"
          locationLabels={t.location}
          mapLabels={t.map}
          distanceLabels={t.distance}
          storyLabel={t.landmark.listenStory}
        />
      </section>,
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: t.location.use,
      }),
    );

    expect(
      screen.queryByText("You've arrived at Museum."),
    ).toBeNull();

    await waitFor(() => {
      expect(watchPosition).toHaveBeenCalledOnce();
      expect(watchSuccess).toBeDefined();
    });

    act(() => {
      watchSuccess?.({
        coords: {
          latitude: 53.8601,
          longitude: 10.68,
          accuracy: 8,
        },
        timestamp: 2000,
      } as GeolocationPosition);
    });

    expect(
      await screen.findByText("You've arrived at Museum."),
    ).not.toBeNull();

    expect(
      screen.getByRole("link", {
        name: t.landmark.listenStory,
      }),
    ).not.toBeNull();

    expect(capture).toHaveBeenCalledWith(
      "arrival_detected",
      {
        city: "test-city",
        locale: "en",
        place_slug: "museum",
      },
    );

    act(() => {
      watchSuccess?.({
        coords: {
          latitude: 53.85,
          longitude: 10.67,
          accuracy: 8,
        },
        timestamp: 3000,
      } as GeolocationPosition);
    });

    await waitFor(() => {
      expect(
        screen.queryByText("You've arrived at Museum."),
      ).toBeNull();
    });

    act(() => {
      watchSuccess?.({
        coords: {
          latitude: 53.8601,
          longitude: 10.68,
          accuracy: 8,
        },
        timestamp: 4000,
      } as GeolocationPosition);
    });

    await waitFor(() => {
      const arrivalEvents = capture.mock.calls.filter(
        ([eventName]) => eventName === "arrival_detected",
      );

      expect(arrivalEvents).toHaveLength(1);
    });
  });
});
