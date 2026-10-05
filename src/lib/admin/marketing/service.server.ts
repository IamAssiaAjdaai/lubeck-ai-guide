import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  marketingCampaignsTable,
  marketingContentTable,
  marketingPagesTable,
} from "@/db/marketingSchema";
import { citiesTable } from "@/db/schema";
import {
  requireAdminCapability,
  requireCityCapability,
} from "@/lib/admin/authorization.server";
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

export async function createLubeckStarterCampaign() {
  const context = await requireAdminCapability("marketing:manage");
  const db = getDb();
  const [city] = await db
    .select({ id: citiesTable.id, slug: citiesTable.slug, name: citiesTable.name })
    .from(citiesTable)
    .where(eq(citiesTable.slug, "lubeck"))
    .limit(1);

  if (!city) {
    throw new Error("Lübeck must exist in the CMS before creating its Marketing starter campaign.");
  }

  await requireCityCapability(city.id, "marketing:manage");
  const actorUserId = context.user.id;

  return db.transaction(async (tx) => {
    const [existingCampaign] = await tx
      .select({ id: marketingCampaignsTable.id })
      .from(marketingCampaignsTable)
      .where(
        and(
          eq(marketingCampaignsTable.cityId, city.id),
          eq(marketingCampaignsTable.slug, "two-hours-in-lubeck"),
        ),
      )
      .limit(1);

    let campaignId = existingCampaign?.id;
    if (!campaignId) {
      const [createdCampaign] = await tx
        .insert(marketingCampaignsTable)
        .values({
          cityId: city.id,
          slug: "two-hours-in-lubeck",
          name: "2 Hours in Lübeck",
          objective:
            "Turn time-constrained Lübeck visitors into first CITYWALK walk starts.",
          audience:
            "Day-trip and train travelers with roughly two hours before departure.",
          message:
            "Tell CITYWALK how much time you have. It builds the walk for you.",
          cta: "Build my walk",
          status: "draft",
          createdByUserId: actorUserId,
          updatedByUserId: actorUserId,
        })
        .onConflictDoNothing()
        .returning({ id: marketingCampaignsTable.id });

      campaignId = createdCampaign?.id;
      if (!campaignId) {
        const [concurrentCampaign] = await tx
          .select({ id: marketingCampaignsTable.id })
          .from(marketingCampaignsTable)
          .where(
            and(
              eq(marketingCampaignsTable.cityId, city.id),
              eq(marketingCampaignsTable.slug, "two-hours-in-lubeck"),
            ),
          )
          .limit(1);
        campaignId = concurrentCampaign?.id;
      }
    }

    if (!campaignId) {
      throw new Error("Unable to create or resolve the Lübeck starter campaign.");
    }

    const [existingPage] = await tx
      .select({ id: marketingPagesTable.id })
      .from(marketingPagesTable)
      .where(eq(marketingPagesTable.path, "/lubeck/2-hours"))
      .limit(1);

    let pageId = existingPage?.id;
    if (!pageId) {
      const [createdPage] = await tx
        .insert(marketingPagesTable)
        .values({
          cityId: city.id,
          campaignId,
          kind: "landing",
          slug: "2-hours",
          path: "/lubeck/2-hours",
          title: "2 Hours in Lübeck? Let CITYWALK build the walk.",
          body:
            "Two hours in Lübeck can still become a real city walk. Tell CITYWALK how much time you have and when you need to be back. CITYWALK builds the walk around your time window, so you spend less time planning and more time exploring.",
          seoTitle: "2 Hours in Lübeck | CITYWALK",
          seoDescription:
            "Short on time in Lübeck? Tell CITYWALK your time window and get a walk built around it.",
          cta: "Build my walk",
          publicationStatus: "draft",
          createdByUserId: actorUserId,
          updatedByUserId: actorUserId,
        })
        .onConflictDoNothing()
        .returning({ id: marketingPagesTable.id });
      pageId = createdPage?.id;

      if (!pageId) {
        const [concurrentPage] = await tx
          .select({ id: marketingPagesTable.id })
          .from(marketingPagesTable)
          .where(eq(marketingPagesTable.path, "/lubeck/2-hours"))
          .limit(1);
        pageId = concurrentPage?.id;
      }
    }

    await tx
      .insert(marketingContentTable)
      .values({
        cityId: city.id,
        campaignId,
        pageId,
        contentCode: "CW-LUB-TIME-001",
        platform: "instagram",
        format: "reel-short",
        hook:
          "My train leaves Lübeck at 17:42. Can CITYWALK get me back in time?",
        script:
          "Open with the departure-time constraint, build a two-hour CITYWALK route, show the walk in motion, then finish back at the station with time left.",
        caption:
          "Two hours in Lübeck. One departure time. Less planning, more walking. Build your walk with CITYWALK.",
        cta: "Build my walk",
        status: "draft",
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      })
      .onConflictDoNothing();

    return { campaignId, pageId: pageId ?? null };
  });
}
