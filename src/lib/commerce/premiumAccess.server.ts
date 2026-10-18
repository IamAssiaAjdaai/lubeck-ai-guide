import "server-only";
import { hasLaunchCityAccess } from "./launchPolicy.server";

import {
  CITYWALK_PREMIUM_ENTITLEMENT,
  type CitywalkAccessLevel,
} from "@citywalk/traveler-core";

import { hasActiveCityPass } from "@/lib/commerce/cityPassAccess.server";
import { hasActiveEntitlement } from "@/lib/commerce/entitlements.server";

export type CitywalkPaidAccessState = Readonly<{
  tier: CitywalkAccessLevel;
  premium: boolean;
  cityPass: boolean;
}>;

export type CitywalkPaidAccessDependencies = Readonly<{
  hasPremiumEntitlement: (input: {
    userId: string;
    now: Date;
  }) => Promise<boolean>;
  hasCityPass: (input: {
    userId: string;
    citySlug: string;
    now: Date;
  }) => Promise<boolean>;
}>;

const defaultDependencies: CitywalkPaidAccessDependencies = {
  hasPremiumEntitlement: ({ userId, now }) =>
    hasActiveEntitlement({
      userId,
      scopeType: CITYWALK_PREMIUM_ENTITLEMENT.scopeType,
      scopeKey: CITYWALK_PREMIUM_ENTITLEMENT.scopeKey,
      now,
    }),
  hasCityPass: ({ userId, citySlug, now }) =>
    hasActiveCityPass({ userId, citySlug, now }),
};

export async function resolveCitywalkPaidAccess(
  input: Readonly<{
    userId?: string;
    citySlug?: string;
    now?: Date;
  }>,
  dependencies: CitywalkPaidAccessDependencies = defaultDependencies,
): Promise<CitywalkPaidAccessState> {
  if (!input.userId) {
    return { tier: "free", premium: false, cityPass: false };
  }

  const now = input.now ?? new Date();
  if (
    await dependencies.hasPremiumEntitlement({
      userId: input.userId,
      now,
    })
  ) {
    return { tier: "premium", premium: true, cityPass: false };
  }

  if (
    input.citySlug &&
    await dependencies.hasCityPass({
      userId: input.userId,
      citySlug: input.citySlug,
      now,
    })
  ) {
    return { tier: "city_pass", premium: false, cityPass: true };
  }

  return { tier: "free", premium: false, cityPass: false };
}

export async function hasPremiumAccess(
  input: Readonly<{ userId?: string; now?: Date }>,
  dependencies: CitywalkPaidAccessDependencies = defaultDependencies,
): Promise<boolean> {
  return (
    await resolveCitywalkPaidAccess(
      { userId: input.userId, now: input.now },
      dependencies,
    )
  ).premium;
}

export async function canUsePaidCityFeature(
  input: Readonly<{
    userId?: string;
    citySlug: string;
    feature: string;
    now?: Date;
  }>,
  dependencies: CitywalkPaidAccessDependencies = defaultDependencies,
): Promise<boolean> {
  if (!input.feature.trim()) return false;
  if (input.feature === "premium_audio" && hasLaunchCityAccess(input.citySlug, input.now)) return true;
  return (
    await resolveCitywalkPaidAccess(
      {
        userId: input.userId,
        citySlug: input.citySlug,
        now: input.now,
      },
      dependencies,
    )
  ).tier !== "free";
}

export class PaidCityAccessRequiredError extends Error {
  constructor(readonly citySlug: string) {
    super("PAID_CITY_ACCESS_REQUIRED");
    this.name = "PaidCityAccessRequiredError";
  }
}

export async function requirePaidCityAccess(
  input: Readonly<{
    userId?: string;
    citySlug: string;
    now?: Date;
  }>,
  dependencies: CitywalkPaidAccessDependencies = defaultDependencies,
): Promise<void> {
  if (hasLaunchCityAccess(input.citySlug, input.now)) return;
  const access = await resolveCitywalkPaidAccess(input, dependencies);
  if (access.tier === "free") {
    throw new PaidCityAccessRequiredError(input.citySlug);
  }
}
