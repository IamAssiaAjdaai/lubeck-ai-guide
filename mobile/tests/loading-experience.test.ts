import { describe, expect, it } from "vitest";

import accountSource from "../src/app/account/index.tsx?raw";
import guideSource from "../src/app/city/[citySlug]/guide/[placeSlug].tsx?raw";
import citySource from "../src/app/city/[citySlug]/index.tsx?raw";
import placeSource from "../src/app/city/[citySlug]/place/[placeSlug].tsx?raw";
import tourSource from "../src/app/city/[citySlug]/tour/[tourSlug].tsx?raw";
import homeSource from "../src/app/index.tsx?raw";
import loadingSource from "../src/components/CitywalkLoading.tsx?raw";

const loadingScreens = {
  account: accountSource,
  city: citySource,
  guide: guideSource,
  home: homeSource,
  place: placeSource,
  tour: tourSource,
} as const;

describe("CITYWALK loading experience", () => {
  it.each(Object.entries(loadingScreens))(
    "uses the shared branded loading component on the %s screen",
    (_screen, source) => {
      expect(source).toContain("CitywalkLoading");
      expect(source).not.toMatch(/<AppText>\{messages\.loading\}<\/AppText>/u);
    },
  );

  it("exposes an accessible progress state without fake progress", () => {
    expect(loadingSource).toContain('accessibilityRole="progressbar"');
    expect(loadingSource).toContain("messages.loading");
    expect(loadingSource).not.toMatch(/progress\s*=/iu);
  });
});
