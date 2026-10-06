import { describe, expect, it } from "vitest";

import layoutSource from "../src/app/_layout.tsx?raw";
import legalScreenSource from "../src/app/legal.tsx?raw";
import profileSource from "../src/app/profile.tsx?raw";
import legalLinksSource from "../src/lib/legalLinks.ts?raw";

describe("native legal and support access", () => {
  it("uses only the approved CITYWALK public legal destinations", () => {
    for (const url of [
      "https://getcitywalk.com/privacy",
      "https://getcitywalk.com/terms",
      "https://getcitywalk.com/imprint",
      "https://getcitywalk.com/account-deletion",
      "https://getcitywalk.com/support",
    ]) {
      expect(legalLinksSource).toContain(url);
    }
    expect(legalLinksSource).toContain("Linking.openURL");
  });

  it("renders legal access as an inner native screen without root tabs", () => {
    expect(legalScreenSource).toContain("<Screen navigation={false}>");
    expect(legalScreenSource).toContain('testID="native-legal-menu"');
    expect(legalScreenSource).toContain("openCitywalkLegalDestination");
    expect(layoutSource).toContain('<Stack.Screen name="legal"');
  });

  it("keeps legal and support access available from Profile without duplicating legal copy", () => {
    expect(profileSource).toContain('testID="profile-legal-menu"');
    expect(profileSource).toContain('router.navigate("/legal")');
    expect(profileSource).toContain('label("legal.profileRow")');
    expect(profileSource).not.toContain("https://getcitywalk.com/privacy");
  });
});
