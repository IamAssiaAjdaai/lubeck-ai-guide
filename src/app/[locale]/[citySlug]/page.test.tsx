import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connection: vi.fn(),
  getContentSource: vi.fn(),
  getPublicCitySnapshot: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));
vi.mock("@/lib/content/source", () => ({
  getContentSource: mocks.getContentSource,
}));
vi.mock("@/lib/content/publicRepository.server", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/content/publicRepository.server")
  >("@/lib/content/publicRepository.server");
  return {
    ...actual,
    getPublicCitySnapshot: mocks.getPublicCitySnapshot,
  };
});

import { GenericCityContent } from "@/app/[locale]/[citySlug]/page";
import {
  resolveCityPlannerOrigin,
} from "@/components/travel/CityExperience";
import type { PublicCitySnapshot } from "@/lib/content/publicRepository.server";
import { getCityScopedTourId } from "@/lib/tourIdentity";

describe("generic public city landing", () => {
  beforeEach(() => {
    mocks.connection.mockResolvedValue(undefined);
    mocks.getContentSource.mockReturnValue("database");
    mocks.getPublicCitySnapshot.mockResolvedValue(snapshot());
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders a discoverable published city and its published places", async () => {
    render(await renderPage("en", "ghent"));

    expect(screen.getByRole("heading", { name: "Ghent", level: 1 })).not.toBeNull();
    expect(screen.getByText("A compact published city description.")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Gravensteen", level: 3 })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Gravensteen" }).closest("a")?.getAttribute("href"))
      .toBe("/en/ghent/gravensteen");
    expect(screen.getByRole("img", { name: "Ghent" }).getAttribute("src"))
      .toBe("/api/media/city-hero");
    expect(document.querySelector('img[src="/api/media/place-card"]')).not.toBeNull();
    expect(screen.getByText("Hidden gems")).not.toBeNull();
    expect(mocks.getPublicCitySnapshot).toHaveBeenCalledWith("ghent", "database");
    expect(mocks.getPublicCitySnapshot).toHaveBeenCalledTimes(1);
  });

  it("renders only public-safe attribution for database-backed city hero media", async () => {
    const data = snapshot();
    mocks.getPublicCitySnapshot.mockResolvedValue(snapshot({
      media: {
        ...data.media,
        city: [{
          ...data.media.city[0],
          attribution: {
            text: "Photo: Example · CC BY 4.0 · https://creativecommons.org/licenses/by/4.0/",
            creator: "Example",
          },
        }],
      },
    }));

    render(await renderPage("en", "ghent"));

    expect(screen.getByText(/Photo: Example/).closest("figcaption")).not.toBeNull();
    expect(
      screen
        .getByRole("link", {
          name: "https://creativecommons.org/licenses/by/4.0/",
        })
        .getAttribute("rel"),
    ).toBe("noreferrer");
    expect(document.body.textContent).not.toContain("reviewer");
    expect(document.body.textContent).not.toContain("evidence");
  });

  it("keeps a city with no published tour complete without rendering an empty tour card", async () => {
    render(await renderPage("en", "ghent"));

    expect(screen.queryByText("Walking Tour")).toBeNull();
    expect(screen.getByRole("button", { name: "Build my tour" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Gravensteen" })).not.toBeNull();
  });

  it("renders a localized published tour in stop order and starts at its lowest position", async () => {
    mocks.getPublicCitySnapshot.mockResolvedValue(snapshot({
      tours: [{
        slug: "medieval-ghent",
        estimatedDurationMinutes: 75,
        content: {
          en: {
            title: "Medieval Ghent",
            shortDescription: "A curated old-city walk.",
          },
        },
        stops: [
          { placeSlug: "belfry", position: 2 },
          { placeSlug: "gravensteen", position: 1 },
        ],
      }],
      places: [
        ghentPlace("gravensteen", "Gravensteen", 51.057, 3.721),
        ghentPlace("belfry", "Belfry", 51.054, 3.725),
      ],
    }));

    render(await renderPage("en", "ghent"));

    expect(screen.getByRole("heading", { name: "Medieval Ghent" })).not.toBeNull();
    expect(screen.getByText("A curated old-city walk.")).not.toBeNull();
    expect(screen.getByText("75 min")).not.toBeNull();
    expect(screen.getByText("2 Stops")).not.toBeNull();
    const orderedStops = document.querySelectorAll("ol li");
    expect(orderedStops[0]?.textContent).toContain("Gravensteen");
    expect(orderedStops[1]?.textContent).toContain("Belfry");
    expect(screen.getByRole("link", { name: "Start Walking Tour" }).getAttribute("href"))
      .toBe("/en/ghent/gravensteen");
  });

  it("supports multiple published tours from the same snapshot", async () => {
    const data = snapshot();
    mocks.getPublicCitySnapshot.mockResolvedValue(snapshot({
      tours: [
        tour("medieval", "Medieval walk", "gravensteen"),
        tour("canals", "Canal walk", "gravensteen"),
      ],
      places: data.places,
    }));

    render(await renderPage("en", "ghent"));

    expect(screen.getByRole("heading", { name: "Medieval walk" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Canal walk" })).not.toBeNull();
    expect(screen.getAllByRole("link", { name: "Start Walking Tour" })).toHaveLength(2);
  });

  it("uses city-scoped tour identity and a safe planner-origin fallback", () => {
    const withoutTour = snapshot() as PublicCitySnapshot;
    const withTour = snapshot({
      places: [
        ghentPlace("first-catalog-place", "First catalog place", 51, 3),
        ghentPlace("tour-start", "Tour start", 52, 4),
      ],
      tours: [{
        ...tour("route", "Route", "tour-start"),
        stops: [
          { placeSlug: "first-catalog-place", position: 2 },
          { placeSlug: "tour-start", position: 1 },
        ],
      }],
    }) as PublicCitySnapshot;

    expect(getCityScopedTourId("ghent", "route"))
      .toBe("citywalk:ghent:tour:route");
    expect(resolveCityPlannerOrigin(withTour)).toEqual({ lat: 52, lng: 4 });
    expect(resolveCityPlannerOrigin(withoutTour)).toEqual({
      lat: 51.057,
      lng: 3.721,
    });
  });

  it("uses semantic language and direction for fallback content", async () => {
    render(await renderPage("ar", "ghent"));

    const heading = screen.getByRole("heading", { name: "Ghent", level: 1 });
    expect(document.querySelector("main")?.getAttribute("dir")).toBe("rtl");
    expect(heading.closest("[lang]")?.getAttribute("lang")).toBe("en");
    expect(heading.closest("[dir]")?.getAttribute("dir")).toBe("ltr");
  });

  it("keeps fallback tour content semantically LTR inside an Arabic interface", async () => {
    mocks.getPublicCitySnapshot.mockResolvedValue(snapshot({
      tours: [tour("medieval", "Medieval walk", "gravensteen")],
    }));

    render(await renderPage("ar", "ghent"));

    const title = screen.getByRole("heading", { name: "Medieval walk" });
    expect(title.closest("[lang]")?.getAttribute("lang")).toBe("en");
    expect(title.closest("[dir]")?.getAttribute("dir")).toBe("ltr");
    expect(title.closest("main")?.getAttribute("dir")).toBe("rtl");
  });

  it.each([
    ["en", "unknown"],
    ["en", "draft-city"],
    ["en", "published-without-places"],
  ])("returns not found for unavailable city %s/%s", async (locale, citySlug) => {
    mocks.getPublicCitySnapshot.mockRejectedValue(new Error("unavailable"));

    await expect(renderPage(locale, citySlug)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });

  it("returns not found for an invalid locale without reading content", async () => {
    await expect(renderPage("xx", "ghent")).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mocks.getPublicCitySnapshot).not.toHaveBeenCalled();
    expect(mocks.connection).not.toHaveBeenCalled();
  });
});

function renderPage(locale: string, citySlug: string) {
  return GenericCityContent({
    params: Promise.resolve({ locale, citySlug }),
  });
}

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    city: {
      slug: "ghent",
      content: {
        en: {
          name: "Ghent",
          shortDescription: "A compact published city description.",
        },
      },
    },
    places: [{
      slug: "gravensteen",
      city: "ghent",
      category: "see",
      coordinates: { lat: 51.057, lng: 3.721 },
      durationMinutes: 45,
      environment: "mixed",
      pricing: "paid",
      tags: ["history", "hidden-gem"],
      content: {
        en: {
          name: "Gravensteen",
          shortDescription: "A published place description.",
        },
      },
    }],
    tours: [],
    media: {
      city: [{
        assetKey: "city-hero",
        kind: "image",
        purpose: "hero",
        url: "/api/media/city-hero",
        mimeType: "image/jpeg",
      }],
      places: {
        gravensteen: [{
          assetKey: "place-card",
          kind: "image",
          purpose: "card",
          url: "/api/media/place-card",
          mimeType: "image/jpeg",
        }],
      },
      tours: {},
    },
    ...overrides,
  };
}

function ghentPlace(
  slug: string,
  name: string,
  lat: number,
  lng: number,
) {
  return {
    slug,
    city: "ghent",
    category: "see" as const,
    coordinates: { lat, lng },
    durationMinutes: 45,
    environment: "mixed" as const,
    pricing: "paid" as const,
    tags: ["history"],
    content: {
      en: {
        name,
        shortDescription: "A published place description.",
      },
    },
  };
}

function tour(slug: string, title: string, placeSlug: string) {
  return {
    slug,
    estimatedDurationMinutes: 45,
    content: { en: { title } },
    stops: [{ placeSlug, position: 1 }],
  };
}
