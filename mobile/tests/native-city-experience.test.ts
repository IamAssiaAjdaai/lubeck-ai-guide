import { describe, expect, it } from "vitest";

import citySource from "../src/app/city/[citySlug]/index.tsx?raw";
import headerSource from "../src/components/NativeHeaderActions.tsx?raw";
import localeSource from "../src/components/LocaleSelector.tsx?raw";
import plannerSource from "../src/components/NativeTourPlanner.tsx?raw";

describe("native city experience parity", () => {
  it("renders city hero, published tour stops, and the personalized planner", () => {
    expect(citySource).toContain("cityImage.url");
    expect(citySource).toContain("stopNames.map");
    expect(citySource).toContain("messages.startTour");
    expect(citySource).toContain("<NativeTourPlanner");
  });

  it("uses compact accessible language and account header actions", () => {
    expect(headerSource).toContain("<LocaleSelector");
    expect(headerSource).toContain('android="account_circle"');
    expect(localeSource).toContain('android="language"');
    expect(localeSource).toContain("<Modal");
    expect(localeSource).toContain("styles.trigger");
    expect(localeSource).toContain('accessibilityRole="radio"');
    expect(localeSource).not.toContain("styles.group");
  });

  it("exposes recommendations, time budgets, route summaries, and a local save boundary", () => {
    expect(plannerSource).toContain("rankNativePlaces");
    expect(plannerSource).toContain("TOUR_TIME_BUDGETS.map");
    expect(plannerSource).toContain("buildNativePersonalizedTour");
    expect(plannerSource).toContain("saveLocalTripDraft");
    expect(plannerSource).toContain("messages.distanceDisclaimer");
  });
});
