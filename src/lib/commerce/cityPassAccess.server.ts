import "server-only";

import { and, desc, eq, gt, isNull, or } from "drizzle-orm";

import { commerceEntitlements } from "@/db/commerceSchema";
import { getDb } from "@/db/client";

export const LUBECK_CITY_PASS_PRODUCT_SLUG =
  "lubeck-digital-guide-pass-72h";
export const LUBECK_CITY_PASS_SCOPE = {
  scopeType: "city",
  scopeKey: "lubeck",
} as const;
export const LUBECK_CITY_PASS_DURATION_HOURS = 72;

export type CityPassAccessState = Readonly<{
  active: boolean;
  expiresAt?: Date;
}>;

export type CityPassAccessDependencies = Readonly<{
  findAccess: (input: {
    userId: string;
    citySlug: string;
    now: Date;
  }) => Promise<CityPassAccessState>;
}>;

const defaultDependencies: CityPassAccessDependencies = {
  async findAccess({ userId, citySlug, now }) {
    const [row] = await getDb()
      .select({ expiresAt: commerceEntitlements.expiresAt })
      .from(commerceEntitlements)
      .where(
        and(
          eq(commerceEntitlements.userId, userId),
          eq(commerceEntitlements.scopeType, "city"),
          eq(commerceEntitlements.scopeKey, citySlug),
          eq(commerceEntitlements.status, "active"),
          or(
            isNull(commerceEntitlements.expiresAt),
            gt(commerceEntitlements.expiresAt, now),
          ),
        ),
      )
      .orderBy(desc(commerceEntitlements.expiresAt))
      .limit(1);
    return row
      ? {
          active: true,
          ...(row.expiresAt ? { expiresAt: row.expiresAt } : {}),
        }
      : { active: false };
  },
};

export class CityPassRequiredError extends Error {
  constructor(readonly citySlug: string) {
    super("CITY_PASS_REQUIRED");
    this.name = "CityPassRequiredError";
  }
}

export async function getCityPassAccessState(
  input: Readonly<{ userId?: string; citySlug: string; now?: Date }>,
  dependencies: CityPassAccessDependencies = defaultDependencies,
): Promise<CityPassAccessState> {
  if (!input.userId) return { active: false };
  return dependencies.findAccess({
    userId: input.userId,
    citySlug: input.citySlug,
    now: input.now ?? new Date(),
  });
}

export async function canUseCityPremiumFeature(
  input: Readonly<{ userId?: string; citySlug: string; now?: Date }>,
  dependencies: CityPassAccessDependencies = defaultDependencies,
): Promise<boolean> {
  return (await getCityPassAccessState(input, dependencies)).active;
}

export async function requireCityPass(
  input: Readonly<{ userId?: string; citySlug: string; now?: Date }>,
  dependencies: CityPassAccessDependencies = defaultDependencies,
): Promise<void> {
  if (!(await canUseCityPremiumFeature(input, dependencies))) {
    throw new CityPassRequiredError(input.citySlug);
  }
}

