import { describe, expect, it } from "vitest";
import citySource from "../src/app/city/[citySlug]/index.tsx?raw";

describe("Places V2 compact cards", () => {
  it("keeps compact image and readable typography while preserving real CMS data", () => {
    expect(citySource).toContain("width: 100");
    expect(citySource).toContain("height: 112");
    expect(citySource).toContain("borderRadius: 19");
    expect(citySource).toContain('numberOfLines={2} variant="metadata"');
    expect(citySource).toContain("place.content.shortDescription");
    expect(citySource).toContain("place.durationMinutes");
    expect(citySource).toContain("selectPrimaryImageMedia(place.media)");
  });
  it("preserves detail prefetch, accessibility, and real walk membership controls", () => {
    expect(citySource).toContain("prefetchPublicPlace(citySlug, place.slug, locale)");
    expect(citySource).toContain('accessibilityRole="link"');
    expect(citySource).toContain("WalkMembershipControl citySlug={citySlug} placeSlug={place.slug} iconOnly");
    expect(citySource).toContain("imageMedia?.attribution");
    expect(citySource).toContain("styles.placeCardRow");
  });
  it("keeps the add/remove icon outside the detail link and budget feedback below the row", () => {
    expect(citySource).toContain('iconOnly onFeedback=');
    expect(citySource).toContain('styles.placeCardRow');
    expect(citySource).toContain('walkFeedback.message ? (');
    expect(citySource).toContain('styles.placeFeedback');
    expect(citySource).toContain('walkFeedback.customize ? (');
    expect(citySource).toContain("Doesn\'t fit your walk time.");
    expect(citySource).toContain("styles.placeFeedbackText");
    expect(citySource).toContain("styles.placeCustomizeText");
  });
  it("collapses long city context into an accessible opt-in info row", () => {
    expect(citySource).toContain('testID="city-about-card"');
    expect(citySource).toContain('accessibilityState={{ expanded: aboutExpanded }}');
    expect(citySource).toContain('setAboutExpanded((current) => !current)');
    expect(citySource).toContain('{aboutExpanded ? (');
    expect(citySource).toContain('{city.content.description}');
    expect(citySource).toContain('nativeCityName(city.slug, city.content.name, locale)');
  });
  it("keeps map/category filtering and compact tour previews", () => {
    expect(citySource).toContain("setCategory");
    expect(citySource).toContain("setMapVisible");
    expect(citySource).toContain("NativeCityMap");
    expect(citySource).toContain("stopNames.join");
    expect(citySource).toContain("numberOfLines={expanded ? undefined : 3}");
  });
});
