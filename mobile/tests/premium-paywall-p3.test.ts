import { describe, expect, it } from "vitest";

import premiumScreenSource from "../src/app/premium.tsx?raw";
import premiumCardSource from "../src/components/RevenueCatPremiumCard.tsx?raw";

describe("Premium paywall P3", () => {
  it("keeps Live Walk as the primary Premium conversion moment", () => {
    expect(premiumScreenSource).toContain("Start Live Walk");
    expect(premiumScreenSource).toContain("Next stop on your Lock Screen");
    expect(premiumScreenSource).toContain("Live ETA and remaining time");
    expect(premiumScreenSource).toContain("Shorten or adapt your route");
    expect(premiumScreenSource).toContain("Get back on time");
    expect(premiumScreenSource).toContain("Premium audio & AI guide");
  });

  it("keeps the basic route available as a tertiary escape instead of a competing CTA", () => {
    expect(premiumScreenSource).toContain("function ContinueBasicRoute()");
    expect(premiumScreenSource).toContain('accessibilityLabel="Continue with basic route"');
    expect(premiumScreenSource).toContain('style={styles.continueBasic}');
    expect(premiumScreenSource).not.toContain(
      '<PrimaryButton label="Continue with basic route"',
    );
  });

  it("uses one selected plan and one explicit purchase action", () => {
    expect(premiumCardSource).toContain(
      'plans.find((plan) => plan.kind === "annual") ?? plans[0]',
    );
    expect(premiumCardSource).toContain(
      "setSelected(preferredPlan(plans)?.kind)",
    );
    expect(premiumCardSource).toContain(
      "purchase(selectedPlan.kind, account)",
    );
    expect(premiumCardSource).toContain("Unlock CITYWALK Premium");
    expect(premiumCardSource).not.toContain("<Card>");
  });

  it("keeps Store-localized pricing and restore behavior intact", () => {
    expect(premiumCardSource).toContain("plan.localizedPrice");
    expect(premiumCardSource).toContain("billing.plans()");
    expect(premiumCardSource).toContain("restore(account)");
    expect(premiumCardSource).toContain("Restore purchases");
  });
});
