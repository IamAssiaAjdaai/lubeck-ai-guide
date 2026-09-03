import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PlaceDiscovery, {
  type DiscoveryPlace,
} from "@/components/travel/PlaceDiscovery";
import { localizePlaceCategories } from "@/data/placeCategories";
import { getTranslations } from "@/lib/i18n";

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));

vi.mock("posthog-js", () => ({
  default: { capture },
}));

vi.mock("@/components/map/CityMap", () => ({
  default: ({ places: mapPlaces }: { places: readonly DiscoveryPlace[] }) => (
    <div data-testid="city-map-marker-count">{mapPlaces.length}</div>
  ),
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
  },
] as const satisfies readonly DiscoveryPlace[];

describe("PlaceDiscovery", () => {
  afterEach(() => {
    cleanup();
    capture.mockReset();
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
  });
});
