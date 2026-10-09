import "server-only";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  marketingCampaignsTable,
  marketingContentTable,
  marketingContentMediaTable,
  marketingPagesTable,
  type MarketingCampaignRow,
  type MarketingContentRow,
  type MarketingPageRow,
} from "@/db/marketingSchema";
import { citiesTable, mediaAssetsTable } from "@/db/schema";
import {
  AdminAuthorizationError,
  requireAdminCapability,
} from "@/lib/admin/authorization.server";
import {
  hasActiveStaffCapability,
  hasCityCapability,
  type StaffAccess,
} from "@/lib/admin/permissions";
import {
  validateMarketingCampaignInput,
  validateMarketingContentInput,
  validateMarketingPageInput,
  type MarketingCampaignInput,
  type MarketingContentInput,
  type MarketingPageInput,
} from "@/lib/admin/marketing/validation";

export class MarketingNotFoundError extends Error {
  constructor(message = "Marketing record was not found.") {
    super(message);
    this.name = "MarketingNotFoundError";
  }
}

export class MarketingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketingConflictError";
  }
}

function withinCityScope<T extends { cityId: number }>(
  rows: readonly T[],
  staff: StaffAccess,
): T[] {
  if (staff.role === "super_admin" || staff.globalAccess) {
    return [...rows];
  }

  return rows.filter((row) => staff.cityIds.includes(row.cityId));
}

function withinCityIdScope<T extends { id: number }>(
  rows: readonly T[],
  staff: StaffAccess,
): T[] {
  if (staff.role === "super_admin" || staff.globalAccess) {
    return [...rows];
  }

  return rows.filter((row) => staff.cityIds.includes(row.id));
}

function assertCityCapability(
  staff: StaffAccess,
  cityId: number,
  capability: "marketing:view" | "marketing:manage",
) {
  if (!hasCityCapability(staff, cityId, capability)) {
    throw new AdminAuthorizationError(403, "FORBIDDEN");
  }
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
  const scopedCities = withinCityIdScope(cities, context.staff);

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

export async function getMarketingEditorOptions() {
  const context = await requireAdminCapability("marketing:view");
  const db = getDb();
  const [cities, campaigns, pages] = await Promise.all([
    db
      .select({ id: citiesTable.id, slug: citiesTable.slug, name: citiesTable.name })
      .from(citiesTable)
      .orderBy(citiesTable.name),
    db
      .select({
        id: marketingCampaignsTable.id,
        cityId: marketingCampaignsTable.cityId,
        name: marketingCampaignsTable.name,
        status: marketingCampaignsTable.status,
      })
      .from(marketingCampaignsTable)
      .orderBy(marketingCampaignsTable.name),
    db
      .select({
        id: marketingPagesTable.id,
        cityId: marketingPagesTable.cityId,
        title: marketingPagesTable.title,
        path: marketingPagesTable.path,
        publicationStatus: marketingPagesTable.publicationStatus,
      })
      .from(marketingPagesTable)
      .orderBy(marketingPagesTable.title),
  ]);

  return {
    canManage: hasActiveStaffCapability(context.staff, "marketing:manage"),
    cities: withinCityIdScope(cities, context.staff),
    campaigns: withinCityScope(campaigns, context.staff),
    pages: withinCityScope(pages, context.staff),
  };
}

export async function getMarketingCampaign(id: number): Promise<MarketingCampaignRow> {
  const context = await requireAdminCapability("marketing:view");
  const [campaign] = await getDb()
    .select()
    .from(marketingCampaignsTable)
    .where(eq(marketingCampaignsTable.id, id))
    .limit(1);
  if (!campaign) throw new MarketingNotFoundError("Campaign was not found.");
  assertCityCapability(context.staff, campaign.cityId, "marketing:view");
  return campaign;
}

export async function getMarketingPage(id: number): Promise<MarketingPageRow> {
  const context = await requireAdminCapability("marketing:view");
  const [page] = await getDb()
    .select()
    .from(marketingPagesTable)
    .where(eq(marketingPagesTable.id, id))
    .limit(1);
  if (!page) throw new MarketingNotFoundError("Marketing page was not found.");
  assertCityCapability(context.staff, page.cityId, "marketing:view");
  return page;
}

export async function getMarketingContentItem(id: number): Promise<MarketingContentRow> {
  const context = await requireAdminCapability("marketing:view");
  const [item] = await getDb()
    .select()
    .from(marketingContentTable)
    .where(eq(marketingContentTable.id, id))
    .limit(1);
  if (!item) throw new MarketingNotFoundError("Social content draft was not found.");
  assertCityCapability(context.staff, item.cityId, "marketing:view");
  return item;
}

export async function createMarketingCampaign(input: MarketingCampaignInput) {
  const validated = validateMarketingCampaignInput(input);
  const context = await requireAdminCapability("marketing:manage");
  assertCityCapability(context.staff, validated.cityId, "marketing:manage");
  await assertCityExists(validated.cityId);
  await assertCampaignSlugAvailable(validated.cityId, validated.slug);

  const [created] = await getDb()
    .insert(marketingCampaignsTable)
    .values({
      ...validated,
      startsOn: validated.startsOn ?? null,
      endsOn: validated.endsOn ?? null,
      status: "draft",
      createdByUserId: context.user.id,
      updatedByUserId: context.user.id,
    })
    .returning();
  if (!created) throw new Error("Campaign creation failed.");
  return created;
}

export async function updateMarketingCampaign(
  id: number,
  input: MarketingCampaignInput,
) {
  const validated = validateMarketingCampaignInput(input);
  const context = await requireAdminCapability("marketing:manage");
  const current = await loadCampaign(id);
  assertCityCapability(context.staff, current.cityId, "marketing:manage");
  assertCityCapability(context.staff, validated.cityId, "marketing:manage");
  assertDraftCampaign(current);
  if (current.cityId !== validated.cityId) {
    throw new MarketingConflictError(
      "Campaign city cannot be changed after creation. Create a new campaign for another city.",
    );
  }
  await assertCityExists(validated.cityId);
  await assertCampaignSlugAvailable(validated.cityId, validated.slug, id);

  const [updated] = await getDb()
    .update(marketingCampaignsTable)
    .set({
      slug: validated.slug,
      name: validated.name,
      objective: validated.objective,
      audience: validated.audience,
      message: validated.message,
      cta: validated.cta,
      startsOn: validated.startsOn ?? null,
      endsOn: validated.endsOn ?? null,
      updatedByUserId: context.user.id,
      updatedAt: new Date(),
    })
    .where(eq(marketingCampaignsTable.id, id))
    .returning();
  if (!updated) throw new MarketingNotFoundError("Campaign was not found.");
  return updated;
}

export async function createMarketingPage(input: MarketingPageInput) {
  const validated = validateMarketingPageInput(input);
  const context = await requireAdminCapability("marketing:manage");
  assertCityCapability(context.staff, validated.cityId, "marketing:manage");
  await assertCityExists(validated.cityId);
  await assertCampaignMatchesCity(validated.campaignId, validated.cityId);
  await assertPageIdentityAvailable(validated);

  const [created] = await getDb()
    .insert(marketingPagesTable)
    .values({
      cityId: validated.cityId,
      campaignId: validated.campaignId ?? null,
      kind: validated.kind,
      slug: validated.slug,
      path: validated.path,
      title: validated.title,
      body: validated.body,
      seoTitle: validated.seoTitle ?? null,
      seoDescription: validated.seoDescription ?? null,
      cta: validated.cta ?? null,
      publicationStatus: "draft",
      createdByUserId: context.user.id,
      updatedByUserId: context.user.id,
    })
    .returning();
  if (!created) throw new Error("Marketing page creation failed.");
  return created;
}

export async function updateMarketingPage(id: number, input: MarketingPageInput) {
  const validated = validateMarketingPageInput(input);
  const context = await requireAdminCapability("marketing:manage");
  const current = await loadPage(id);
  assertCityCapability(context.staff, current.cityId, "marketing:manage");
  assertCityCapability(context.staff, validated.cityId, "marketing:manage");
  assertDraftPage(current);
  if (current.cityId !== validated.cityId) {
    throw new MarketingConflictError(
      "Marketing page city cannot be changed after creation. Create a new page for another city.",
    );
  }
  await assertCityExists(validated.cityId);
  await assertCampaignMatchesCity(validated.campaignId, validated.cityId);
  await assertPageIdentityAvailable(validated, id);

  const [updated] = await getDb()
    .update(marketingPagesTable)
    .set({
      campaignId: validated.campaignId ?? null,
      kind: validated.kind,
      slug: validated.slug,
      path: validated.path,
      title: validated.title,
      body: validated.body,
      seoTitle: validated.seoTitle ?? null,
      seoDescription: validated.seoDescription ?? null,
      cta: validated.cta ?? null,
      updatedByUserId: context.user.id,
      updatedAt: new Date(),
    })
    .where(eq(marketingPagesTable.id, id))
    .returning();
  if (!updated) throw new MarketingNotFoundError("Marketing page was not found.");
  return updated;
}

export async function createMarketingContentItem(input: MarketingContentInput) {
  const validated = validateMarketingContentInput(input);
  const context = await requireAdminCapability("marketing:manage");
  assertCityCapability(context.staff, validated.cityId, "marketing:manage");
  await assertCityExists(validated.cityId);
  await assertCampaignMatchesCity(validated.campaignId, validated.cityId);
  await assertPageMatchesCity(validated.pageId, validated.cityId);
  await assertContentCodeAvailable(validated.contentCode);

  const [created] = await getDb()
    .insert(marketingContentTable)
    .values({
      cityId: validated.cityId,
      campaignId: validated.campaignId ?? null,
      pageId: validated.pageId ?? null,
      contentCode: validated.contentCode,
      platform: validated.platform,
      format: validated.format,
      hook: validated.hook,
      script: validated.script ?? null,
      caption: validated.caption ?? null,
      cta: validated.cta ?? null,
      status: "draft",
      createdByUserId: context.user.id,
      updatedByUserId: context.user.id,
    })
    .returning();
  if (!created) throw new Error("Social content creation failed.");
  return created;
}

export async function updateMarketingContentItem(
  id: number,
  input: MarketingContentInput,
) {
  const validated = validateMarketingContentInput(input);
  const context = await requireAdminCapability("marketing:manage");
  const current = await loadContentItem(id);
  assertCityCapability(context.staff, current.cityId, "marketing:manage");
  assertCityCapability(context.staff, validated.cityId, "marketing:manage");
  assertDraftContent(current);
  await assertCityExists(validated.cityId);
  await assertCampaignMatchesCity(validated.campaignId, validated.cityId);
  await assertPageMatchesCity(validated.pageId, validated.cityId);
  await assertContentCodeAvailable(validated.contentCode, id);

  const [updated] = await getDb()
    .update(marketingContentTable)
    .set({
      cityId: validated.cityId,
      campaignId: validated.campaignId ?? null,
      pageId: validated.pageId ?? null,
      contentCode: validated.contentCode,
      platform: validated.platform,
      format: validated.format,
      hook: validated.hook,
      script: validated.script ?? null,
      caption: validated.caption ?? null,
      cta: validated.cta ?? null,
      updatedByUserId: context.user.id,
      updatedAt: new Date(),
    })
    .where(eq(marketingContentTable.id, id))
    .returning();
  if (!updated) throw new MarketingNotFoundError("Social content draft was not found.");
  return updated;
}

async function loadCampaign(id: number) {
  const [campaign] = await getDb()
    .select()
    .from(marketingCampaignsTable)
    .where(eq(marketingCampaignsTable.id, id))
    .limit(1);
  if (!campaign) throw new MarketingNotFoundError("Campaign was not found.");
  return campaign;
}

async function loadPage(id: number) {
  const [page] = await getDb()
    .select()
    .from(marketingPagesTable)
    .where(eq(marketingPagesTable.id, id))
    .limit(1);
  if (!page) throw new MarketingNotFoundError("Marketing page was not found.");
  return page;
}

async function loadContentItem(id: number) {
  const [item] = await getDb()
    .select()
    .from(marketingContentTable)
    .where(eq(marketingContentTable.id, id))
    .limit(1);
  if (!item) throw new MarketingNotFoundError("Social content draft was not found.");
  return item;
}

function assertDraftCampaign(campaign: MarketingCampaignRow) {
  if (campaign.status !== "draft") {
    throw new MarketingConflictError(
      "Only draft campaigns can be edited here. Lifecycle controls belong to the review/publish workflow.",
    );
  }
}

function assertDraftPage(page: MarketingPageRow) {
  if (page.publicationStatus !== "draft") {
    throw new MarketingConflictError(
      "Only draft marketing pages can be edited here. Use the review/publish workflow for later states.",
    );
  }
}

function assertDraftContent(item: MarketingContentRow) {
  if (item.status !== "idea" && item.status !== "draft") {
    throw new MarketingConflictError(
      "Only idea or draft social content can be edited here. Use the review/publish workflow for later states.",
    );
  }
}

async function assertCityExists(cityId: number) {
  const [city] = await getDb()
    .select({ id: citiesTable.id })
    .from(citiesTable)
    .where(eq(citiesTable.id, cityId))
    .limit(1);
  if (!city) throw new MarketingConflictError("Selected city does not exist.");
}

async function assertCampaignSlugAvailable(
  cityId: number,
  slug: string,
  exceptId?: number,
) {
  const [existing] = await getDb()
    .select({ id: marketingCampaignsTable.id })
    .from(marketingCampaignsTable)
    .where(
      and(
        eq(marketingCampaignsTable.cityId, cityId),
        eq(marketingCampaignsTable.slug, slug),
      ),
    )
    .limit(1);
  if (existing && existing.id !== exceptId) {
    throw new MarketingConflictError("This campaign slug already exists for the selected city.");
  }
}

async function assertPageIdentityAvailable(
  input: MarketingPageInput,
  exceptId?: number,
) {
  const db = getDb();
  const [[samePath], [sameSlug]] = await Promise.all([
    db
      .select({ id: marketingPagesTable.id })
      .from(marketingPagesTable)
      .where(eq(marketingPagesTable.path, input.path))
      .limit(1),
    db
      .select({ id: marketingPagesTable.id })
      .from(marketingPagesTable)
      .where(
        and(
          eq(marketingPagesTable.cityId, input.cityId),
          eq(marketingPagesTable.kind, input.kind),
          eq(marketingPagesTable.slug, input.slug),
        ),
      )
      .limit(1),
  ]);
  if (samePath && samePath.id !== exceptId) {
    throw new MarketingConflictError("This marketing page path already exists.");
  }
  if (sameSlug && sameSlug.id !== exceptId) {
    throw new MarketingConflictError(
      "This page slug already exists for the selected city and page kind.",
    );
  }
}

async function assertContentCodeAvailable(contentCode: string, exceptId?: number) {
  const [existing] = await getDb()
    .select({ id: marketingContentTable.id })
    .from(marketingContentTable)
    .where(eq(marketingContentTable.contentCode, contentCode))
    .limit(1);
  if (existing && existing.id !== exceptId) {
    throw new MarketingConflictError("This content code already exists.");
  }
}

async function assertCampaignMatchesCity(campaignId: number | undefined, cityId: number) {
  if (!campaignId) return;
  const [campaign] = await getDb()
    .select({ cityId: marketingCampaignsTable.cityId })
    .from(marketingCampaignsTable)
    .where(eq(marketingCampaignsTable.id, campaignId))
    .limit(1);
  if (!campaign) throw new MarketingConflictError("Selected campaign does not exist.");
  if (campaign.cityId !== cityId) {
    throw new MarketingConflictError("Selected campaign belongs to a different city.");
  }
}

async function assertPageMatchesCity(pageId: number | undefined, cityId: number) {
  if (!pageId) return;
  const [page] = await getDb()
    .select({ cityId: marketingPagesTable.cityId })
    .from(marketingPagesTable)
    .where(eq(marketingPagesTable.id, pageId))
    .limit(1);
  if (!page) throw new MarketingConflictError("Selected page does not exist.");
  if (page.cityId !== cityId) {
    throw new MarketingConflictError("Selected page belongs to a different city.");
  }
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
    throw new MarketingNotFoundError(
      "Lübeck must exist in the CMS before creating its Marketing starter campaign.",
    );
  }

  assertCityCapability(context.staff, city.id, "marketing:manage");
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

export async function getMarketingContentMedia(contentId: number) {
  const context = await requireAdminCapability("marketing:view");
  const item = await loadContentItem(contentId);

  assertCityCapability(context.staff, item.cityId, "marketing:view");

  const db = getDb();

  const [available, attached] = await Promise.all([
    db
      .select({
        id: mediaAssetsTable.id,
        assetKey: mediaAssetsTable.assetKey,
        originalFilename: mediaAssetsTable.originalFilename,
        kind: mediaAssetsTable.kind,
      })
      .from(mediaAssetsTable)
      .where(
        and(
          eq(mediaAssetsTable.cityId, item.cityId),
          eq(mediaAssetsTable.approvalStatus, "approved"),
          eq(mediaAssetsTable.accessLevel, "public"),
          isNull(mediaAssetsTable.archivedAt),
          inArray(mediaAssetsTable.kind, ["image", "video"]),
        ),
      ),

    db
      .select({
        id: marketingContentMediaTable.id,
        mediaAssetId: mediaAssetsTable.id,
        originalFilename: mediaAssetsTable.originalFilename,
        kind: mediaAssetsTable.kind,
        position: marketingContentMediaTable.position,
      })
      .from(marketingContentMediaTable)
      .innerJoin(
        mediaAssetsTable,
        eq(marketingContentMediaTable.mediaAssetId, mediaAssetsTable.id),
      )
      .where(eq(marketingContentMediaTable.contentId, contentId)),
  ]);

  return {
    available,
    attached,
  };
}