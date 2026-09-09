import "server-only";

import { createHash } from "node:crypto";

import { auth } from "@/lib/auth/server";
import { canUseCityPremiumFeature } from "@/lib/commerce/cityPassAccess.server";
import { getCityGuideAllowancePolicy } from "@/lib/commerce/cityPassConfig";
import { getAiGuideDailyRateLimit } from "@/lib/rateLimit";

type LimitResult = Readonly<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}>;

export type GuideAllowanceDependencies = Readonly<{
  getAuthenticatedUserId: (request: Request) => Promise<string | undefined>;
  hasPremiumAccess: (input: {
    userId: string;
    citySlug: string;
    feature: string;
  }) => Promise<boolean>;
  limitDaily: (input: {
    citySlug: string;
    tier: "free" | "premium";
    key: string;
    maxRequests: number;
  }) => Promise<LimitResult>;
}>;

const defaultDependencies: GuideAllowanceDependencies = {
  async getAuthenticatedUserId(request) {
    const session = await auth.api.getSession({ headers: request.headers });
    return session?.user.id;
  },
  hasPremiumAccess: canUseCityPremiumFeature,
  limitDaily: ({ citySlug, tier, key, maxRequests }) =>
    getAiGuideDailyRateLimit(tier, maxRequests).limit(`${citySlug}:${key}`),
};

export type GuideAllowanceResult = LimitResult &
  Readonly<{ tier: "free" | "premium" }>;

export async function enforceGuideDailyAllowance(
  input: Readonly<{
    request: Request;
    citySlug: string;
    visitorId?: unknown;
    fallbackIdentity: string;
  }>,
  dependencies: GuideAllowanceDependencies = defaultDependencies,
): Promise<GuideAllowanceResult> {
  const userId = await dependencies.getAuthenticatedUserId(input.request);
  const policy = getCityGuideAllowancePolicy(input.citySlug);
  if (
    userId &&
    await dependencies.hasPremiumAccess({
      userId,
      citySlug: input.citySlug,
      feature: "verified_ai_guide",
    })
  ) {
    return {
      ...(await dependencies.limitDaily({
        citySlug: input.citySlug,
        tier: "premium",
        key: `user:${pseudonymousKey(userId)}`,
        maxRequests: policy.premiumAnswersPer24Hours,
      })),
      tier: "premium",
    };
  }

  const visitorId = isVisitorId(input.visitorId)
    ? input.visitorId
    : `fallback:${input.fallbackIdentity}`;
  return {
    ...(await dependencies.limitDaily({
      citySlug: input.citySlug,
      tier: "free",
      key: `visitor:${pseudonymousKey(visitorId)}`,
      maxRequests: policy.freeAnswersPer24Hours,
    })),
    tier: "free",
  };
}

function isVisitorId(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
}

function pseudonymousKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
