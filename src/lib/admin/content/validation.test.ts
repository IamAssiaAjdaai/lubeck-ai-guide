import { describe, expect, it } from "vitest";

import {
  canTransitionPublication,
  validateCityInput,
  validateCoordinates,
  validateFacts,
  validatePlaceInput,
  validateSlug,
  validateTagSlugs,
  validateTourInput,
} from "@/lib/admin/content/validation";

const localization = {
  locale: "en" as const,
  name: "Test place",
  shortDescription: "A verified test description.",
  facts: [],
};

function placeInput() {
  return {
    cityId: 1,
    slug: "test-place",
    category: "see" as const,
    latitude: 53.86,
    longitude: 10.68,
    durationMinutes: 30,
    environment: "outdoor" as const,
    pricing: "free" as const,
    status: "unknown" as const,
    tagSlugs: ["history"],
    publicationStatus: "draft" as const,
    localizations: [localization],
  };
}

describe("CMS content validation", () => {
  it.each(["Holstentor", "bad slug", "bad_slug", "-bad", "bad-"])(
    "rejects unsafe slug %s",
    (slug) => expect(() => validateSlug(slug)).toThrow(/kebab-case/),
  );

  it("accepts lowercase kebab-case slugs", () => {
    expect(validateSlug("historic-center-walk")).toBe(
      "historic-center-walk",
    );
  });

  it("enforces geographic coordinate bounds", () => {
    expect(validateCoordinates(-90, 180)).toEqual({
      latitude: -90,
      longitude: 180,
    });
    expect(() => validateCoordinates(90.01, 0)).toThrow(/latitude/);
    expect(() => validateCoordinates(0, -180.01)).toThrow(/longitude/);
  });

  it.each([
    ["category", { category: "shop" }],
    ["environment", { environment: "street" }],
    ["pricing", { pricing: "cheap" }],
    ["status", { status: "maybe-open" }],
    ["publicationStatus", { publicationStatus: "verified" }],
  ])("rejects an unknown %s", (_field, change) => {
    expect(() =>
      validatePlaceInput({ ...placeInput(), ...change } as never),
    ).toThrow(/unsupported value/);
  });

  it("rejects unsupported locales and duplicate locale rows", () => {
    expect(() =>
      validateCityInput({
        slug: "lubeck",
        publicationStatus: "draft",
        localizations: [{ locale: "xx", name: "Test" } as never],
      }),
    ).toThrow(/locale/);
    expect(() =>
      validateCityInput({
        slug: "lubeck",
        publicationStatus: "draft",
        localizations: [
          { locale: "en", name: "Lubeck" },
          { locale: "en", name: "Luebeck" },
        ],
      }),
    ).toThrow(/unique/);
  });

  it("validates bounded structured facts", () => {
    expect(validateFacts([{ label: "Built", value: "1478" }])).toEqual([
      { label: "Built", value: "1478" },
    ]);
    expect(() => validateFacts([{ label: "", value: "1478" }])).toThrow(
      /label/,
    );
    expect(() => validateFacts("not-an-array")).toThrow(/array/);
  });

  it("deduplicates validated tag slugs", () => {
    expect(validateTagSlugs(["history", "history", "hidden-gem"])).toEqual([
      "history",
      "hidden-gem",
    ]);
    expect(() => validateTagSlugs(["Hidden Gem"])).toThrow(/kebab-case/);
  });

  it("requires authored content before publication", () => {
    expect(() =>
      validatePlaceInput({
        ...placeInput(),
        publicationStatus: "published",
        localizations: [],
      }),
    ).toThrow(/authored localization/);
  });

  it("requires valid, unique, contiguous tour stops", () => {
    const base = {
      cityId: 1,
      slug: "historic-walk",
      publicationStatus: "draft" as const,
      localizations: [{ locale: "en" as const, title: "Historic walk" }],
      stops: [
        { placeId: 1, position: 1 },
        { placeId: 2, position: 2 },
      ],
    };
    expect(validateTourInput(base).stops).toHaveLength(2);
    expect(() =>
      validateTourInput({
        ...base,
        stops: [
          { placeId: 1, position: 1 },
          { placeId: 2, position: 3 },
        ],
      }),
    ).toThrow(/contiguous/);
    expect(() =>
      validateTourInput({
        ...base,
        stops: [
          { placeId: 1, position: 1 },
          { placeId: 1, position: 2 },
        ],
      }),
    ).toThrow(/unique/);
  });

  it("allows only the defined publication transitions", () => {
    expect(canTransitionPublication("draft", "in_review")).toBe(true);
    expect(canTransitionPublication("in_review", "approved")).toBe(true);
    expect(canTransitionPublication("approved", "published")).toBe(true);
    expect(canTransitionPublication("published", "archived")).toBe(true);
    expect(canTransitionPublication("archived", "draft")).toBe(true);
    expect(canTransitionPublication("draft", "published")).toBe(false);
    expect(canTransitionPublication("draft", "archived")).toBe(false);
    expect(canTransitionPublication("archived", "published")).toBe(false);
  });
});
