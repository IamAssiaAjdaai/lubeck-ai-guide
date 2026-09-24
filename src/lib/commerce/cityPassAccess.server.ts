import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { commerceEntitlements } from "@/db/commerceSchema";
import { getDb } from "@/db/client";
import { isCitySlug } from "@/lib/commerce/cityPassConfig";

export type CityPassAccessState = Readonly<{
  status: "active" | "expired" | "revoked" | "none";
  active: boolean;
  expiresAt?: Date;
}>;

export type CityPassEntitlementRecord = Readonly<{
  status: "active" | "expired" | "revoked";
  expiresAt: Date | null;
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
    const rows = await getDb()
      .select({
        status: commerceEntitlements.status,
        expiresAt: commerceEntitlements.expiresAt,
      })
      .from(commerceEntitlements)
      .where(
        and(
          eq(commerceEntitlements.userId, userId),
          eq(commerceEntitlements.scopeType, "city"),
          eq(commerceEntitlements.scopeKey, citySlug),
        ),
      )
      .orderBy(
        desc(commerceEntitlements.grantedAt),
        desc(commerceEntitlements.id),
      )
      .limit(100);
    return resolveCityPassAccessState(rows, now);
  },
};

export function resolveCityPassAccessState(
  rows: readonly CityPassEntitlementRecord[],
  now: Date,
): CityPassAccessState {
  const active = rows.find(
    (row) =>
      row.status === "active" &&
      (!row.expiresAt || row.expiresAt.getTime() > now.getTime()),
  );
  if (active) {
    return {
      status: "active",
      active: true,
      ...(active.expiresAt ? { expiresAt: active.expiresAt } : {}),
    };
  }
  const latest = rows[0];
  if (!latest) return { status: "none", active: false };
  const status = latest.status === "revoked" ? "revoked" : "expired";
  return latest.expiresAt
    ? { status, active: false, expiresAt: latest.expiresAt }
    : { status, active: false };
}

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
  if (!input.userId || !isCitySlug(input.citySlug)) {
    return { status: "none", active: false };
  }
  return dependencies.findAccess({
    userId: input.userId,
    citySlug: input.citySlug,
    now: input.now ?? new Date(),
  });
}

export const getCityPassState = getCityPassAccessState;

export async function hasActiveCityPass(
  input: Readonly<{ userId?: string; citySlug: string; now?: Date }>,
  dependencies: CityPassAccessDependencies = defaultDependencies,
): Promise<boolean> {
  return (await getCityPassAccessState(input, dependencies)).active;
}

export async function canUseCityPremiumFeature(
  input: Readonly<{
    userId?: string;
    citySlug: string;
    feature: string;
    now?: Date;
  }>,
  dependencies: CityPassAccessDependencies = defaultDependencies,
): Promise<boolean> {
  if (!input.feature.trim()) return false;
  return hasActiveCityPass(input, dependencies);
}

export async function requireCityPass(
  input: Readonly<{ userId?: string; citySlug: string; now?: Date }>,
  dependencies: CityPassAccessDependencies = defaultDependencies,
): Promise<void> {
  if (!(await hasActiveCityPass(input, dependencies))) {
    throw new CityPassRequiredError(input.citySlug);
  }
}
