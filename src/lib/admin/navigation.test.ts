import { describe, expect, it } from "vitest";

import {
  ADMIN_SECTIONS,
  getAdminSection,
  getVisibleAdminSections,
} from "@/lib/admin/navigation";
import type { StaffAccess } from "@/lib/admin/permissions";

function staff(role: string): StaffAccess {
  return {
    membershipId: 1,
    userId: "user-1",
    role,
    active: true,
    globalAccess: true,
    cityIds: [],
  };
}

describe("admin navigation", () => {
  it("gives a super admin all sections", () => {
    expect(getVisibleAdminSections(staff("super_admin"))).toEqual(
      ADMIN_SECTIONS,
    );
  });

  it("hides staff and publishing from content editors", () => {
    const ids = getVisibleAdminSections(staff("content_editor")).map(
      ({ id }) => id,
    );

    expect(ids).toContain("places");
    expect(ids).toContain("translations");
    expect(ids).not.toContain("staff");
    expect(ids).not.toContain("publishing");
  });

  it("shows publishing but not staff to reviewers", () => {
    const ids = getVisibleAdminSections(staff("reviewer_publisher")).map(
      ({ id }) => id,
    );

    expect(ids).toContain("publishing");
    expect(ids).not.toContain("staff");
  });

  it("resolves only known protected subroutes", () => {
    expect(getAdminSection("places")?.capability).toBe("places:view");
    expect(getAdminSection("signup")).toBeUndefined();
  });
});
