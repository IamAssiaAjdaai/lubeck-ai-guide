import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import { CITYWALK_REVENUECAT_PACKAGE_IDS } from "@citywalk/traveler-core";

export { CITYWALK_REVENUECAT_PACKAGE_IDS };

const REVENUECAT_ANONYMOUS_PREFIX = "$RCAnonymousID:";
const REVENUECAT_SECRET_KEY_PREFIX = "sk_";

export type RevenueCatPlanKind = "monthly" | "annual" | "city_pass_72h";

export type RevenueCatPlan = Readonly<{
  kind: RevenueCatPlanKind;
  packageIdentifier: string;
  productIdentifier: string;
  localizedPrice: string;
  currencyCode?: string;
  price?: number;
}>;

export type RevenueCatFoundationStatus =
  | Readonly<{ configured: false; reason: "unsupported_platform" | "missing_public_key" }>
  | Readonly<{ configured: true; platform: "ios" | "android" }>;

export type OfferingPackage = Readonly<{
  identifier: string;
  product: Readonly<{
    identifier: string;
    priceString: string;
    currencyCode?: string;
    price?: number;
  }>;
}>;

export type CurrentOffering = Readonly<{
  availablePackages: readonly OfferingPackage[];
}> | null;

export type RevenueCatDependencies = Readonly<{
  configure: (options: { apiKey: string }) => void;
  getAppUserID: () => Promise<string>;
  logIn: (appUserID: string) => Promise<unknown>;
  logOut: () => Promise<unknown>;
  getCurrentOffering: () => Promise<CurrentOffering>;
}>;

const defaultDependencies: RevenueCatDependencies = {
  configure: (options) => Purchases.configure(options),
  getAppUserID: () => Purchases.getAppUserID(),
  logIn: (appUserID) => Purchases.logIn(appUserID),
  logOut: () => Purchases.logOut(),
  async getCurrentOffering() {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  },
};

let configuredPlatform: "ios" | "android" | undefined;

export function getRevenueCatPublicKey(
  platform: string = Platform.OS,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string | undefined {
  const value = platform === "ios"
    ? environment.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
    : platform === "android"
      ? environment.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
      : undefined;
  const trimmed = value?.trim();
  if (!trimmed || trimmed.startsWith(REVENUECAT_SECRET_KEY_PREFIX)) return undefined;
  return trimmed;
}

export function configureRevenueCat(
  dependencies: RevenueCatDependencies = defaultDependencies,
): RevenueCatFoundationStatus {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return { configured: false, reason: "unsupported_platform" };
  }
  const platform = Platform.OS;
  if (configuredPlatform === platform) return { configured: true, platform };

  const apiKey = getRevenueCatPublicKey(platform);
  if (!apiKey) return { configured: false, reason: "missing_public_key" };

  dependencies.configure({ apiKey });
  configuredPlatform = platform;
  return { configured: true, platform };
}

export async function syncRevenueCatIdentity(
  userId: string | undefined,
  dependencies: RevenueCatDependencies = defaultDependencies,
): Promise<RevenueCatFoundationStatus> {
  const status = configureRevenueCat(dependencies);
  if (!status.configured) return status;

  const currentUserId = await dependencies.getAppUserID();
  if (userId) {
    if (currentUserId !== userId) await dependencies.logIn(userId);
    return status;
  }

  if (!currentUserId.startsWith(REVENUECAT_ANONYMOUS_PREFIX)) {
    await dependencies.logOut();
  }
  return status;
}

export async function loadRevenueCatPlans(
  dependencies: RevenueCatDependencies = defaultDependencies,
): Promise<readonly RevenueCatPlan[]> {
  const status = configureRevenueCat(dependencies);
  if (!status.configured) return [];

  const offering = await dependencies.getCurrentOffering();
  if (!offering) return [];

  return offering.availablePackages.flatMap((pkg): RevenueCatPlan[] => {
    const kind = revenueCatPlanKind(pkg.identifier);
    if (!kind) return [];
    return [{
      kind,
      packageIdentifier: pkg.identifier,
      productIdentifier: pkg.product.identifier,
      localizedPrice: pkg.product.priceString,
      ...(pkg.product.currencyCode ? { currencyCode: pkg.product.currencyCode } : {}),
      ...(typeof pkg.product.price === "number" ? { price: pkg.product.price } : {}),
    }];
  });
}

export function revenueCatPlanKind(
  packageIdentifier: string,
): RevenueCatPlanKind | undefined {
  if (packageIdentifier === CITYWALK_REVENUECAT_PACKAGE_IDS.monthly) return "monthly";
  if (packageIdentifier === CITYWALK_REVENUECAT_PACKAGE_IDS.annual) return "annual";
  if (packageIdentifier === CITYWALK_REVENUECAT_PACKAGE_IDS.cityPass72h) return "city_pass_72h";
  return undefined;
}

export function resetRevenueCatFoundationForTests(): void {
  configuredPlatform = undefined;
}
