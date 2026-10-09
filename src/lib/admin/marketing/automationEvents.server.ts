import "server-only";

import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  marketingContentMediaTable,
  marketingContentTable,
} from "@/db/marketingSchema";
import { mediaAssetsTable } from "@/db/schema";

const APPROVED_EVENT = "marketing.content.approved" as const;
const EVENT_HEADER = "x-citywalk-event-key";
const DELIVERY_TIMEOUT_MS = 5_000;

export type MarketingApprovedEvent = Readonly<{
  event: typeof APPROVED_EVENT;
  content: Readonly<{
    id: number;
    cityId: number;
    contentCode: string;
    platform: string;
    format: string;
    hook: string;
    script: string | null;
    caption: string | null;
    cta: string | null;
  }>;
  media: readonly Readonly<{
    assetKey: string;
    kind: string;
    mimeType: string;
    originalFilename: string;
    position: number;
  }>[];
}>;

export type MarketingApprovedEventDelivery = Readonly<{
  delivered: boolean;
  skipped: boolean;
}>;

export async function notifyMarketingContentApproved(
  contentId: number,
): Promise<MarketingApprovedEventDelivery> {
  const webhookUrl = process.env.CITYWALK_MARKETING_APPROVED_WEBHOOK_URL?.trim();
  const webhookSecret =
    process.env.CITYWALK_MARKETING_APPROVED_WEBHOOK_SECRET?.trim();

  if (!webhookUrl || !webhookSecret) {
    return { delivered: false, skipped: true };
  }

  const payload = await loadApprovedMarketingEvent(contentId);
  if (!payload) {
    return { delivered: false, skipped: true };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [EVENT_HEADER]: webhookSecret,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    return {
      delivered: response.ok,
      skipped: false,
    };
  } catch {
    return { delivered: false, skipped: false };
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadApprovedMarketingEvent(
  contentId: number,
): Promise<MarketingApprovedEvent | null> {
  const db = getDb();
  const [content] = await db
    .select({
      id: marketingContentTable.id,
      cityId: marketingContentTable.cityId,
      contentCode: marketingContentTable.contentCode,
      platform: marketingContentTable.platform,
      format: marketingContentTable.format,
      hook: marketingContentTable.hook,
      script: marketingContentTable.script,
      caption: marketingContentTable.caption,
      cta: marketingContentTable.cta,
      status: marketingContentTable.status,
    })
    .from(marketingContentTable)
    .where(eq(marketingContentTable.id, contentId))
    .limit(1);

  if (!content || content.status !== "approved") {
    return null;
  }

  const media = await db
    .select({
      assetKey: mediaAssetsTable.assetKey,
      kind: mediaAssetsTable.kind,
      mimeType: mediaAssetsTable.mimeType,
      originalFilename: mediaAssetsTable.originalFilename,
      position: marketingContentMediaTable.position,
    })
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
    )
    .orderBy(asc(marketingContentMediaTable.position));

  return {
    event: APPROVED_EVENT,
    content: {
      id: content.id,
      cityId: content.cityId,
      contentCode: content.contentCode,
      platform: content.platform,
      format: content.format,
      hook: content.hook,
      script: content.script,
      caption: content.caption,
      cta: content.cta,
    },
    media: media.map((asset) => ({
      assetKey: asset.assetKey,
      kind: asset.kind,
      mimeType: asset.mimeType,
      originalFilename: asset.originalFilename,
      position: asset.position,
    })),
  };
}
