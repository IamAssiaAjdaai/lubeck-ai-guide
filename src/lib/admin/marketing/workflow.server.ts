import "server-only";

import { desc, eq } from "drizzle-orm";

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
import { hasCityCapability } from "@/lib/admin/permissions";
import {
  getMarketingPageTransition,
  getMarketingSocialTransition,
  isMarketingPageState,
  isMarketingSocialState,
  type MarketingPageState,
  type MarketingSocialState,
} from "@/lib/admin/marketing/workflow";
import { buildMarketingTrackingPath } from "@/lib/marketingAttribution";

export class MarketingWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketingWorkflowError";
  }
}

export async function getMarketingWorkflowAccess(cityId: number) {
  const context = await requireCityCapability(cityId, "marketing:view");
  return {
    canManage: hasCityCapability(context.staff, cityId, "marketing:manage"),
    canReview: hasCityCapability(context.staff, cityId, "publishing:review"),
    canPublish: hasCityCapability(context.staff, cityId, "publishing:publish"),
  };
}

export async function changeMarketingPageWorkflowStatus(
  id: number,
  requestedStatus: unknown,
) {
  const db = getDb();
  const [page] = await db
    .select()
    .from(marketingPagesTable)
    .where(eq(marketingPagesTable.id, id))
    .limit(1);
  if (!page) throw new MarketingWorkflowError("Marketing page was not found.");
  if (!isMarketingPageState(requestedStatus)) {
    throw new MarketingWorkflowError("Requested Marketing page status is invalid.");
  }

  const currentStatus = page.publicationStatus as MarketingPageState;
  const transition = getMarketingPageTransition(currentStatus, requestedStatus);
  if (!transition) {
    throw new MarketingWorkflowError(
      `Cannot transition Marketing page from ${currentStatus} to ${requestedStatus}.`,
    );
  }

  const context = await requireCityCapability(page.cityId, transition.capability);
  const restoringDraft = currentStatus === "archived" && requestedStatus === "draft";
  const [updated] = await db
    .update(marketingPagesTable)
    .set({
      publicationStatus: requestedStatus,
      publishedAt:
        requestedStatus === "published"
          ? new Date()
          : restoringDraft
            ? null
            : page.publishedAt,
      updatedByUserId: context.user.id,
      updatedAt: new Date(),
    })
    .where(eq(marketingPagesTable.id, id))
    .returning();
  if (!updated) throw new MarketingWorkflowError("Marketing page update failed.");
  return updated;
}

export async function changeMarketingSocialWorkflowStatus(
  id: number,
  requestedStatus: unknown,
  rawPublishedUrl?: unknown,
) {
  const db = getDb();
  const [item] = await db
    .select()
    .from(marketingContentTable)
    .where(eq(marketingContentTable.id, id))
    .limit(1);
  if (!item) throw new MarketingWorkflowError("Social content was not found.");
  if (!isMarketingSocialState(requestedStatus)) {
    throw new MarketingWorkflowError("Requested social content status is invalid.");
  }

  const currentStatus = item.status as MarketingSocialState;
  const transition = getMarketingSocialTransition(currentStatus, requestedStatus);
  if (!transition) {
    throw new MarketingWorkflowError(
      `Cannot transition social content from ${currentStatus} to ${requestedStatus}.`,
    );
  }

  const context = await requireCityCapability(item.cityId, transition.capability);
  const publishedUrl =
    requestedStatus === "published"
      ? normalizePublishedUrl(rawPublishedUrl)
      : item.publishedUrl;
  const restoringDraft = currentStatus === "archived" && requestedStatus === "draft";

  const [updated] = await db
    .update(marketingContentTable)
    .set({
      status: requestedStatus,
      publishedUrl: restoringDraft ? null : publishedUrl,
      publishedAt:
        requestedStatus === "published"
          ? new Date()
          : restoringDraft
            ? null
            : item.publishedAt,
      updatedByUserId: context.user.id,
      updatedAt: new Date(),
    })
    .where(eq(marketingContentTable.id, id))
    .returning();
  if (!updated) throw new MarketingWorkflowError("Social content update failed.");
  return updated;
}

export async function listMarketingReviewQueue() {
  const context = await requireAdminCapability("publishing:review");
  const db = getDb();
  const [pages, social] = await Promise.all([
    db
      .select({
        id: marketingPagesTable.id,
        cityId: marketingPagesTable.cityId,
        cityName: citiesTable.name,
        title: marketingPagesTable.title,
        status: marketingPagesTable.publicationStatus,
      })
      .from(marketingPagesTable)
      .innerJoin(citiesTable, eq(marketingPagesTable.cityId, citiesTable.id))
      .where(eq(marketingPagesTable.publicationStatus, "in_review"))
      .orderBy(desc(marketingPagesTable.updatedAt)),
    db
      .select({
        id: marketingContentTable.id,
        cityId: marketingContentTable.cityId,
        cityName: citiesTable.name,
        title: marketingContentTable.contentCode,
        status: marketingContentTable.status,
      })
      .from(marketingContentTable)
      .innerJoin(citiesTable, eq(marketingContentTable.cityId, citiesTable.id))
      .where(eq(marketingContentTable.status, "in_review"))
      .orderBy(desc(marketingContentTable.updatedAt)),
  ]);

  const inScope = <T extends { cityId: number }>(rows: readonly T[]) =>
    context.staff.role === "super_admin" || context.staff.globalAccess
      ? [...rows]
      : rows.filter((row) => context.staff.cityIds.includes(row.cityId));

  return [
    ...inScope(pages).map((page) => ({
      type: "Marketing page" as const,
      id: page.id,
      title: page.title,
      cityName: page.cityName,
      status: page.status,
      href: `/admin/marketing/pages/${page.id}`,
    })),
    ...inScope(social).map((item) => ({
      type: "Social" as const,
      id: item.id,
      title: item.title,
      cityName: item.cityName,
      status: item.status,
      href: `/admin/marketing/social/${item.id}`,
    })),
  ];
}

export async function getMarketingSocialTrackingPreview(id: number) {
  const db = getDb();
  const [item] = await db
    .select({
      id: marketingContentTable.id,
      cityId: marketingContentTable.cityId,
      platform: marketingContentTable.platform,
      contentCode: marketingContentTable.contentCode,
      campaignId: marketingContentTable.campaignId,
      pageId: marketingContentTable.pageId,
    })
    .from(marketingContentTable)
    .where(eq(marketingContentTable.id, id))
    .limit(1);
  if (!item) throw new MarketingWorkflowError("Social content was not found.");
  await requireCityCapability(item.cityId, "marketing:view");

  if (!item.pageId) return null;
  const [page] = await db
    .select({ path: marketingPagesTable.path, cityId: marketingPagesTable.cityId })
    .from(marketingPagesTable)
    .where(eq(marketingPagesTable.id, item.pageId))
    .limit(1);
  if (!page || page.cityId !== item.cityId) return null;

  let campaignSlug: string | null = null;
  if (item.campaignId) {
    const [campaign] = await db
      .select({
        slug: marketingCampaignsTable.slug,
        cityId: marketingCampaignsTable.cityId,
      })
      .from(marketingCampaignsTable)
      .where(eq(marketingCampaignsTable.id, item.campaignId))
      .limit(1);
    if (campaign?.cityId === item.cityId) campaignSlug = campaign.slug;
  }

  return buildMarketingTrackingPath({
    path: page.path,
    platform: item.platform,
    campaignSlug,
    contentCode: item.contentCode,
  });
}

function normalizePublishedUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new MarketingWorkflowError(
      "Published URL is required before social content can be marked published.",
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new MarketingWorkflowError("Published URL must be a valid HTTP or HTTPS URL.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new MarketingWorkflowError("Published URL must use HTTP or HTTPS.");
  }
  return parsed.toString();
}
