import { Platform } from "react-native";
import { readCityUnlock } from "./cityUnlockAccess";
import {
  RevenueCatCityPassBilling,
  type CityPassPlan,
  type RevenueCatCityPassDependencies,
  type RevenueCatStorePackage,
} from "./revenueCatCityPassCore";

const defaultDependencies: RevenueCatCityPassDependencies = {
  async ensureConfigured(account) {
    const revenueCat = await import("./revenueCat");
    const status = account
      ? await revenueCat.syncRevenueCatIdentity(account)
      : revenueCat.configureRevenueCat();
    return status.configured;
  },
  async loadPlans() {
    const plans = await (await import("./revenueCat")).loadRevenueCatPlans();
    return plans.filter((plan): plan is CityPassPlan => plan.kind === "city_pass_72h");
  },
  async getOfferings() {
    const Purchases = (await import("react-native-purchases")).default;
    const offerings = await Purchases.getOfferings();
    return offerings as unknown as Readonly<{ current?: Readonly<{ availablePackages: readonly RevenueCatStorePackage[] }> | null }>;
  },
  async purchasePackage(pkg) {
    const Purchases = (await import("react-native-purchases")).default;
    return Purchases.purchasePackage(pkg as never);
  },
  async restorePurchases() {
    const Purchases = (await import("react-native-purchases")).default;
    return Purchases.restorePurchases();
  },
  access: readCityUnlock,
  wait: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
};

export const revenueCatCityPassBilling = new RevenueCatCityPassBilling(
  defaultDependencies,
  Platform.OS === "android" ? "android" : "ios",
);
