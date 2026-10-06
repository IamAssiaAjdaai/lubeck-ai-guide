import { describe, expect, it } from "vitest";

import savedSource from "../src/app/saved.tsx?raw";

describe("Saved P2 presentation", () => {
  it("keeps the guest sync prompt focused on one sign-in action", () => {
    expect(savedSource).toContain('params: { entry: "sign-in" }');
    expect(savedSource).toContain("messages.signIn");
    expect(savedSource).not.toContain("messages.signUp");
  });

  it("shows saved places before saved walks in compact grouped rows", () => {
    const places = savedSource.indexOf("<SectionTitle>{t.places}</SectionTitle>");
    const walks = savedSource.indexOf('<SectionTitle>{translate(locale, "saved.trips")}</SectionTitle>');

    expect(places).toBeGreaterThan(-1);
    expect(walks).toBeGreaterThan(places);
    expect(savedSource).toContain("style={styles.savedGroup}");
    expect(savedSource).toContain("minHeight: 72");
    expect(savedSource).not.toContain("minHeight: 100");
  });

  it("keeps place rows lightweight and offers an Explore recovery action", () => {
    expect(savedSource).not.toContain("WalkMembershipControl");
    expect(savedSource).toContain('pathname: "/city/[citySlug]/explore"');
    expect(savedSource).toContain('translate(locale, "cityHub.places")');
    expect(savedSource).toContain("style={[styles.savedEmptyRow, { direction }]}");
  });

  it("preserves account/local switching and existing remove behavior", () => {
    expect(savedSource).toContain("style={[styles.sourceRow, { direction }]}");
    expect(savedSource).toContain("setLocalView((value) => !value)");
    expect(savedSource).toContain("removeAccountWalk(account.userId, walk.id)");
    expect(savedSource).toContain("removeNativeWalk(walk.citySlug, walk.id)");
    expect(savedSource).toContain("removeLocalTrip(walk.citySlug, walk.id)");
    expect(savedSource).toContain("toggleSavedPlace(place)");
  });
});