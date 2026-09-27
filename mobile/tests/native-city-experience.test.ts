import { describe, expect, it } from "vitest";

import citySource from "../src/app/city/[citySlug]/index.tsx?raw";
import headerSource from "../src/components/NativeHeaderActions.tsx?raw";
import localeSource from "../src/components/LocaleSelector.tsx?raw";
import walkSource from "../src/components/NativeWalkFlow.tsx?raw";
import plannerSource from "../src/components/NativeTourPlanner.tsx?raw";
import placeSource from "../src/app/city/[citySlug]/place/[placeSlug].tsx?raw";
import tourSource from "../src/app/city/[citySlug]/tour/[tourSlug].tsx?raw";
import savedSource from "../src/app/saved.tsx?raw";
import accountSource from "../src/app/account/index.tsx?raw";

describe("native city experience parity", () => {
  it("renders city hero, published tour stops, and the personalized planner", () => {
    expect(citySource).toContain("<ImageOverlayHero");
    expect(citySource).toContain('stopNames.join(" · ")');
    expect(citySource).toContain("messages.startTour");
    expect(citySource).toContain('pathname: "/city/[citySlug]/walk"');
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

  it("exposes recommendations, time budgets, route summaries, and an authenticated save boundary", () => {
    expect(plannerSource).toContain("rankNativePlaces");
    expect(walkSource).toContain("t.halfDay");
    expect(walkSource).toContain("buildWalkSteps(places, settings)");
    expect(walkSource).toContain('saveAccountWalk(journey, places, contentStatus === "available", account.userId)');
    expect(plannerSource).toContain("messages.distanceDisclaimer");
    expect(walkSource).toContain("t.startWalk");
    expect(walkSource).toContain("changeCurrentWalk(citySlug");
  });

  it("uses one sequential trip model for published and personalized routes", () => {
    expect(tourSource).toContain("createMobileTripPlaceParams(tripIdentity, 0)");
    expect(tourSource).toContain('source: "published"');
    expect(placeSource).toContain("parseMobileTripContext(params)");
    expect(placeSource).toContain("messages.stopProgress");
    expect(placeSource).toContain("messages.nextStop");
    expect(placeSource).toContain("messages.finishTrip");
  });

  it("links Profile to the canonical Saved screen with both native and historical trips", () => {
    expect(accountSource).toContain('href="/saved"');
    expect(savedSource).toContain("loadLocalTrips");
    expect(savedSource).toContain("loadSavedWalks");
    expect(accountSource).toContain("messages.savedTrips");
    expect(savedSource).toContain('pathname: "/city/[citySlug]/walk"');
  });

  it("surfaces actionable account validation and successful creation", () => {
    expect(accountSource).toContain("validateNativeAuthInput");
    expect(accountSource).toContain("classifyNativeAuthError");
    expect(accountSource).toContain("profile.accountCreated");
  });
});
