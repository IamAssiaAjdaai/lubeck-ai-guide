import "server-only";

import { requireAdminCapability } from "@/lib/admin/authorization.server";
import { listCmsCities } from "@/lib/admin/content/repository.server";
import { listOperationsPlaces } from "@/lib/admin/operations/repository.server";
import { getConfiguredTtsProvider } from "@/lib/admin/operations/ttsProvider.server";
import { hasActiveStaffCapability } from "@/lib/admin/permissions";

export async function getAuthorizedContentOperations() {
  const context = await requireAdminCapability("translations:view");
  const allCities = await listCmsCities();
  const cities =
    context.staff.role === "super_admin" || context.staff.globalAccess
      ? allCities
      : allCities.filter((city) => context.staff.cityIds.includes(city.id));
  return {
    cities,
    places: await listOperationsPlaces(cities.map(({ id }) => id)),
    generationConfigured: Boolean(getConfiguredTtsProvider()),
    capabilities: {
      canManageTranslations: hasActiveStaffCapability(
        context.staff,
        "translations:manage",
      ),
      canManageMedia: hasActiveStaffCapability(context.staff, "media:manage"),
      canReview: hasActiveStaffCapability(context.staff, "publishing:review"),
      canPublish: hasActiveStaffCapability(context.staff, "publishing:publish"),
    },
  };
}
