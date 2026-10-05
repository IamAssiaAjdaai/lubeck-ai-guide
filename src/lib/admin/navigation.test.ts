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
  it("gives a super admin all control-center sections", () => {
    expect(getVisibleAdminSections(staff("super_admin"))).toEqual(
      ADMIN_SECTIONS,
    );
  });

  it("keeps content editors focused on creation and operations", () => {
    const ids = getVisibleAdminSections(staff("content_editor")).map(
      ({ id }) => id,
    );

    expect(ids).toContain("cities");
    expect(ids).toContain("places");
    expect(ids).toContain("operations");
    expect(ids).not.toContain("review");
  });

  it("shows the review queue to reviewers", () => {
    const ids = getVisibleAdminSections(staff("reviewer_publisher")).map(
      ({ id }) => id,
    );

    expect(ids).toContain("review");
    expect(ids).toContain("media");
  });

  it("resolves only known protected subroutes", () => {
    expect(getAdminSection("places")?.capability).toBe("places:view");
    expect(getAdminSection("review")?.capability).toBe("publishing:review");
    expect(getAdminSection("signup")).toBeUndefined();
  });
});
