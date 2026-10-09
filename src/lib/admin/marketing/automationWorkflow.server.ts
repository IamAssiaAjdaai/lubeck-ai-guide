import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  marketingContentMediaTable,
  marketingContentTable,
} from "@/db/marketingSchema";
import { mediaAssetsTable } from "@/db/schema";
import { decideMarketingAutomationReady } from "@/lib/admin/marketing/automationReady";

export class MarketingAutomationWorkflowError extends Error {
  constructor(
    readonly code:
      | "NOT_FOUND"
      | "INVALID_STATE"
      | "UNSUPPORTED_PLATFORM"
      | "MEDIA_REQUIRED"
      | "CONFLICT",
    readonly status: 404 | 409,
  ) {
    super(code);
    this.name = "MarketingAutomationWorkflowError";
  }
}

export type MarketingAutomationReadyResult = Readonly<{
  contentId: number;
  status: "ready";
  idempotent: boolean;
}>;

export async function markMarketingContentReadyByAutomation(
  contentId: number,
): Promise<MarketingAutomationReadyResult> {
  if (!Number.isInteger(contentId) || contentId <= 0) {
    throw new MarketingAutomationWorkflowError("NOT_FOUND", 404);
  }

  const db = getDb();
  const [content] = await db
    .select({
      id: marketingContentTable.id,
      cityId: marketingContentTable.cityId,
      platform: marketingContentTable.platform,
      status: marketingContentTable.status,
    })
    .from(marketingContentTable)
    .where(eq(marketingContentTable.id, contentId))
    .limit(1);

  if (!content) {
    throw new MarketingAutomationWorkflowError("NOT_FOUND", 404);
  }

  const validMedia = await db
    .select({ id: marketingContentMediaTable.id })
    .from(marketingContentMediaTable)
    .innerJoin(
      mediaAssetsTable,
      eq(marketingContentMediaTable.mediaAssetId, mediaAssetsTable.id),
    )
    .where(
      and(
        eq(marketingContentMediaTable.contentId, contentId),
        eq(mediaAssetsTable.cityId, content.cityId),
        eq(mediaAssetsTable.approvalStatus, "approved"),
        eq(mediaAssetsTable.accessLevel, "public"),
        isNull(mediaAssetsTable.archivedAt),
        inArray(mediaAssetsTable.kind, ["image", "video"]),
      ),
    );

  const decision = decideMarketingAutomationReady({
    status: content.status,
    platform: content.platform,
    validMediaCount: validMedia.length,
  });

  if (decision.action === "already_ready") {
    return {
      contentId: content.id,
      status: "ready",
      idempotent: true,
    };
  }

  if (decision.action === "reject") {
    throw new MarketingAutomationWorkflowError(decision.code, 409);
  }

  const [updated] = await db
    .update(marketingContentTable)
    .set({
      status: "ready",
      updatedByUserId: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(marketingContentTable.id, contentId),
        eq(marketingContentTable.status, "approved"),
      ),
    )
    .returning({ id: marketingContentTable.id });

  if (updated) {
    return {
      contentId: updated.id,
      status: "ready",
      idempotent: false,
    };
  }

  const [current] = await db
    .select({ status: marketingContentTable.status })
    .from(marketingContentTable)
    .where(eq(marketingContentTable.id, contentId))
    .limit(1);

  if (current?.status === "ready") {
    return {
      contentId,
      status: "ready",
      idempotent: true,
    };
  }

  throw new MarketingAutomationWorkflowError("CONFLICT", 409);
}
