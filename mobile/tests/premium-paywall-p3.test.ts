import { describe, expect, it } from "vitest";

import premiumScreenSource from "../src/app/premium.tsx?raw";
import premiumCardSource from "../src/components/RevenueCatPremiumCard.tsx?raw";

describe("Premium paywall P3", () => {
  it("localizes the Live Walk conversion moment instead of hardcoding English copy", () => {
    expect(premiumScreenSource).toContain('useNativeLocale()');
    for (const key of [
      "premium.startLiveWalk",
      "premium.stayGuided",
      "premium.benefitLockScreen",
      "premium.benefitEta",
      "premium.benefitAdapt",
      "premium.benefitBackOnTime",
      "premium.benefitAudioAi",
    ]) {
      expect(premiumScreenSource).toContain(key);
    }
    expect(premiumScreenSource).not.toContain(">Start Live Walk<");
    expect(premiumScreenSource).not.toContain('text="Next stop on your Lock Screen"');
  });

  it("keeps the basic route available as a localized tertiary escape", () => {
    expect(premiumScreenSource).toContain("function ContinueBasicRoute()");
    expect(premiumScreenSource).toContain('"premium.continueBasicRoute"');
    expect(premiumScreenSource).toContain("style={styles.continueBasic}");
    expect(premiumScreenSource).not.toContain(
      '<PrimaryButton label="Continue with basic route"',
    );
  });

  it("uses one selected plan and one explicit localized purchase action", () => {
    expect(premiumCardSource).toContain(
      'plans.find((plan) => plan.kind === "annual") ?? plans[0]',
    );
    expect(premiumCardSource).toContain(
      "setSelected(preferredPlan(plans)?.kind)",
    );
    expect(premiumCardSource).toContain(
      "purchase(selectedPlan.kind, account)",
    );
    expect(premiumCardSource).toContain('"premium.unlockWithPrice"');
    expect(premiumCardSource).toContain('"premium.unlock"');
    expect(premiumCardSource).not.toContain("<Card>");
  });

  it("keeps Store-localized pricing and localized restore behavior intact", () => {
    expect(premiumCardSource).toContain("plan.localizedPrice");
    expect(premiumCardSource).toContain("billing.plans()");
    expect(premiumCardSource).toContain("restore(account)");
    expect(premiumCardSource).toContain('"premium.restorePurchases"');
    expect(premiumCardSource).toContain('"premium.restoringPurchases"');
  });

  it("stores purchase outcomes as translation keys so locale changes re-render messages", () => {
    for (const key of [
      "premium.purchaseCancelled",
      "premium.purchaseReceivedPending",
      "premium.purchaseUnavailable",
      "premium.noVerifiedSubscription",
      "premium.restoreUnavailable",
    ]) {
      expect(premiumCardSource).toContain(key);
    }
    expect(premiumCardSource).toContain("t(locale, state.message)");
  });
});
