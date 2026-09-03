import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CityMap, { type CityMapPlace } from "@/components/map/CityMap";
import { localizePlaceCategories } from "@/data/placeCategories";
import { getTranslations } from "@/lib/i18n";

const mocks = vi.hoisted(() => ({
  constructMap: vi.fn(),
  isWebGL2Supported: vi.fn(() => true),
  reportFailure: vi.fn(),
  markerAdd: vi.fn(),
}));

vi.mock("@/lib/mapSupport", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mapSupport")>();
  return {
    ...actual,
    isWebGL2Supported: mocks.isWebGL2Supported,
    reportMapInitializationFailure: mocks.reportFailure,
  };
});

vi.mock("maplibre-gl", () => {
  class MockMap {
    constructor(options: unknown) {
      return mocks.constructMap(options);
    }
  }

  class MockMarker {
    setLngLat() {
      return this;
    }

    addTo() {
      mocks.markerAdd();
      return this;
    }

    remove() {}
  }

  class MockNavigationControl {}

  class MockGPUInitializationError extends Error {
    constructor() {
      super("WebGL2 unavailable");
      this.name = "GPUInitializationError";
    }
  }

  return {
    Map: MockMap,
    Marker: MockMarker,
    NavigationControl: MockNavigationControl,
    GPUInitializationError: MockGPUInitializationError,
  };
});

const place = {
  slug: "museum",
  category: "see",
  name: "Museum",
  shortDescription: "Museum description",
  duration: "30 min",
  durationMinutes: 30,
  coordinates: { lat: 53.86, lng: 10.68 },
  requestedLocale: "en",
  actualLocale: "en",
  contentDirection: "ltr",
  didFallback: false,
} as const satisfies CityMapPlace;

function renderMap() {
  const t = getTranslations("en");
  return render(
    <CityMap
      places={[place]}
      categories={localizePlaceCategories(t)}
      locale="en"
      city="test-city"
      direction="ltr"
      labelledBy="map-heading"
      userLocationLabel={t.location.markerLabel}
      locationStatus="idle"
      locationControlLabel={t.location.use}
      onLocationControl={vi.fn()}
      centerUserLocationRequest={0}
      mapLabels={t.map}
    />,
  );
}

function createMapMock() {
  const handlers = new Map<string, (event: never) => void>();
  const map = {
    addControl: vi.fn(),
    on: vi.fn((event: string, handler: (payload: never) => void) => {
      handlers.set(event, handler);
    }),
    remove: vi.fn(),
    fitBounds: vi.fn(),
    easeTo: vi.fn(),
    getZoom: vi.fn(() => 13),
  };
  return { map, handlers };
}

describe("CityMap initialization", () => {
  beforeEach(() => {
    mocks.isWebGL2Supported.mockReturnValue(true);
    mocks.constructMap.mockReset();
    mocks.reportFailure.mockReset();
    mocks.markerAdd.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("renders the normal map controls and markers after successful initialization", () => {
    const { map } = createMapMock();
    mocks.constructMap.mockReturnValue(map);

    renderMap();

    expect(mocks.constructMap).toHaveBeenCalledOnce();
    expect(map.addControl).toHaveBeenCalledOnce();
    expect(mocks.markerAdd).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Use my location" })).not.toBeNull();
    expect(screen.queryByText(getTranslations("en").map.unavailable)).toBeNull();
  });

  it("shows a non-retryable fallback when WebGL2 is unavailable", async () => {
    mocks.isWebGL2Supported.mockReturnValue(false);

    renderMap();

    expect(
      await screen.findByText(getTranslations("en").map.unavailable),
    ).not.toBeNull();
    expect(mocks.constructMap).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Retry map" })).toBeNull();
  });

  it("shows the fixed failure category only in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.isWebGL2Supported.mockReturnValue(false);

    renderMap();

    expect(await screen.findByText("DEV: webgl2_unavailable")).not.toBeNull();
  });

  it("does not expose the failure category in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.isWebGL2Supported.mockReturnValue(false);

    renderMap();

    expect(
      await screen.findByText(getTranslations("en").map.unavailable),
    ).not.toBeNull();
    expect(screen.queryByText(/^DEV:/)).toBeNull();
  });

  it("catches constructor failures and offers a clean retry", async () => {
    mocks.constructMap.mockImplementation(() => {
      throw new Error("Constructor failed");
    });

    renderMap();

    expect(
      await screen.findByText(getTranslations("en").map.unavailable),
    ).not.toBeNull();
    expect(screen.getByRole("button", { name: "Retry map" })).not.toBeNull();
    expect(mocks.reportFailure).toHaveBeenCalledWith(
      "constructor",
      expect.any(Error),
    );
  });

  it("falls back for fatal startup errors but ignores transient tile errors", async () => {
    const first = createMapMock();
    mocks.constructMap.mockReturnValue(first.map);
    renderMap();

    act(() => {
      first.handlers.get("error")?.({
        error: new Error("Tile failed"),
        sourceId: "vector-tiles",
      } as never);
    });
    expect(screen.queryByText(getTranslations("en").map.unavailable)).toBeNull();

    act(() => {
      first.handlers.get("error")?.({
        error: new Error("Style failed"),
      } as never);
    });
    await waitFor(() => {
      expect(screen.getByText(getTranslations("en").map.unavailable)).not.toBeNull();
    });
  });
});
