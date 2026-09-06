import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getDb, getPublicMediaSnapshot } = vi.hoisted(() => ({
  getDb: vi.fn(),
  getPublicMediaSnapshot: vi.fn(),
}));
vi.mock("@/db/client", () => ({ getDb }));
vi.mock("@/lib/media/publicMedia.server", () => ({ getPublicMediaSnapshot }));

import {
  getPublicCitySummaries,
  getPublicCitySnapshot,
  resolvePublicLocalization,
  toLocalizedPublicCityResponse,
} from "@/lib/content/publicRepository.server";

describe("public content repository", () => {
  beforeEach(() => {
    getDb.mockReset();
    getPublicMediaSnapshot.mockReset();
    getPublicMediaSnapshot.mockResolvedValue({
      city: [],
      places: new Map(),
      tours: new Map(),
    });
  });

  it("exposes the canonical published city collection in code mode", async () => {
    const summaries = await getPublicCitySummaries("code");

    expect(summaries.map(({ city }) => city.slug)).toEqual(["lubeck"]);
    expect(summaries[0]?.city.content.en?.shortDescription).toBeTruthy();
  });

  it("filters unpublished cities and returns every published CMS city", async () => {
    mockCitySummaryDatabase([
      { id: 1, slug: "draft-city", publicationStatus: "draft" },
      { id: 2, slug: "ghent", publicationStatus: "published" },
      { id: 3, slug: "lubeck", publicationStatus: "published" },
    ], [
      { cityId: 1, locale: "en", name: "Draft city", shortDescription: null },
      { cityId: 2, locale: "en", name: "Ghent", shortDescription: "Ghent description" },
      { cityId: 3, locale: "en", name: "Lübeck", shortDescription: "Lübeck description" },
    ]);

    const summaries = await getPublicCitySummaries("database");

    expect(summaries.map(({ city }) => city.slug)).toEqual(["ghent", "lubeck"]);
    expect(summaries.some(({ city }) => city.slug === "draft-city")).toBe(false);
    expect(getPublicMediaSnapshot).toHaveBeenCalledTimes(2);
  });

  it("falls back to the code city collection when auto finds no published CMS cities", async () => {
    mockCitySummaryDatabase([], []);

    const summaries = await getPublicCitySummaries("auto");

    expect(summaries.map(({ city }) => city.slug)).toEqual(["lubeck"]);
  });

  it("adapts the complete canonical Lubeck snapshot", async () => {
    const snapshot = await getPublicCitySnapshot("lubeck", "code");
    expect(snapshot.places).toHaveLength(25);
    expect(snapshot.tours[0]?.stops).toHaveLength(5);
    expect(snapshot.places.filter(
      ({ category, tags }) => category === "see" && tags.includes("hidden-gem"),
    )).toHaveLength(5);
  });

  it("reports requested and resolved locale without pretending fallback is authored", async () => {
    const snapshot = await getPublicCitySnapshot("lubeck", "code");
    const place = snapshot.places.find(({ slug }) => slug === "cafe-niederegger");
    expect(place).toBeDefined();
    expect(resolvePublicLocalization(place?.content ?? {}, "ar")).toMatchObject({
      requestedLocale: "ar",
      resolvedLocale: "en",
      didFallback: true,
    });
  });

  it("returns a mobile-safe DTO without database or actor IDs", async () => {
    const response = toLocalizedPublicCityResponse(
      await getPublicCitySnapshot("lubeck", "code"),
      "en",
    );
    expect(response.city.requestedLocale).toBe("en");
    expect(response.places).toHaveLength(25);
    expect(response.places[0]).not.toHaveProperty("id");
    expect(response.places[0]).not.toHaveProperty("createdByUserId");
    expect(response.places[0]).not.toHaveProperty("publicationStatus");
  });

  it("falls back wholesale to code when auto cannot load the database", async () => {
    getDb.mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.reject(new Error("database unavailable")),
          }),
        }),
      }),
    });
    const snapshot = await getPublicCitySnapshot("lubeck", "auto");
    expect(snapshot.places).toHaveLength(25);
  });

  it("fails clearly in database-only mode", async () => {
    getDb.mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.reject(new Error("database unavailable")),
          }),
        }),
      }),
    });
    await expect(getPublicCitySnapshot("lubeck", "database")).rejects.toThrow(
      /database unavailable/,
    );
  });
});

function mockCitySummaryDatabase(
  cities: readonly Readonly<{ id: number; slug: string; publicationStatus: string }>[],
  localizations: readonly Readonly<{
    cityId: number;
    locale: string;
    name: string;
    shortDescription: string | null;
  }>[],
) {
  let queryIndex = 0;
  getDb.mockReturnValue({
    select: vi.fn(() => {
      queryIndex += 1;
      if (queryIndex === 1) {
        return {
          from: () => ({
            where: () => ({ orderBy: async () => cities }),
          }),
        };
      }
      return { from: async () => localizations };
    }),
  });
}
