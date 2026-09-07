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
  isTravelerDiscoverableCity,
  resolvePublicLocalization,
  toLocalizedPublicCityIndexResponse,
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
      { id: 4, slug: "review-city", publicationStatus: "in_review" },
      { id: 5, slug: "approved-city", publicationStatus: "approved" },
      { id: 6, slug: "archived-city", publicationStatus: "archived" },
      { id: 2, slug: "ghent", publicationStatus: "published" },
      { id: 3, slug: "lubeck", publicationStatus: "published" },
    ], [
      { cityId: 1, locale: "en", name: "Draft city", shortDescription: null },
      { cityId: 2, locale: "en", name: "Ghent", shortDescription: "Ghent description" },
      { cityId: 3, locale: "en", name: "Lübeck", shortDescription: "Lübeck description" },
      { cityId: 6, locale: "en", name: "Archived city", shortDescription: null },
    ]);

    const summaries = await getPublicCitySummaries("database");

    expect(summaries.map(({ city }) => city.slug)).toEqual(["ghent", "lubeck"]);
    expect(summaries.some(({ city }) => city.slug === "draft-city")).toBe(false);
    expect(summaries.some(({ city }) => city.slug === "review-city")).toBe(false);
    expect(summaries.some(({ city }) => city.slug === "approved-city")).toBe(false);
    expect(summaries.some(({ city }) => city.slug === "archived-city")).toBe(false);
    expect(getPublicMediaSnapshot).toHaveBeenCalledTimes(2);
  });

  it("requires localization and a published traveler-visible place", async () => {
    mockCitySummaryDatabase(
      [
        { id: 1, slug: "no-localization", publicationStatus: "published" },
        { id: 2, slug: "no-place", publicationStatus: "published" },
        { id: 3, slug: "discoverable", publicationStatus: "published" },
      ],
      [
        { cityId: 2, locale: "en", name: "No place", shortDescription: null },
        { cityId: 3, locale: "en", name: "Discoverable", shortDescription: null },
      ],
      [
        { id: 30, cityId: 3, publicationStatus: "published" },
        { id: 31, cityId: 2, publicationStatus: "draft" },
      ],
      [
        { placeId: 30, locale: "en", name: "Published place" },
        { placeId: 31, locale: "en", name: "Draft place" },
      ],
    );

    const summaries = await getPublicCitySummaries("database");

    expect(summaries.map(({ city }) => city.slug)).toEqual(["discoverable"]);
    expect(isTravelerDiscoverableCity({
      publicationStatus: "published",
      authoredLocalizationCount: 1,
      publishedTravelerVisiblePlaceCount: 1,
    })).toBe(true);
    expect(isTravelerDiscoverableCity({
      publicationStatus: "draft",
      authoredLocalizationCount: 1,
      publishedTravelerVisiblePlaceCount: 1,
    })).toBe(false);
  });

  it("keeps a city discoverable while its only live place has a working draft", async () => {
    mockCitySummaryDatabase(
      [{ id: 7, slug: "revision-city", publicationStatus: "published" }],
      [{ cityId: 7, locale: "en", name: "Revision city", shortDescription: null }],
      [{ id: 70, cityId: 7, publicationStatus: "in_review" }],
      [{ placeId: 70, locale: "en", name: "Unpublished working name" }],
      [{
        placeId: 70,
        snapshot: {
          localizations: [{ locale: "en", name: "Published place" }],
        },
      }],
    );

    await expect(getPublicCitySummaries("database")).resolves.toEqual([
      expect.objectContaining({ city: expect.objectContaining({ slug: "revision-city" }) }),
    ]);
  });

  it("exposes only media returned by the approved public media boundary", async () => {
    const approvedMedia = {
      assetKey: "approved-card",
      kind: "image" as const,
      purpose: "card" as const,
      url: "/api/media/approved-card",
      mimeType: "image/jpeg",
    };
    getPublicMediaSnapshot.mockResolvedValue({
      city: [approvedMedia],
      places: new Map(),
      tours: new Map(),
    });
    mockCitySummaryDatabase(
      [{ id: 2, slug: "ghent", publicationStatus: "published" }],
      [{ cityId: 2, locale: "en", name: "Ghent", shortDescription: null }],
    );

    const [summary] = await getPublicCitySummaries("database");

    expect(summary?.media).toEqual([approvedMedia]);
    expect(JSON.stringify(summary)).not.toMatch(/pending|rejected|archived/);
  });

  it("falls back to the code city collection when auto finds no published CMS cities", async () => {
    mockCitySummaryDatabase([], []);

    const summaries = await getPublicCitySummaries("auto");

    expect(summaries.map(({ city }) => city.slug)).toEqual(["lubeck"]);
  });

  it("does not fall back to code when database mode has no discoverable cities", async () => {
    mockCitySummaryDatabase([], []);

    await expect(getPublicCitySummaries("database")).resolves.toEqual([]);
  });

  it("prefers discoverable database cities in auto mode", async () => {
    mockCitySummaryDatabase(
      [{ id: 2, slug: "ghent", publicationStatus: "published" }],
      [{ cityId: 2, locale: "en", name: "Ghent", shortDescription: null }],
    );

    const summaries = await getPublicCitySummaries("auto");

    expect(summaries.map(({ city }) => city.slug)).toEqual(["ghent"]);
  });

  it("falls back wholesale to code when auto city discovery fails", async () => {
    getDb.mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => Promise.reject(new Error("database unavailable")),
          }),
        }),
      }),
    });

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

  it("localizes city index DTOs with explicit fallback metadata", () => {
    const response = toLocalizedPublicCityIndexResponse(
      [{
        city: {
          slug: "ghent",
          content: {
            en: { name: "Ghent", shortDescription: "Canals and history" },
          },
        },
      }],
      "ar",
    );

    expect(response.cities).toEqual([expect.objectContaining({
      slug: "ghent",
      name: "Ghent",
      shortDescription: "Canals and history",
      requestedLocale: "ar",
      resolvedLocale: "en",
      didFallback: true,
    })]);
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
  places: readonly Readonly<{
    id: number;
    cityId: number;
    publicationStatus: string;
  }>[] = cities
    .filter(({ publicationStatus }) => publicationStatus === "published")
    .map(({ id }) => ({
      id: id * 100,
      cityId: id,
      publicationStatus: "published",
    })),
  placeLocalizations: readonly Readonly<{
    placeId: number;
    locale: string;
    name: string;
  }>[] = places.map(({ id }) => ({
    placeId: id,
    locale: "en",
    name: "Published place",
  })),
  revisions: readonly Readonly<{
    placeId: number;
    snapshot: Readonly<{
      localizations: readonly Readonly<{
        locale: string;
        name: string;
      }>[];
    }>;
  }>[] = [],
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
      if (queryIndex === 2) return { from: async () => localizations };
      if (queryIndex === 3) return { from: async () => places };
      if (queryIndex === 4) {
        return {
          from: () => ({ where: async () => revisions }),
        };
      }
      return { from: async () => placeLocalizations };
    }),
  });
}
