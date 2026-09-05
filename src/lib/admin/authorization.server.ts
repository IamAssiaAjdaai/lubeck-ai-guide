import { eq } from "drizzle-orm";

import {
  hasActiveStaffCapability,
  hasCityCapability,
  type AdminCapability,
  type StaffAccess,
} from "@/lib/admin/permissions";

export type AuthenticatedUser = Readonly<{
  id: string;
  email: string;
  name: string;
}>;

export type AdminContext = Readonly<{
  user: AuthenticatedUser;
  staff: StaffAccess;
}>;

type RequestSession = Readonly<{
  user: AuthenticatedUser;
}> | null;

type AuthorizationDependencies = Readonly<{
  loadSession: () => Promise<RequestSession>;
  loadStaff: (userId: string) => Promise<StaffAccess | null>;
}>;

export class AdminAuthorizationError extends Error {
  constructor(
    readonly status: 401 | 403,
    readonly code: "UNAUTHENTICATED" | "FORBIDDEN",
  ) {
    super(code);
    this.name = "AdminAuthorizationError";
  }
}

async function loadRequestSession(): Promise<RequestSession> {
  const [{ auth }, { headers }] = await Promise.all([
    import("@/lib/auth/server"),
    import("next/headers"),
  ]);
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return null;
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
  };
}

async function loadStaffMembership(
  userId: string,
): Promise<StaffAccess | null> {
  const [{ getDb }, { staffCityAccess, staffMemberships }] =
    await Promise.all([
      import("@/db/client"),
      import("@/db/authSchema"),
    ]);
  const db = getDb();
  const [membership] = await db
    .select()
    .from(staffMemberships)
    .where(eq(staffMemberships.userId, userId))
    .limit(1);

  if (!membership) {
    return null;
  }

  const scopes = await db
    .select({ cityId: staffCityAccess.cityId })
    .from(staffCityAccess)
    .where(eq(staffCityAccess.staffMembershipId, membership.id));

  return {
    membershipId: membership.id,
    userId: membership.userId,
    role: membership.role,
    active: membership.active,
    globalAccess: membership.globalAccess,
    cityIds: scopes.map(({ cityId }) => cityId),
  };
}

const defaultDependencies: AuthorizationDependencies = {
  loadSession: loadRequestSession,
  loadStaff: loadStaffMembership,
};

export async function requireAuthenticatedUser(
  dependencies: AuthorizationDependencies = defaultDependencies,
): Promise<AuthenticatedUser> {
  const session = await dependencies.loadSession();

  if (!session) {
    throw new AdminAuthorizationError(401, "UNAUTHENTICATED");
  }

  return session.user;
}

export async function requireStaff(
  dependencies: AuthorizationDependencies = defaultDependencies,
): Promise<AdminContext> {
  const user = await requireAuthenticatedUser(dependencies);
  const staff = await dependencies.loadStaff(user.id);

  if (!staff?.active || !hasActiveStaffCapability(staff, "admin:view")) {
    throw new AdminAuthorizationError(403, "FORBIDDEN");
  }

  return { user, staff };
}

export async function requireAdminCapability(
  capability: AdminCapability,
  dependencies: AuthorizationDependencies = defaultDependencies,
): Promise<AdminContext> {
  const context = await requireStaff(dependencies);

  if (!hasActiveStaffCapability(context.staff, capability)) {
    throw new AdminAuthorizationError(403, "FORBIDDEN");
  }

  return context;
}

export async function requireCityCapability(
  cityId: number,
  capability: AdminCapability,
  dependencies: AuthorizationDependencies = defaultDependencies,
): Promise<AdminContext> {
  const context = await requireStaff(dependencies);

  if (!hasCityCapability(context.staff, cityId, capability)) {
    throw new AdminAuthorizationError(403, "FORBIDDEN");
  }

  return context;
}

export type AdminAccessOutcome =
  | Readonly<{ kind: "authorized"; context: AdminContext }>
  | Readonly<{ kind: "unauthenticated" }>
  | Readonly<{ kind: "forbidden" }>;

export async function getAdminAccessOutcome(
  dependencies: AuthorizationDependencies = defaultDependencies,
): Promise<AdminAccessOutcome> {
  try {
    return {
      kind: "authorized",
      context: await requireStaff(dependencies),
    };
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return error.status === 401
        ? { kind: "unauthenticated" }
        : { kind: "forbidden" };
    }

    throw error;
  }
}

export async function getAdminCapabilityOutcome(
  capability: AdminCapability,
  dependencies: AuthorizationDependencies = defaultDependencies,
): Promise<AdminAccessOutcome> {
  try {
    return {
      kind: "authorized",
      context: await requireAdminCapability(capability, dependencies),
    };
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return error.status === 401
        ? { kind: "unauthenticated" }
        : { kind: "forbidden" };
    }

    throw error;
  }
}

export type { AuthorizationDependencies };
