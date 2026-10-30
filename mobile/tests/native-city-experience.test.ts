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
  it("keeps Places filters compact without a redundant Map heading", () => {
    expect(citySource).toContain("styles.placeControls");
    const hiddenHeadings = citySource.match(/showHeading=\{false\}/g) ?? [];
    expect(hiddenHeadings.length).toBeGreaterThanOrEqual(2);
    expect(citySource).toContain("placeControls: { gap: spacing.sm }");
  });

  it("keeps suggested walks compact and factual", () => {
    expect(citySource).toContain('variant="cardTitle"');
    expect(citySource).toContain("styles.tourImage");
    expect(citySource).toContain('stopNames.join(" · ")');
    expect(citySource).not.toContain("tour.content.shortDescription ?? tour.content.description");
  });

  it("renders city hero, published tour stops, and the personalized planner", () => {
    expect(citySource).toContain("<CityHubHero");
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

  it("keeps place detail as a focused subflow with compact real-world actions", () => {
    expect(placeSource).toContain("navigation={false}");
    expect(placeSource).toContain("styles.quickActions");
    expect(placeSource).toContain("place.directions");
    expect(placeSource).toContain("maps.apple.com");
    expect(placeSource).toContain("google.com/maps/dir");
  });

  it("uses an editorial place-detail reading order without inventing new place data", () => {
    const audio = placeSource.indexOf('testID="place-audio-section"');
    const why = placeSource.indexOf('testID="place-overview-section"');
    const story = placeSource.indexOf('testID="place-story-section"');
    const facts = placeSource.indexOf('"place.quickFacts"');
    expect(audio).toBeGreaterThan(0);
    expect(audio).toBeGreaterThan(story);
    expect(story).toBeGreaterThan(why);
    expect(facts).toBeGreaterThan(story);
    expect(placeSource).toContain("place.content.description ?? place.content.shortDescription");
  });

  it("uses one sequential trip model for published and personalized routes", () => {
    expect(tourSource).toContain("createMobileTripPlaceParams(tripIdentity, 0)");
    expect(tourSource).toContain('source: "published"');
    expect(placeSource).toContain("parseMobileTripContext(params)");
    expect(placeSource).toContain("messages.stopProgress");
    expect(placeSource).toContain("messages.nextStop");
    expect(placeSource).toContain("messages.finishTrip");
  });

  it("keeps Saved in canonical navigation instead of duplicating it inside Profile", () => {
    expect(accountSource).not.toContain('href="/saved"');
    expect(accountSource).not.toContain("messages.savedTrips");
    expect(savedSource).toContain("loadLocalTrips");
    expect(savedSource).toContain("loadSavedWalks");
    expect(savedSource).toContain('pathname: "/city/[citySlug]/walk"');
  });

  it("keeps walk subflows focused and preview itinerary compact", () => {
    expect(walkSource).toContain("navigation={false}");
    expect(walkSource).toContain("itinerary(route.places, true, true, true)");
    expect(walkSource).toContain('walk.estimateShort');
  });

  it("surfaces actionable account validation and successful creation", () => {
    expect(accountSource).toContain("validateNativeAuthInput");
    expect(accountSource).toContain("classifyNativeAuthError");
    expect(accountSource).toContain("profile.verificationSent");
    expect(accountSource).toContain("profile.resendVerification");
  });
});
