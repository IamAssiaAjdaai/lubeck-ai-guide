import { Platform } from "react-native";
import { readPremiumAccess } from "./premiumAccess";
import {
  RevenueCatPremiumBilling,
  type PremiumPlan,
  type RevenueCatPremiumDependencies,
  type RevenueCatPremiumPackage,
} from "./revenueCatPremiumCore";

const defaultDependencies: RevenueCatPremiumDependencies = {
  async ensureConfigured(account) {
    const revenueCat = await import("./revenueCat");
    const status = account
      ? await revenueCat.syncRevenueCatIdentity(account)
      : revenueCat.configureRevenueCat();
    return status.configured;
  },
  async loadPlans() {
    const plans = await (await import("./revenueCat")).loadRevenueCatPlans();
    return plans.filter((plan): plan is PremiumPlan =>
      plan.kind === "monthly" || plan.kind === "annual",
    );
  },
  async getOfferings() {
    const Purchases = (await import("react-native-purchases")).default;
    const offerings = await Purchases.getOfferings();
    return offerings as unknown as Readonly<{
      current?: Readonly<{ availablePackages: readonly RevenueCatPremiumPackage[] }> | null;
    }>;
  },
  async purchasePackage(pkg) {
    const Purchases = (await import("react-native-purchases")).default;
    return Purchases.purchasePackage(pkg as never);
  },
  async restorePurchases() {
    const Purchases = (await import("react-native-purchases")).default;
    return Purchases.restorePurchases();
  },
  access: readPremiumAccess,
  wait: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
};

export const revenueCatPremiumBilling = new RevenueCatPremiumBilling(
  defaultDependencies,
  Platform.OS === "android" ? "android" : "ios",
);
