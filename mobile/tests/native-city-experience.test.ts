import { describe, expect, it } from "vitest";

import citySource from "../src/app/city/[citySlug]/index.tsx?raw";
import headerSource from "../src/components/NativeHeaderActions.tsx?raw";
import localeSource from "../src/components/LocaleSelector.tsx?raw";
import plannerSource from "../src/components/NativeTourPlanner.tsx?raw";
import placeSource from "../src/app/city/[citySlug]/place/[placeSlug].tsx?raw";
import tourSource from "../src/app/city/[citySlug]/tour/[tourSlug].tsx?raw";
import accountSource from "../src/app/account/index.tsx?raw";

describe("native city experience parity", () => {
  it("renders city hero, published tour stops, and the personalized planner", () => {
    expect(citySource).toContain('selectImageUrl(cityImage, undefined, undefined, "hero")');
    expect(citySource).toContain("stopNames.map");
    expect(citySource).toContain("messages.startTour");
    expect(citySource).toContain("<NativeTourPlanner");
    expect(citySource).toContain("<VirtualizedScreen");
    expect(citySource).toContain("initialNumToRender={4}");
    expect(citySource).toContain('cachePolicy="memory-disk"');
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
    expect(plannerSource).toContain("saveLocalTrip");
    expect(plannerSource).toContain("messages.distanceDisclaimer");
    expect(plannerSource).toContain("messages.startTrip");
    expect(plannerSource).toContain('source: "personalized"');
  });

  it("uses one sequential trip model for published and personalized routes", () => {
    expect(tourSource).toContain("createMobileTripPlaceParams(tripIdentity, 0)");
    expect(tourSource).toContain('source: "published"');
    expect(placeSource).toContain("parseMobileTripContext(params)");
    expect(placeSource).toContain("messages.stopProgress");
    expect(placeSource).toContain("messages.nextStop");
    expect(placeSource).toContain("messages.finishTrip");
  });

  it("makes saved trips visible and resumable from the account screen", () => {
    expect(accountSource).toContain("loadLocalTrips");
    expect(accountSource).toContain("messages.savedTrips");
    expect(accountSource).toContain("messages.resumeTrip");
  });

  it("surfaces actionable account validation and successful creation", () => {
    expect(accountSource).toContain("validateNativeAuthInput");
    expect(accountSource).toContain("classifyNativeAuthError");
    expect(accountSource).toContain("messages.accountCreated");
  });
});
