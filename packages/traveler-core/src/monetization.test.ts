import { describe, expect, it } from "vitest";

import {
  CITYWALK_ACCESS_LEVELS,
  CITYWALK_GUIDE_DAILY_LIMITS,
  CITYWALK_PREMIUM_ENTITLEMENT,
} from "./monetization";

describe("CITYWALK monetization domain", () => {
  it("defines one global Premium entitlement independent of billing product", () => {
    expect(CITYWALK_PREMIUM_ENTITLEMENT).toEqual({
      scopeType: "feature",
      scopeKey: "premium",
    });
  });

  it("keeps access tiers and AI limits explicit and bounded", () => {
    expect(CITYWALK_ACCESS_LEVELS).toEqual(["free", "city_pass", "premium"]);
    expect(CITYWALK_GUIDE_DAILY_LIMITS).toEqual({ free: 3, paid: 20 });
  });
});
