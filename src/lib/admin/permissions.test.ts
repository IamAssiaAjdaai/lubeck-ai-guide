import { describe, expect, it } from "vitest";

import {
  ADMIN_CAPABILITIES,
  hasActiveStaffCapability,
  hasAdminCapability,
  hasCityCapability,
  canManageStaffRole,
  ROLE_CAPABILITIES,
  STAFF_ROLES,
  type StaffAccess,
} from "@/lib/admin/permissions";

function staff(
  overrides: Partial<StaffAccess> = {},
): StaffAccess {
  return {
    membershipId: 1,
    userId: "user-1",
    role: "content_editor",
    active: true,
    globalAccess: false,
    cityIds: [1],
    ...overrides,
  };
}

describe("CITYWALK admin permissions", () => {
  it("grants every capability only to super admins", () => {
    expect([...ROLE_CAPABILITIES.super_admin]).toEqual(
      ADMIN_CAPABILITIES,
    );
    expect(
      ADMIN_CAPABILITIES.every((capability) =>
        hasAdminCapability("super_admin", capability),
      ),
    ).toBe(true);
  });

  it("gives admins platform/content access but reserves super-admin grants", () => {
    expect(hasAdminCapability("admin", "staff:manage")).toBe(true);
    expect(hasAdminCapability("admin", "places:manage")).toBe(true);
    expect(hasAdminCapability("admin", "marketing:manage")).toBe(true);
    expect(hasAdminCapability("admin", "publishing:publish")).toBe(true);
    expect(hasAdminCapability("admin", "staff:manage_super_admin")).toBe(
      false,
    );
    expect(canManageStaffRole("admin", "content_editor")).toBe(true);
    expect(canManageStaffRole("admin", "super_admin")).toBe(false);
    expect(canManageStaffRole("super_admin", "super_admin")).toBe(true);
  });

  it("allows editors to create marketing/content but not publish or manage staff", () => {
    expect(hasAdminCapability("content_editor", "places:manage")).toBe(
      true,
    );
    expect(
      hasAdminCapability("content_editor", "translations:manage"),
    ).toBe(true);
    expect(hasAdminCapability("content_editor", "marketing:view")).toBe(true);
    expect(hasAdminCapability("content_editor", "marketing:manage")).toBe(true);
    expect(hasAdminCapability("content_editor", "publishing:publish")).toBe(
      false,
    );
    expect(hasAdminCapability("content_editor", "staff:manage")).toBe(false);
    expect(hasAdminCapability("content_editor", "media:manage")).toBe(true);
  });

  it("allows reviewers to view marketing and publish but not edit drafts", () => {
    expect(
      hasAdminCapability("reviewer_publisher", "publishing:review"),
    ).toBe(true);
    expect(
      hasAdminCapability("reviewer_publisher", "publishing:publish"),
    ).toBe(true);
    expect(hasAdminCapability("reviewer_publisher", "marketing:view")).toBe(true);
    expect(hasAdminCapability("reviewer_publisher", "marketing:manage")).toBe(false);
    expect(
      hasAdminCapability("reviewer_publisher", "places:manage"),
    ).toBe(false);
    expect(hasAdminCapability("reviewer_publisher", "media:view")).toBe(true);
    expect(hasAdminCapability("reviewer_publisher", "media:manage")).toBe(
      false,
    );
    expect(
      hasAdminCapability("reviewer_publisher", "staff:manage"),
    ).toBe(false);
  });

  it("denies unknown roles, inactive staff, and missing memberships", () => {
    expect(hasAdminCapability("owner", "admin:view")).toBe(false);
    expect(
      hasActiveStaffCapability(staff({ active: false }), "admin:view"),
    ).toBe(false);
    expect(hasActiveStaffCapability(null, "admin:view")).toBe(false);
    expect(STAFF_ROLES).not.toContain("traveler");
  });

  it("enforces city scopes without trusting a client-provided role", () => {
    expect(hasCityCapability(staff(), 1, "marketing:manage")).toBe(true);
    expect(hasCityCapability(staff(), 2, "marketing:manage")).toBe(false);
    expect(
      hasCityCapability(
        staff({ role: "reviewer_publisher" }),
        1,
        "marketing:manage",
      ),
    ).toBe(false);
    expect(
      hasCityCapability(
        staff({ role: "super_admin", cityIds: [] }),
        999,
        "marketing:manage",
      ),
    ).toBe(true);
    expect(
      hasCityCapability(staff({ globalAccess: true }), 999, "marketing:manage"),
    ).toBe(true);
  });
});
