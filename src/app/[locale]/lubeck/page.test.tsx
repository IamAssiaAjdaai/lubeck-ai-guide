import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connection: vi.fn(),
  getContentSource: vi.fn(),
  getPublicCitySnapshot: vi.fn(),
  placeDiscovery: vi.fn(),
  customTourPlanner: vi.fn(),
  tourCard: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not found");
  },
}));
vi.mock("@/lib/content/source", () => ({
  getContentSource: mocks.getContentSource,
}));
vi.mock("@/lib/content/publicRepository.server", () => ({
  getPublicCitySnapshot: mocks.getPublicCitySnapshot,
}));
vi.mock("@/components/travel/TourCard", () => ({
  default: (props: Record<string, unknown>) => {
    mocks.tourCard(props);
    return (
      <a data-top-action="tour" href={String(props.href)}>
        {String(props.ctaLabel)}
      </a>
    );
  },
}));
vi.mock("@/components/travel/CustomTourPlanner", () => ({
  default: (props: Record<string, unknown>) => {
    mocks.customTourPlanner(props);
    const labels = props.builderLabels as { build: string };
    return <button data-top-action="custom">{labels.build}</button>;
  },
}));
vi.mock("@/components/travel/PlaceDiscovery", () => ({
  default: (props: Record<string, unknown>) => {
    mocks.placeDiscovery(props);
    const places = props.places as readonly { slug: string; detailHref?: string }[];
    return (
      <div data-testid="place-links">
        {places.map((place) => (
          <a key={place.slug} href={place.detailHref}>{place.slug}</a>
        ))}
      </div>
    );
  },
}));

import LubeckPage from "@/app/[locale]/lubeck/page";
import { lubeckPlaces } from "@/data/places";
import { getTranslations } from "@/lib/i18n";

describe("Lübeck Explore hierarchy", () => {
  beforeEach(() => {
    mocks.connection.mockResolvedValue(undefined);
    mocks.getContentSource.mockReturnValue("code");
    mocks.getPublicCitySnapshot.mockResolvedValue({
      city: { slug: "lubeck", content: { en: { name: "Lübeck" } } },
      places: lubeckPlaces,
      tours: [],
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("orders the two start actions before Places and hides preferences in the custom flow", async () => {
    render(
      await LubeckPage({ params: Promise.resolve({ locale: "en" }) }),
    );

    const heading = screen.getByRole("heading", {
      level: 1,
      name: getTranslations("en").explore.title,
    });
    const actions = document.querySelectorAll("[data-top-action]");
    const placesHeading = screen.getByRole("heading", {
      level: 2,
      name: getTranslations("en").explore.places,
    });

    expect(actions).toHaveLength(2);
    expect(actions[0].getAttribute("data-top-action")).toBe("tour");
    expect(actions[1].getAttribute("data-top-action")).toBe("custom");
    expect(
      heading.compareDocumentPosition(actions[0]) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      actions[1].compareDocumentPosition(placesHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(mocks.customTourPlanner).toHaveBeenCalledWith(
      expect.objectContaining({
        preferenceLabels: getTranslations("en").tourPreferences,
      }),
    );
  });

  it("provides usable detail hrefs for all 25 published catalog places", async () => {
    render(
      await LubeckPage({ params: Promise.resolve({ locale: "en" }) }),
    );

    const links = screen.getByTestId("place-links").querySelectorAll("a");

    expect(links).toHaveLength(25);
    expect(
      [...links].every((link) =>
        link.getAttribute("href")?.startsWith("/en/lubeck/"),
      ),
    ).toBe(true);
  });

  it("uses the RTL back direction for Arabic", async () => {
    render(
      await LubeckPage({ params: Promise.resolve({ locale: "ar" }) }),
    );

    const back = screen.getByRole("link", {
      name: getTranslations("ar").common.back,
    });

    expect(back.closest("main")?.getAttribute("dir")).toBe("rtl");
    expect(back.querySelector(".lucide-arrow-right")).not.toBeNull();
  });
});
