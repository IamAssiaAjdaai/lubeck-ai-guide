import "server-only";

import { and, eq, exists, isNull, ne, or } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  citiesTable,
  mediaAssetsTable,
  placeMediaTable,
  placeRevisionsTable,
  placesTable,
} from "@/db/schema";
import { isLocale, type Locale } from "@/lib/i18n";
import type { DeliverableMediaAsset } from "@/lib/media/mediaDelivery.server";
import { isCitySlug } from "@/lib/commerce/cityPassConfig";

export type PremiumPlaceAudio = Readonly<{
  assetKey: string;
  src: string;
  durationSeconds?: number;
  locale: Locale;
}>;

export async function getPremiumPlaceAudio(
  citySlug: string,
  placeSlug: string,
  locale: Locale,
): Promise<PremiumPlaceAudio | undefined> {
  if (!isCitySlug(citySlug) || !PLACE_SLUG.test(placeSlug)) return undefined;
  const db = getDb();
  const [row] = await db
    .select({
      assetKey: mediaAssetsTable.assetKey,
      durationSeconds: mediaAssetsTable.durationSeconds,
      assetLocale: mediaAssetsTable.locale,
    })
    .from(placeMediaTable)
    .innerJoin(
      mediaAssetsTable,
      eq(placeMediaTable.mediaAssetId, mediaAssetsTable.id),
    )
    .innerJoin(placesTable, eq(placeMediaTable.placeId, placesTable.id))
    .innerJoin(citiesTable, eq(placesTable.cityId, citiesTable.id))
    .where(
      and(
        eq(citiesTable.slug, citySlug),
        eq(citiesTable.publicationStatus, "published"),
        eq(placesTable.slug, placeSlug),
        publicPlaceCondition(db),
        eq(placeMediaTable.purpose, "audio"),
        eq(placeMediaTable.position, 0),
        eq(placeMediaTable.locale, locale),
        eq(mediaAssetsTable.locale, locale),
        eq(mediaAssetsTable.cityId, citiesTable.id),
        eq(mediaAssetsTable.kind, "audio"),
        eq(mediaAssetsTable.sourceType, "upload"),
        eq(mediaAssetsTable.accessLevel, "premium"),
        eq(mediaAssetsTable.approvalStatus, "approved"),
        isNull(mediaAssetsTable.archivedAt),
      ),
    )
    .limit(1);

  if (!row || !isLocale(row.assetLocale) || row.assetLocale !== locale) {
    return undefined;
  }
  return {
    assetKey: row.assetKey,
    src: premiumMediaPath(row.assetKey),
    locale,
    ...(row.durationSeconds !== null
      ? { durationSeconds: row.durationSeconds }
      : {}),
  };
}

export type PremiumMediaDeliveryAsset = DeliverableMediaAsset &
  Readonly<{
    requiredEntitlement: Readonly<{
      scopeType: "city";
      scopeKey: string;
    }>;
  }>;

export async function getPremiumMediaDeliveryAsset(
  assetKey: string,
): Promise<PremiumMediaDeliveryAsset | undefined> {
  if (!isMediaAssetKey(assetKey)) return undefined;
  const db = getDb();
  const [row] = await db
    .select({
      objectKey: mediaAssetsTable.objectKey,
      mimeType: mediaAssetsTable.mimeType,
      sizeBytes: mediaAssetsTable.sizeBytes,
      citySlug: citiesTable.slug,
    })
    .from(mediaAssetsTable)
    .innerJoin(
      placeMediaTable,
      eq(mediaAssetsTable.id, placeMediaTable.mediaAssetId),
    )
    .innerJoin(placesTable, eq(placeMediaTable.placeId, placesTable.id))
    .innerJoin(citiesTable, eq(placesTable.cityId, citiesTable.id))
    .where(
      and(
        eq(mediaAssetsTable.assetKey, assetKey),
        eq(mediaAssetsTable.kind, "audio"),
        eq(mediaAssetsTable.sourceType, "upload"),
        eq(mediaAssetsTable.accessLevel, "premium"),
        eq(mediaAssetsTable.approvalStatus, "approved"),
        isNull(mediaAssetsTable.archivedAt),
        eq(mediaAssetsTable.cityId, citiesTable.id),
        eq(placeMediaTable.purpose, "audio"),
        eq(placeMediaTable.position, 0),
        eq(placeMediaTable.locale, mediaAssetsTable.locale),
        publicPlaceCondition(db),
        eq(citiesTable.publicationStatus, "published"),
      ),
    )
    .limit(1);
  if (!row?.objectKey || !row.sizeBytes || row.sizeBytes <= 0) return undefined;
  return {
    objectKey: row.objectKey,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    requiredEntitlement: {
      scopeType: "city",
      scopeKey: row.citySlug,
    },
  };
}

export function premiumMediaPath(assetKey: string): string {
  return `/api/commerce/media/${encodeURIComponent(assetKey)}`;
}

function publicPlaceCondition(db: ReturnType<typeof getDb>) {
  return and(
    ne(placesTable.publicationStatus, "archived"),
    or(
      eq(placesTable.publicationStatus, "published"),
      exists(
        db
          .select({ id: placeRevisionsTable.id })
          .from(placeRevisionsTable)
          .where(
            and(
              eq(placeRevisionsTable.placeId, placesTable.id),
              eq(placeRevisionsTable.isCurrent, true),
            ),
          ),
      ),
    ),
  );
}

function isMediaAssetKey(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

const PLACE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
