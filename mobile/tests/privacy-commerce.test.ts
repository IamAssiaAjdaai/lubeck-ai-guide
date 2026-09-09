import { describe, expect, it } from "vitest";

import { getLocationAnalyticsProperties } from "../src/lib/analytics";
import { getNativePurchaseAvailability } from "../src/lib/commerce";

describe("native privacy and commerce boundaries", () => {
  it("never adds raw GPS fields to location analytics", () => {
    const properties = getLocationAnalyticsProperties("lubeck", "available");
    expect(properties).toEqual({ city_slug: "lubeck", location_status: "available" });
    expect(JSON.stringify(properties)).not.toMatch(/latitude|longitude|accuracy|coordinates/i);
  });

  it("keeps native purchasing disabled until store billing issue 108", () => {
    expect(getNativePurchaseAvailability("ios")).toEqual({
      available: false, reason: "native-store-billing-pending", followUpIssue: 108,
    });
    expect(getNativePurchaseAvailability("android").available).toBe(false);
  });
});
