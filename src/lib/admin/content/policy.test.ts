import { describe, expect, it } from "vitest";

import {
  canCreateCity,
  canEditCmsContent,
  canPublishCmsContent,
} from "@/lib/admin/content/policy";
import type { StaffAccess } from "@/lib/admin/permissions";

function staff(
  role: StaffAccess["role"],
  overrides: Partial<StaffAccess> = {},
): StaffAccess {
  return {
    membershipId: 1,
    userId: "staff-user",
    role,
    active: true,
    globalAccess: false,
    cityIds: [1],
    ...overrides,
  };
}

describe("CMS RBAC policy", () => {
  it("allows a content editor to edit drafts but not published content", () => {
    expect(canEditCmsContent(staff("content_editor"), 1, "places:manage", "draft")).toBe(true);
    expect(canEditCmsContent(staff("content_editor"), 1, "places:manage", "published")).toBe(false);
    expect(canEditCmsContent(staff("content_editor"), 1, "places:manage", "published", true)).toBe(true);
  });

  it("allows reviewer/publishers to publish without edit capability", () => {
    expect(canPublishCmsContent(staff("reviewer_publisher"), 1)).toBe(true);
    expect(canEditCmsContent(staff("reviewer_publisher"), 1, "places:manage", "draft")).toBe(false);
  });

  it("denies staff outside their city scope", () => {
    expect(canEditCmsContent(staff("content_editor"), 2, "places:manage", "draft")).toBe(false);
    expect(canPublishCmsContent(staff("reviewer_publisher"), 2)).toBe(false);
  });

  it("denies missing, inactive, and non-staff-like access", () => {
    expect(canEditCmsContent(null, 1, "places:manage", "draft")).toBe(false);
    expect(canPublishCmsContent(staff("admin", { active: false }), 1)).toBe(false);
    expect(canEditCmsContent(staff("traveler"), 1, "places:manage", "draft")).toBe(false);
  });

  it("requires an authorized global administrator to create cities", () => {
    expect(canCreateCity(staff("super_admin"))).toBe(true);
    expect(canCreateCity(staff("admin", { globalAccess: true }))).toBe(true);
    expect(canCreateCity(staff("admin"))).toBe(false);
    expect(canCreateCity(staff("content_editor", { globalAccess: true }))).toBe(false);
  });
});
