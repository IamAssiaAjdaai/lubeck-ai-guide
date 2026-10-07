import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const draft = source("docs/legal/CITYWALK-STORE-PRIVACY-DRAFT.md");
const inventory = source("docs/legal/CITYWALK-DATA-INVENTORY.md");
const mobileConfig = source("mobile/app.json");
const revenueCat = source("mobile/src/lib/revenueCat.ts");

describe("store privacy declaration draft", () => {
  it("stays explicitly non-submittable until release configuration is fixed", () => {
    expect(draft).toContain("DRAFT — DO NOT SUBMIT YET");
    expect(draft).toContain("#227 Store sandbox acceptance");
    expect(draft).toContain("CONDITIONAL");
    expect(draft).toContain("REVIEW BEFORE SUBMISSION");
  });

  it("uses the stable public privacy and data-rights URLs", () => {
    expect(draft).toContain("https://getcitywalk.com/privacy");
    expect(draft).toContain("https://getcitywalk.com/support");
    expect(draft).toContain("https://getcitywalk.com/account-deletion");
  });

  it("keeps the inventory linked to the controlled store draft", () => {
    expect(inventory).toContain("CITYWALK-STORE-PRIVACY-DRAFT.md");
    expect(inventory).toContain("DRAFT — DO NOT SUBMIT YET");
  });

  it("keeps local-only location separate from off-device collection", () => {
    expect(inventory).toContain("Native foreground location");
    expect(draft).toContain("Location → Precise Location");
    expect(draft).toContain("DO NOT DECLARE AS COLLECTED on current reviewed path");
    expect(draft).toContain("Location → Precise location");
    expect(draft).toContain("No on current reviewed path");
  });

  it("keeps purchase declarations conditional on the actual RevenueCat release setup", () => {
    expect(revenueCat).toContain("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY");
    expect(revenueCat).toContain("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY");
    expect(revenueCat).toContain("dependencies.logIn(userId)");
    expect(draft).toContain("Purchases → Purchase History");
    expect(draft).toContain("Financial info → Purchase history");
    expect(draft).toContain("CONDITIONAL ON #227 / REVENUECAT ACTIVATION");
  });

  it("forces a release-artifact review instead of treating development identifiers as final", () => {
    expect(mobileConfig).toContain("com.citywalk.app.dev");
    expect(draft).toContain("Final release bundle/package identifiers");
    expect(draft).toContain("Exact release Xcode privacy report");
    expect(draft).toContain("Exact Android merged manifest");
  });
});
