import type { Locale } from "@/lib/i18n";

export type CityPassConfiguration = Readonly<{
  citySlug: string;
  productSlug: string;
  entitlement: Readonly<{
    scopeType: "city";
    scopeKey: string;
  }>;
  durationDays: number;
  recommendedLaunchPrice: Readonly<{
    currency: "eur";
    unitAmount: number;
  }>;
  primaryPremiumFeature: Readonly<{
    id: string;
    kind: "narrated_audio";
    placement: "place_detail";
  }>;
  guideAllowance: Readonly<{
    freeAnswersPer24Hours: number;
    premiumAnswersPer24Hours: number;
  }>;
  copyKey: string;
}>;

export type CityPassPaywallContext = Readonly<{
  citySlug: string;
  productSlug: string;
  featureId: string;
  placement: string;
  durationHours: number;
}>;

const CITY_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const LUBECK_CITY_PASS = defineCityPassConfiguration({
  citySlug: "lubeck",
  productSlug: "lubeck-digital-guide-pass-72h",
  entitlement: {
    scopeType: "city",
    scopeKey: "lubeck",
  },
  durationDays: 3,
  recommendedLaunchPrice: {
    currency: "eur",
    unitAmount: 699,
  },
  primaryPremiumFeature: {
    id: "hidden_lubeck_audio",
    kind: "narrated_audio",
    placement: "place_detail",
  },
  guideAllowance: {
    freeAnswersPer24Hours: 3,
    premiumAnswersPer24Hours: 20,
  },
  copyKey: "hidden-lubeck",
});

const CITY_PASS_CONFIGURATIONS: Readonly<Record<string, CityPassConfiguration>> = {
  [LUBECK_CITY_PASS.citySlug]: LUBECK_CITY_PASS,
};

export function defineCityPassConfiguration(
  configuration: CityPassConfiguration,
): CityPassConfiguration {
  if (
    !isCitySlug(configuration.citySlug) ||
    configuration.entitlement.scopeType !== "city" ||
    configuration.entitlement.scopeKey !== configuration.citySlug ||
    !Number.isSafeInteger(configuration.durationDays) ||
    configuration.durationDays <= 0
  ) {
    throw new Error("INVALID_CITY_PASS_CONFIGURATION");
  }
  return Object.freeze(configuration);
}

export function getCityPassConfiguration(
  citySlug: string,
): CityPassConfiguration | undefined {
  return CITY_PASS_CONFIGURATIONS[citySlug];
}

export function listCityPassConfigurations(): readonly CityPassConfiguration[] {
  return Object.values(CITY_PASS_CONFIGURATIONS);
}

export function getCityPassPaywallContext(
  configuration: CityPassConfiguration,
): CityPassPaywallContext {
  return {
    citySlug: configuration.citySlug,
    productSlug: configuration.productSlug,
    featureId: configuration.primaryPremiumFeature.id,
    placement: configuration.primaryPremiumFeature.placement,
    durationHours: configuration.durationDays * 24,
  };
}

export function getCityGuideAllowancePolicy(citySlug: string): Readonly<{
  freeAnswersPer24Hours: number;
  premiumAnswersPer24Hours: number;
}> {
  return getCityPassConfiguration(citySlug)?.guideAllowance ?? {
    freeAnswersPer24Hours: 3,
    premiumAnswersPer24Hours: 20,
  };
}

export function isCitySlug(value: string): boolean {
  return CITY_SLUG.test(value);
}

export function cityPassDestination(
  locale: Locale,
  citySlug: string,
): string {
  return isCitySlug(citySlug) ? `/${locale}/${citySlug}` : `/${locale}`;
}
