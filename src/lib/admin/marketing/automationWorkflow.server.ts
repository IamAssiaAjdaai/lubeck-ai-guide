import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  marketingContentMediaTable,
  marketingContentTable,
} from "@/db/marketingSchema";
import { mediaAssetsTable } from "@/db/schema";
import { decideMarketingAutomationPublished } from "@/lib/admin/marketing/automationPublished";
import { decideMarketingAutomationReady } from "@/lib/admin/marketing/automationReady";

export class MarketingAutomationWorkflowError extends Error {
  constructor(
    readonly code:
      | "NOT_FOUND"
      | "INVALID_STATE"
      | "UNSUPPORTED_PLATFORM"
      | "MEDIA_REQUIRED"
      | "INVALID_PUBLISHED_URL"
      | "PUBLISHED_URL_MISMATCH"
      | "CONFLICT",
    readonly status: 400 | 404 | 409,
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

export type MarketingAutomationPublishedResult = Readonly<{
  contentId: number;
  status: "published";
  publishedUrl: string;
  idempotent: boolean;
}>;

export async function markMarketingContentPublishedByAutomation(
  contentId: number,
  rawPublishedUrl: unknown,
): Promise<MarketingAutomationPublishedResult> {
  if (!Number.isInteger(contentId) || contentId <= 0) {
    throw new MarketingAutomationWorkflowError("NOT_FOUND", 404);
  }

  const db = getDb();
  const [content] = await db
    .select({
      id: marketingContentTable.id,
      status: marketingContentTable.status,
      publishedUrl: marketingContentTable.publishedUrl,
    })
    .from(marketingContentTable)
    .where(eq(marketingContentTable.id, contentId))
    .limit(1);

  if (!content) {
    throw new MarketingAutomationWorkflowError("NOT_FOUND", 404);
  }

  const decision = decideMarketingAutomationPublished({
    status: content.status,
    requestedPublishedUrl: rawPublishedUrl,
    currentPublishedUrl: content.publishedUrl,
  });

  if (decision.action === "already_published") {
    return {
      contentId: content.id,
      status: "published",
      publishedUrl: decision.publishedUrl,
      idempotent: true,
    };
  }

  if (decision.action === "reject") {
    throw new MarketingAutomationWorkflowError(
      decision.code,
      decision.code === "INVALID_PUBLISHED_URL" ? 400 : 409,
    );
  }

  const now = new Date();
  const [updated] = await db
    .update(marketingContentTable)
    .set({
      status: "published",
      publishedUrl: decision.publishedUrl,
      publishedAt: now,
      updatedByUserId: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(marketingContentTable.id, contentId),
        eq(marketingContentTable.status, "ready"),
      ),
    )
    .returning({
      id: marketingContentTable.id,
      publishedUrl: marketingContentTable.publishedUrl,
    });

  if (updated?.publishedUrl) {
    return {
      contentId: updated.id,
      status: "published",
      publishedUrl: updated.publishedUrl,
      idempotent: false,
    };
  }

  const [current] = await db
    .select({
      status: marketingContentTable.status,
      publishedUrl: marketingContentTable.publishedUrl,
    })
    .from(marketingContentTable)
    .where(eq(marketingContentTable.id, contentId))
    .limit(1);

  const retryDecision = decideMarketingAutomationPublished({
    status: current?.status ?? "",
    requestedPublishedUrl: rawPublishedUrl,
    currentPublishedUrl: current?.publishedUrl,
  });

  if (retryDecision.action === "already_published") {
    return {
      contentId,
      status: "published",
      publishedUrl: retryDecision.publishedUrl,
      idempotent: true,
    };
  }

  throw new MarketingAutomationWorkflowError("CONFLICT", 409);
}
