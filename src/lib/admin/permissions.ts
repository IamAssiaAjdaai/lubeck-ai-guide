export const STAFF_ROLES = [
  "super_admin",
  "admin",
  "content_editor",
  "reviewer_publisher",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const ADMIN_CAPABILITIES = [
  "admin:view",
  "staff:manage",
  "staff:manage_super_admin",
  "cities:view",
  "cities:manage",
  "places:view",
  "places:manage",
  "tours:view",
  "tours:manage",
  "media:view",
  "media:manage",
  "sources:view",
  "sources:manage",
  "translations:view",
  "translations:manage",
  "publishing:review",
  "publishing:publish",
] as const;

export type AdminCapability = (typeof ADMIN_CAPABILITIES)[number];

const allCapabilities = new Set<AdminCapability>(ADMIN_CAPABILITIES);

export const ROLE_CAPABILITIES: Readonly<
  Record<StaffRole, ReadonlySet<AdminCapability>>
> = {
  super_admin: allCapabilities,
  admin: new Set([
    "admin:view",
    "staff:manage",
    "cities:view",
    "cities:manage",
    "places:view",
    "places:manage",
    "tours:view",
    "tours:manage",
    "media:view",
    "media:manage",
    "sources:view",
    "sources:manage",
    "translations:view",
    "translations:manage",
    "publishing:review",
    "publishing:publish",
  ]),
  content_editor: new Set([
    "admin:view",
    "cities:view",
    "places:view",
    "places:manage",
    "tours:view",
    "tours:manage",
    "media:view",
    "media:manage",
    "sources:view",
    "sources:manage",
    "translations:view",
    "translations:manage",
  ]),
  reviewer_publisher: new Set([
    "admin:view",
    "cities:view",
    "places:view",
    "tours:view",
    "media:view",
    "sources:view",
    "translations:view",
    "publishing:review",
    "publishing:publish",
  ]),
};

export type StaffAccess = Readonly<{
  membershipId: number;
  userId: string;
  role: string;
  active: boolean;
  globalAccess: boolean;
  cityIds: readonly number[];
}>;

export function isStaffRole(value: string): value is StaffRole {
  return STAFF_ROLES.some((role) => role === value);
}
export function hasAdminCapability(
  role: string,
  capability: AdminCapability,
): boolean {
  return isStaffRole(role) && ROLE_CAPABILITIES[role].has(capability);
}

export function hasActiveStaffCapability(
  staff: StaffAccess | null | undefined,
  capability: AdminCapability,
): boolean {
  return Boolean(
    staff?.active && hasAdminCapability(staff.role, capability),
  );
}

export function hasCityCapability(
  staff: StaffAccess | null | undefined,
  cityId: number,
  capability: AdminCapability,
): boolean {
  if (!hasActiveStaffCapability(staff, capability)) {
    return false;
  }

  if (staff?.role === "super_admin" || staff?.globalAccess) {
    return true;
  }

  return staff?.cityIds.includes(cityId) ?? false;
}

export function canManageStaffRole(
  actorRole: string,
  targetRole: string,
): boolean {
  if (!hasAdminCapability(actorRole, "staff:manage")) {
    return false;
  }

  return (
    targetRole !== "super_admin" ||
    hasAdminCapability(actorRole, "staff:manage_super_admin")
  );
}
