import { and, eq, gt, isNull, or } from "drizzle-orm";

import { commerceEntitlements } from "@/db/commerceSchema";
import { getDb } from "@/db/client";
import type { EntitlementScopeType } from "@/lib/commerce/types";

type EntitlementDependencies = Readonly<{
  findActive: (input: {
    userId: string;
    scopeType: EntitlementScopeType;
    scopeKey: string;
    now: Date;
  }) => Promise<boolean>;
}>;

const defaultDependencies: EntitlementDependencies = {
  async findActive({ userId, scopeType, scopeKey, now }) {
    const [row] = await getDb()
      .select({ id: commerceEntitlements.id })
      .from(commerceEntitlements)
      .where(
        and(
          eq(commerceEntitlements.userId, userId),
          eq(commerceEntitlements.scopeType, scopeType),
          eq(commerceEntitlements.scopeKey, scopeKey),
          eq(commerceEntitlements.status, "active"),
          or(
            isNull(commerceEntitlements.expiresAt),
            gt(commerceEntitlements.expiresAt, now),
          ),
        ),
      )
      .limit(1);
    return Boolean(row);
  },
};

export class EntitlementAuthorizationError extends Error {
  constructor(
    readonly scopeType: EntitlementScopeType,
    readonly scopeKey: string,
  ) {
    super("ENTITLEMENT_REQUIRED");
    this.name = "EntitlementAuthorizationError";
  }
}

export async function hasActiveEntitlement(
  input: Readonly<{
    userId: string;
    scopeType: EntitlementScopeType;
    scopeKey: string;
    now?: Date;
  }>,
  dependencies: EntitlementDependencies = defaultDependencies,
): Promise<boolean> {
  return dependencies.findActive({
    userId: input.userId,
    scopeType: input.scopeType,
    scopeKey: input.scopeKey,
    now: input.now ?? new Date(),
  });
}

export async function requireActiveEntitlement(
  input: Readonly<{
    userId: string;
    scopeType: EntitlementScopeType;
    scopeKey: string;
    now?: Date;
  }>,
  dependencies: EntitlementDependencies = defaultDependencies,
): Promise<void> {
  if (!(await hasActiveEntitlement(input, dependencies))) {
    throw new EntitlementAuthorizationError(input.scopeType, input.scopeKey);
  }
}

export type { EntitlementDependencies };
