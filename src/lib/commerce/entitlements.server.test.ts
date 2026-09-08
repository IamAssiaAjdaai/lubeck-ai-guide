import { describe, expect, it, vi } from "vitest";

import {
  EntitlementAuthorizationError,
  hasActiveEntitlement,
  requireActiveEntitlement,
  type EntitlementDependencies,
} from "@/lib/commerce/entitlements.server";

function deps(active: boolean): EntitlementDependencies {
  return { findActive: vi.fn().mockResolvedValue(active) };
}

describe("server-side entitlement authorization", () => {
  it("allows access only when the database reports an active entitlement", async () => {
    expect(
      await hasActiveEntitlement(
        { userId: "user-1", scopeType: "city", scopeKey: "lubeck" },
        deps(true),
      ),
    ).toBe(true);
    expect(
      await hasActiveEntitlement(
        { userId: "user-1", scopeType: "feature", scopeKey: "premium_ai" },
        deps(false),
      ),
    ).toBe(false);
  });

  it("fails closed for protected paid capabilities", async () => {
    await expect(
      requireActiveEntitlement(
        { userId: "user-1", scopeType: "city", scopeKey: "lubeck" },
        deps(false),
      ),
    ).rejects.toBeInstanceOf(EntitlementAuthorizationError);
  });
});
