import { describe, expect, it } from "vitest";

import tripsSource from "../src/app/saved.tsx?raw";

describe("Trips P2 retention presentation", () => {
  it("separates active walks from completed walk records", () => {
    expect(tripsSource).toContain('const isTrips = view === "trips";');
    expect(tripsSource).toContain("const activeTrips = active.filter");
    expect(tripsSource).toContain("const finishedTrips = completedTrips([...account.walks, ...walks], citySlug);");
    expect(tripsSource).toContain("Boolean(walk.finishedAt)");
    expect(tripsSource).toContain("messages.resumeTrip");
    expect(tripsSource).toContain("messages.tripComplete");
  });

  it("keeps active walks resumable without reopening them as saved previews", () => {
    expect(tripsSource).toContain('key={`active:${walk.citySlug}:${walk.id}`}');
    expect(tripsSource).toContain('pathname: "/city/[citySlug]/walk", params: { citySlug: walk.citySlug }');
    expect(tripsSource).toContain("{walk.visited.length}/{totalStops} {t.stops} · {t.resume}");
  });

  it("shows truthful completed-walk metrics in compact grouped rows", () => {
    expect(tripsSource).toContain("tripDuration(walk)");
    expect(tripsSource).toContain("tripDistance(walk.historyDistance)");
    expect(tripsSource).toContain("{walk.visited.length} {t.stops}");
    expect(tripsSource).toContain("tripDate(walk.finishedAt!)");
    expect(tripsSource).toContain("tripGroup");
    expect(tripsSource).toContain("StyleSheet.hairlineWidth");
  });

  it("keeps an explicit build action in the empty Trips state", () => {
    expect(tripsSource).toContain("!activeTrips.length && !finishedTrips.length");
    expect(tripsSource).toContain("<PrimaryButton label={t.build} />");
  });
});