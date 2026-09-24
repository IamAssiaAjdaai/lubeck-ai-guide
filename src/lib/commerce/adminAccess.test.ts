import { describe, expect, it } from "vitest";

import { hasAdminCapability } from "@/lib/admin/permissions";

describe("commerce admin visibility", () => {
  it("is limited to platform admins", () => {
    expect(hasAdminCapability("super_admin", "commerce:view")).toBe(true);
    expect(hasAdminCapability("admin", "commerce:view")).toBe(true);
    expect(hasAdminCapability("content_editor", "commerce:view")).toBe(false);
    expect(hasAdminCapability("reviewer_publisher", "commerce:view")).toBe(
      false,
    );
  });
});
