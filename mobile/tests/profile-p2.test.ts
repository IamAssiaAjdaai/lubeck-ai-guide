import { describe, expect, it } from "vitest";

import profileSource from "../src/app/profile.tsx?raw";
import chromeSource from "../src/components/NativeChrome.tsx?raw";
import tabNavigationSource from "../src/lib/tabNavigation.tsx?raw";

describe("traveler Profile P2", () => {
  it("uses a dedicated Profile root instead of the account settings screen", () => {
    expect(chromeSource).toContain('href: "/profile"');
    expect(chromeSource).toContain('item.key === "profile" ? "/profile"');
    expect(tabNavigationSource).toContain('path === "/profile" || path.startsWith("/account")');
    expect(tabNavigationSource).toContain('route.name === "profile" ? "/profile"');
  });

  it("keeps the signed-in Profile traveler-focused and compact", () => {
    expect(profileSource).toContain('testID="profile-identity"');
    expect(profileSource).toContain('testID="profile-activity"');
    expect(profileSource).toContain('testID="profile-travel-style"');
    expect(profileSource).toContain('testID="profile-menu"');
    expect(profileSource).not.toContain("<Card");
  });

  it("links retention and account destinations without duplicating their business logic", () => {
    expect(profileSource).toContain('pathname: "/saved", params: { view: "trips" }');
    expect(profileSource).toContain('router.navigate("/saved")');
    expect(profileSource).toContain('router.navigate("/premium")');
    expect(profileSource).toContain('router.navigate("/account")');
    expect(profileSource).not.toContain("deleteNativeAccount");
    expect(profileSource).not.toContain("changePassword");
  });
});
