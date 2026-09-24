import { describe, expect, it } from "vitest";

import homeSource from "../src/app/index.tsx?raw";

describe("native Home presentation", () => {
  it("uses the authoritative CITYWALK hero and web-aligned product hierarchy", () => {
    expect(homeSource).toContain('import citywalkHero from "../../assets/images/citywalk-hero.png"');
    expect(homeSource).toContain("messages.homeHeroTitle");
    expect(homeSource).toContain("messages.homeHeroSubtitle");
    expect(homeSource).toContain("messages.discoverCity");
    expect(homeSource).toContain("messages.noSignUpRequired");
    expect(homeSource).not.toContain("styles.orbit");
    expect(homeSource).not.toContain("styles.pin");
  });

  it("keeps available cities data-driven and makes the primary action scroll to them", () => {
    expect(homeSource).toContain("filteredCities.map");
    expect(homeSource).toContain("scrollViewRef.current?.scrollTo");
    expect(homeSource).toContain("prefetchPublicCity(city.slug, locale)");
    expect(homeSource).toContain('cachePolicy="memory-disk"');
  });

  it("makes each city card navigable without a redundant Explore City button", () => {
    expect(homeSource).toContain('accessibilityRole="link"');
    expect(homeSource).toContain('accessibilityLabel={`${messages.exploreCity}: ${city.name}`}');
    expect(homeSource).not.toContain('label={`${messages.exploreCity} — ${city.name}`}');
  });
});
