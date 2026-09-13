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
    expect(homeSource).toContain("cities.data.cities.map");
    expect(homeSource).toContain("scrollViewRef.current?.scrollTo");
  });
});
