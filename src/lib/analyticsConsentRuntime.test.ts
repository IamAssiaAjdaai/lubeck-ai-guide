import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("browser analytics consent runtime", () => {
  it("gates PostHog initialization before creating analytics identity", () => {
    const instrumentation = source("instrumentation-client.ts");
    const consentCheck = instrumentation.indexOf('getAnalyticsConsent() === "granted"');
    const init = instrumentation.indexOf("posthog.init");
    const identity = instrumentation.indexOf("getBrowserVisitorSessionIdentity()");

    expect(consentCheck).toBeGreaterThanOrEqual(0);
    expect(init).toBeGreaterThan(consentCheck);
    expect(identity).toBeGreaterThan(init);
  });

  it("gates route and Marketing capture on first-party consent", () => {
    const journey = source("src/components/VisitorJourneyTracker.tsx");
    const marketing = source("src/components/marketing/MarketingLandingTracker.tsx");

    expect(journey).toContain('getAnalyticsConsent() !== "granted"');
    expect(journey.indexOf('getAnalyticsConsent() !== "granted"')).toBeLessThan(
      journey.indexOf("getBrowserVisitorSessionIdentity()"),
    );
    expect(marketing).toContain('getAnalyticsConsent()!=="granted"');
  });

  it("exposes equal allow/decline controls and a later privacy preference control", () => {
    const control = source("src/components/AnalyticsConsentControl.tsx");
    const layout = source("src/app/layout.tsx");
    const privacy = source("src/app/privacy/page.tsx");

    expect(control).toContain("Allow analytics");
    expect(control).toContain("Decline");
    expect(control).toContain("Decline analytics");
    expect(layout).toContain("<AnalyticsConsentBanner />");
    expect(privacy).toContain("<AnalyticsConsentPreferences />");
  });
});
