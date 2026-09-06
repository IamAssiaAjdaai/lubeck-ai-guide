import {
  hasCityCapability,
  type AdminCapability,
  type StaffAccess,
} from "@/lib/admin/permissions";
import type { PublicationStatus } from "@/lib/admin/content/validation";

export function canEditCmsContent(
  staff: StaffAccess | null | undefined,
  cityId: number,
  capability: Extract<
    AdminCapability,
    "cities:manage" | "places:manage" | "tours:manage"
  >,
  status: PublicationStatus,
): boolean {
  if (!hasCityCapability(staff, cityId, capability)) return false;
  return staff?.role !== "content_editor" || status === "draft";
}

export function canPublishCmsContent(
  staff: StaffAccess | null | undefined,
  cityId: number,
): boolean {
  return hasCityCapability(staff, cityId, "publishing:publish");
}

export function canCreateCity(
  staff: StaffAccess | null | undefined,
): boolean {
  return Boolean(
    staff?.active &&
      (staff.role === "super_admin" || staff.globalAccess) &&
      staff.role !== "content_editor" &&
      staff.role !== "reviewer_publisher",
  );
}
