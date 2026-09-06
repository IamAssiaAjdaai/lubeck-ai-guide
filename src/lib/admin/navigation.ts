import type { AdminCapability, StaffAccess } from "@/lib/admin/permissions";
import { hasActiveStaffCapability } from "@/lib/admin/permissions";

export const ADMIN_SECTIONS = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/admin",
    icon: "layout-dashboard",
    capability: "admin:view",
  },
  {
    id: "cities",
    label: "Cities",
    href: "/admin/cities",
    icon: "building-2",
    capability: "cities:view",
  },
  {
    id: "places",
    label: "Places",
    href: "/admin/places",
    icon: "map-pin",
    capability: "places:view",
  },
  {
    id: "tours",
    label: "Tours",
    href: "/admin/tours",
    icon: "route",
    capability: "tours:view",
  },
  {
    id: "media",
    label: "Media",
    href: "/admin/media",
    icon: "images",
    capability: "media:view",
  },
  {
    id: "sources",
    label: "Sources",
    href: "/admin/sources",
    icon: "book-open",
    capability: "sources:view",
  },
  {
    id: "translations",
    label: "Translations",
    href: "/admin/translations",
    icon: "languages",
    capability: "translations:view",
  },
  {
    id: "publishing",
    label: "Publishing",
    href: "/admin/publishing",
    icon: "badge-check",
    capability: "publishing:review",
  },
  {
    id: "staff",
    label: "Staff",
    href: "/admin/staff",
    icon: "users",
    capability: "staff:manage",
  },
] as const satisfies readonly {
  id: string;
  label: string;
  href: string;
  icon: string;
  capability: AdminCapability;
}[];

export type AdminSection = (typeof ADMIN_SECTIONS)[number];
export type AdminSectionId = AdminSection["id"];

export function getVisibleAdminSections(
  staff: StaffAccess,
): readonly AdminSection[] {
  return ADMIN_SECTIONS.filter((section) =>
    hasActiveStaffCapability(staff, section.capability),
  );
}
export function getAdminSection(
  sectionId: string,
): AdminSection | undefined {
  return ADMIN_SECTIONS.find((section) => section.id === sectionId);
}
