import { describe, expect, it } from "vitest";

import profileSource from "../src/app/profile.tsx?raw";
import premiumHookSource from "../src/hooks/usePremiumAccess.ts?raw";

describe("Premium entitlement states P3", () => {
  it("keeps the canonical access hook states explicit", () => {
    for (const status of ["loading", "guest", "free", "premium", "unavailable"]) {
      expect(premiumHookSource).toContain(`status: "${status}"`);
    }
  });

  it("does not present unavailable entitlement checks as Free", () => {
    expect(profileSource).toContain('case "free":');
    expect(profileSource).toContain('case "unavailable":');
    expect(profileSource).toContain('label("profile.freePlan")');
    expect(profileSource).toContain('label("profile.passUnavailable")');
  });

  it("keeps verified Premium and loading states distinct too", () => {
    expect(profileSource).toContain('case "premium":');
    expect(profileSource).toContain('case "loading":');
    expect(profileSource).toContain('label("profile.passActive")');
    expect(profileSource).toContain('label("loading.account")');
    expect(profileSource).toContain("color: colors.success");
  });

  it("surfaces entitlement status on the Profile Premium row", () => {
    expect(profileSource).toContain("const premium = usePremiumAccess();");
    expect(profileSource).toContain("detail={premiumPresentation.detail}");
    expect(profileSource).toContain("iconColor={premiumPresentation.color}");
    expect(profileSource).toContain('premium.active ? "sparkles" : "lock"');
  });
});
