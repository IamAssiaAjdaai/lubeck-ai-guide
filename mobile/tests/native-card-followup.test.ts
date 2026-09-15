import { describe, expect, it } from "vitest";

import homeSource from "../src/app/index.tsx?raw";
import citySource from "../src/app/city/[citySlug]/index.tsx?raw";
import uiSource from "../src/components/ui.tsx?raw";
import appConfig from "../app.json";

describe("physical-device card and keyboard follow-up", () => {
  it("keeps full-card city navigation without a separate arrow circle", () => {
    expect(homeSource).toContain("<Link href={{ pathname: \"/city/[citySlug]\"");
    expect(homeSource).toContain("<PressableSurface");
    expect(homeSource).toContain("prefetchPublicCity(city.slug, locale)");
    expect(homeSource).not.toContain("cityAffordance");
    expect(homeSource).toContain("numberOfLines={2}");
  });

  it("keeps virtualized full-card place navigation, haptics and prefetch without chevrons", () => {
    expect(citySource).toContain("<VirtualizedScreen");
    expect(citySource).toContain('pathname: "/city/[citySlug]/place/[placeSlug]"');
    expect(citySource).toContain("prefetchPublicPlace(citySlug, place.slug, locale)");
    expect(citySource).toContain('accessibilityRole="link"');
    expect(citySource).not.toContain("placeChevron");
  });

  it("uses visual dots and Android resize rather than mojibake text", () => {
    expect(uiSource).toContain("styles.loadingDot");
    expect(uiSource).toContain("<Animated.View");
    expect(uiSource).not.toContain("<Animated.Text accessibilityElementsHidden style={[styles.loadingDots");
    expect(uiSource).not.toContain("â€¢");
    expect(appConfig.expo.android.softwareKeyboardLayoutMode).toBe("resize");
  });
});
