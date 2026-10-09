import { describe, expect, it } from "vitest";
import citySource from "../src/app/city/[citySlug]/index.tsx?raw";

describe("Places V2 compact cards", () => {
  it("keeps compact image and readable typography while preserving real CMS data", () => {
    expect(citySource).toContain("width: 108");
    expect(citySource).toContain("height: 108");
    expect(citySource).toContain("borderRadius: 19");
    expect(citySource).toContain('numberOfLines={2} variant="metadata"');
    expect(citySource).toContain("place.content.shortDescription");
    expect(citySource).toContain("place.durationMinutes");
    expect(citySource).toContain("selectPrimaryImageMedia(place.media)");
  });
  it("preserves detail prefetch, accessibility, and real walk membership controls", () => {
    expect(citySource).toContain("prefetchPublicPlace(citySlug, place.slug, locale)");
    expect(citySource).toContain('accessibilityRole="link"');
    expect(citySource).toContain("WalkMembershipControl citySlug={citySlug} placeSlug={place.slug} dense inline");
    expect(citySource).toContain("imageMedia?.attribution");
  });
  it("keeps map/category filtering and compact tour previews", () => {
    expect(citySource).toContain("setCategory");
    expect(citySource).toContain("setMapVisible");
    expect(citySource).toContain("NativeCityMap");
    expect(citySource).toContain("stopNames.join");
    expect(citySource).toContain("numberOfLines={expanded ? undefined : 1}");
  });
});
