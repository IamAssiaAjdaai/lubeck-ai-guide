import { describe, expect, it } from "vitest";

import {
  AdminAuthorizationError,
  getAdminAccessOutcome,
  requireAdminCapability,
  requireAuthenticatedUser,
  requireCityCapability,
  requireStaff,
  type AuthorizationDependencies,
} from "@/lib/admin/authorization.server";
import type { StaffAccess } from "@/lib/admin/permissions";

const user = {
  id: "user-1",
  email: "staff@example.com",
  name: "Staff Member",
};

function dependencies(
  staff: StaffAccess | null,
  authenticated = true,
): AuthorizationDependencies {
  return {
    loadSession: async () => (authenticated ? { user } : null),
    loadStaff: async (userId) =>
      userId === user.id ? staff : null,
  };
}

function membership(
  overrides: Partial<StaffAccess> = {},
): StaffAccess {
  return {
    membershipId: 1,
    userId: user.id,
    role: "content_editor",
    active: true,
    globalAccess: false,
    cityIds: [7],
    ...overrides,
  };
}

async function expectAuthorizationError(
  promise: Promise<unknown>,
  status: 401 | 403,
) {
  await expect(promise).rejects.toMatchObject({
    status,
  } satisfies Partial<AdminAuthorizationError>);
}

describe("server admin authorization", () => {
  it("distinguishes unauthenticated identity from unauthorized staff", async () => {
    await expectAuthorizationError(
      requireAuthenticatedUser(dependencies(null, false)),
      401,
    );
    await expectAuthorizationError(requireStaff(dependencies(null)), 403);
  });

  it("denies inactive memberships", async () => {
    await expectAuthorizationError(
      requireStaff(dependencies(membership({ active: false }))),
      403,
    );
  });

  it("returns server-loaded active staff context", async () => {
    await expect(requireStaff(dependencies(membership()))).resolves.toEqual({
      user,
      staff: membership(),
    });
  });

  it("enforces capabilities for direct server access", async () => {
    await expect(
      requireAdminCapability("places:manage", dependencies(membership())),
    ).resolves.toBeDefined();
    await expectAuthorizationError(
      requireAdminCapability("staff:manage", dependencies(membership())),
      403,
    );
  });

  it("enforces city scopes and super-admin global behavior", async () => {
    await expect(
      requireCityCapability(
        7,
        "places:manage",
        dependencies(membership()),
      ),
    ).resolves.toBeDefined();
    await expectAuthorizationError(
      requireCityCapability(
        8,
        "places:manage",
        dependencies(membership()),
      ),
      403,
    );
    await expect(
      requireCityCapability(
        999,
        "places:manage",
        dependencies(
          membership({ role: "super_admin", cityIds: [] }),
        ),
      ),
    ).resolves.toBeDefined();
  });

  it("provides finite route decisions for admin pages", async () => {
    await expect(
      getAdminAccessOutcome(dependencies(null, false)),
    ).resolves.toEqual({ kind: "unauthenticated" });
    await expect(getAdminAccessOutcome(dependencies(null))).resolves.toEqual({
      kind: "forbidden",
    });
    await expect(
      getAdminAccessOutcome(dependencies(membership())),
    ).resolves.toMatchObject({ kind: "authorized" });
  });
});
