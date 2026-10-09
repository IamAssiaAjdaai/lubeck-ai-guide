import { describe, expect, it } from "vitest";

import cityHubSource from "../src/app/city/[citySlug]/index.tsx?raw";
import heroSource from "../src/components/ImageOverlayHero.tsx?raw";

describe("City Hub V1 editorial design (approved preview)", () => {
  it("uses a distinct opt-in editorial hero, leaving other heroes unchanged", () => {
    expect(cityHubSource).toContain("<ImageOverlayHero");
    expect(cityHubSource).toContain("              editorial");
    expect(cityHubSource).toContain("citySlug={city.slug}");
    expect(heroSource).toContain("editorial = false");
    expect(heroSource).toContain("editorial && styles.editorialHero");
    expect(heroSource).toContain("editorialBadge");
    expect(heroSource).toContain("waterfrontCrop(size.width, size.height)");
  });

  it("keeps the personalized walk and existing three actions wired to real paths", () => {
    expect(cityHubSource).toContain('pathname: "/city/[citySlug]/walk"');
    expect(cityHubSource).toContain('testID="city-hub-quick-actions"');
    expect(cityHubSource).toContain("list.current?.scrollToOffset");
    expect(cityHubSource).toContain("requestForegroundLocation");
    expect(cityHubSource).toContain("cityAssistantRoute(city.slug)");
    expect(cityHubSource).toContain("locating");
  });

  it("keeps city-specific claims restricted to Lübeck and respects localization", () => {
    expect(cityHubSource).toContain('city.slug === "lubeck" ? editorial.story : t.hubSubtitle');
    expect(cityHubSource).toContain('city.slug === "lubeck" ? editorial.badge : undefined');
    for (const locale of ["en", "de", "fr", "es", "nl", "da", "sv", "ar"]) {
      expect(cityHubSource).toContain(`${locale}: { story:`);
    }
    expect(cityHubSource).toContain("cityHubEditorial[locale] ?? cityHubEditorial.en");
    expect(cityHubSource).toContain('styles.introRow, nativeRowStyle(appDirection)');
  });

  it("preserves published tour data, place controls, and list virtualization", () => {
    expect(cityHubSource).toContain("tours.map");
    expect(cityHubSource).toContain("stopNames.join");
    expect(cityHubSource).toContain("<WalkChoices");
    expect(cityHubSource).toContain("<VirtualizedScreen");
    expect(cityHubSource).toContain("renderItem={({ item }) =>");
    expect(cityHubSource).not.toContain("navigation={false}");
  });
});
