import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("@/db/client", () => ({ getDb }));

import {
  getPublicCitySnapshot,
  resolvePublicLocalization,
  toLocalizedPublicCityResponse,
} from "@/lib/content/publicRepository.server";

describe("public content repository", () => {
  beforeEach(() => getDb.mockReset());

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
