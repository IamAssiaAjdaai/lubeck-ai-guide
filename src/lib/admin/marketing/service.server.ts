import "server-only";

import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  marketingCampaignsTable,
  marketingContentTable,
  marketingPagesTable,
} from "@/db/marketingSchema";
import { citiesTable } from "@/db/schema";
import { requireAdminCapability } from "@/lib/admin/authorization.server";
import {
  hasActiveStaffCapability,
  type StaffAccess,
} from "@/lib/admin/permissions";

function withinCityScope<T extends { cityId: number }>(
  rows: readonly T[],
  staff: StaffAccess,
): T[] {
  if (staff.role === "super_admin" || staff.globalAccess) {
    return [...rows];
  }

  return rows.filter((row) => staff.cityIds.includes(row.cityId));
}

export async function getMarketingWorkspace() {
  const context = await requireAdminCapability("marketing:view");
  const db = getDb();

  const [cities, campaigns, pages, content] = await Promise.all([
    db
      .select({
        id: citiesTable.id,
        slug: citiesTable.slug,
        name: citiesTable.name,
        publicationStatus: citiesTable.publicationStatus,
      })
      .from(citiesTable)
      .orderBy(citiesTable.name),
    db
      .select({
        id: marketingCampaignsTable.id,
        cityId: marketingCampaignsTable.cityId,
        cityName: citiesTable.name,
        citySlug: citiesTable.slug,
        slug: marketingCampaignsTable.slug,
        name: marketingCampaignsTable.name,
        objective: marketingCampaignsTable.objective,
        status: marketingCampaignsTable.status,
        updatedAt: marketingCampaignsTable.updatedAt,
      })
      .from(marketingCampaignsTable)
      .innerJoin(citiesTable, eq(marketingCampaignsTable.cityId, citiesTable.id))
      .orderBy(desc(marketingCampaignsTable.updatedAt)),
    db
      .select({
        id: marketingPagesTable.id,
        cityId: marketingPagesTable.cityId,
        cityName: citiesTable.name,
        campaignId: marketingPagesTable.campaignId,
        kind: marketingPagesTable.kind,
        path: marketingPagesTable.path,
        title: marketingPagesTable.title,
        publicationStatus: marketingPagesTable.publicationStatus,
        updatedAt: marketingPagesTable.updatedAt,
      })
      .from(marketingPagesTable)
      .innerJoin(citiesTable, eq(marketingPagesTable.cityId, citiesTable.id))
      .orderBy(desc(marketingPagesTable.updatedAt)),
    db
      .select({
        id: marketingContentTable.id,
        cityId: marketingContentTable.cityId,
        cityName: citiesTable.name,
        campaignId: marketingContentTable.campaignId,
        contentCode: marketingContentTable.contentCode,
        platform: marketingContentTable.platform,
        format: marketingContentTable.format,
        hook: marketingContentTable.hook,
        status: marketingContentTable.status,
        updatedAt: marketingContentTable.updatedAt,
      })
      .from(marketingContentTable)
      .innerJoin(citiesTable, eq(marketingContentTable.cityId, citiesTable.id))
      .orderBy(desc(marketingContentTable.updatedAt)),
  ]);

  const scopedCampaigns = withinCityScope(campaigns, context.staff);
  const scopedPages = withinCityScope(pages, context.staff);
  const scopedContent = withinCityScope(content, context.staff);
  const scopedCities =
    context.staff.role === "super_admin" || context.staff.globalAccess
      ? cities
      : cities.filter((city) => context.staff.cityIds.includes(city.id));

  return {
    canManage: hasActiveStaffCapability(context.staff, "marketing:manage"),
    cities: scopedCities,
    campaigns: scopedCampaigns,
    pages: scopedPages,
    content: scopedContent,
    counts: {
      campaigns: scopedCampaigns.length,
      activeCampaigns: scopedCampaigns.filter(({ status }) => status === "active")
        .length,
      pages: scopedPages.length,
      publishedPages: scopedPages.filter(
        ({ publicationStatus }) => publicationStatus === "published",
      ).length,
      content: scopedContent.length,
      readyContent: scopedContent.filter(({ status }) => status === "ready")
        .length,
    },
  };
}
