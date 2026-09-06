import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import type { Place } from "@/data/places";
import { getDb } from "@/db/client";
import {
  citiesTable,
  cityMediaTable,
  mediaAssetsTable,
  placeMediaTable,
  placesTable,
  tourMediaTable,
  toursTable,
  type MediaAssetRow,
} from "@/db/schema";
import { isLocale, type Locale } from "@/lib/i18n";
import { getMediaObjectStore } from "@/lib/media/storage/storage.server";
import type { MediaObjectStore } from "@/lib/media/storage/types";
import type { MediaEntityType, MediaPurpose, PublicMedia } from "@/lib/media/types";

type PublicAttachment = Readonly<{
  purpose: MediaPurpose;
  position: number;
  locale: string;
}>;
type PublicMediaRow = Readonly<{ attachment: PublicAttachment; asset: MediaAssetRow }>;

export async function getPublicMediaForEntity(
  entityType: MediaEntityType,
  entityId: number,
  store?: MediaObjectStore,
): Promise<readonly PublicMedia[]> {
  const cityId = await getPublishedEntityCityId(entityType, entityId);
  if (!cityId) return [];
  const db = getDb();
  let rows: PublicMediaRow[];
  if (entityType === "city") {
    rows = await db.select({ attachment: cityMediaTable, asset: mediaAssetsTable }).from(cityMediaTable).innerJoin(mediaAssetsTable, eq(cityMediaTable.mediaAssetId, mediaAssetsTable.id)).where(and(eq(cityMediaTable.cityId, entityId), eq(mediaAssetsTable.cityId, cityId), eq(mediaAssetsTable.approvalStatus, "approved"))).orderBy(asc(cityMediaTable.purpose), asc(cityMediaTable.locale), asc(cityMediaTable.position));
  } else if (entityType === "place") {
    rows = await db.select({ attachment: placeMediaTable, asset: mediaAssetsTable }).from(placeMediaTable).innerJoin(mediaAssetsTable, eq(placeMediaTable.mediaAssetId, mediaAssetsTable.id)).where(and(eq(placeMediaTable.placeId, entityId), eq(mediaAssetsTable.cityId, cityId), eq(mediaAssetsTable.approvalStatus, "approved"))).orderBy(asc(placeMediaTable.purpose), asc(placeMediaTable.locale), asc(placeMediaTable.position));
  } else {
    rows = await db.select({ attachment: tourMediaTable, asset: mediaAssetsTable }).from(tourMediaTable).innerJoin(mediaAssetsTable, eq(tourMediaTable.mediaAssetId, mediaAssetsTable.id)).where(and(eq(tourMediaTable.tourId, entityId), eq(mediaAssetsTable.cityId, cityId), eq(mediaAssetsTable.approvalStatus, "approved"))).orderBy(asc(tourMediaTable.purpose), asc(tourMediaTable.locale), asc(tourMediaTable.position));
  }
  return rowsToPublicMedia(rows, store);
}

export async function getPublicMediaSnapshot(
  cityId: number,
  placeIds: readonly number[],
  tourIds: readonly number[],
  store?: MediaObjectStore,
) {
  const db = getDb();
  const [cityRows, placeRows, tourRows] = await Promise.all([
    db.select({ attachment: cityMediaTable, asset: mediaAssetsTable }).from(cityMediaTable).innerJoin(mediaAssetsTable, eq(cityMediaTable.mediaAssetId, mediaAssetsTable.id)).where(and(eq(cityMediaTable.cityId, cityId), eq(mediaAssetsTable.approvalStatus, "approved"))).orderBy(asc(cityMediaTable.purpose), asc(cityMediaTable.locale), asc(cityMediaTable.position)),
    placeIds.length === 0 ? Promise.resolve([]) : db.select({ attachment: placeMediaTable, asset: mediaAssetsTable }).from(placeMediaTable).innerJoin(mediaAssetsTable, eq(placeMediaTable.mediaAssetId, mediaAssetsTable.id)).where(and(inArray(placeMediaTable.placeId, [...placeIds]), eq(mediaAssetsTable.cityId, cityId), eq(mediaAssetsTable.approvalStatus, "approved"))).orderBy(asc(placeMediaTable.placeId), asc(placeMediaTable.purpose), asc(placeMediaTable.locale), asc(placeMediaTable.position)),
    tourIds.length === 0 ? Promise.resolve([]) : db.select({ attachment: tourMediaTable, asset: mediaAssetsTable }).from(tourMediaTable).innerJoin(mediaAssetsTable, eq(tourMediaTable.mediaAssetId, mediaAssetsTable.id)).where(and(inArray(tourMediaTable.tourId, [...tourIds]), eq(mediaAssetsTable.cityId, cityId), eq(mediaAssetsTable.approvalStatus, "approved"))).orderBy(asc(tourMediaTable.tourId), asc(tourMediaTable.purpose), asc(tourMediaTable.locale), asc(tourMediaTable.position)),
  ]);
  return {
    city: rowsToPublicMedia(cityRows, store),
    places: new Map(placeIds.map((id) => [id, rowsToPublicMedia(placeRows.filter(({ attachment }) => attachment.placeId === id), store)] as const)),
    tours: new Map(tourIds.map((id) => [id, rowsToPublicMedia(tourRows.filter(({ attachment }) => attachment.tourId === id), store)] as const)),
  };
}

export function resolvePlaceMedia(
  place: Pick<Place, "image" | "audio">,
  cmsMedia: readonly PublicMedia[],
  locale: Locale,
) {
  const cmsImage = cmsMedia.find((media) => media.kind === "image" && ["hero", "card"].includes(media.purpose));
  const cmsAudio = cmsMedia.find((media) => media.kind === "audio" && media.purpose === "audio" && media.locale === locale);
  return {
    image: cmsImage?.url ?? place.image,
    audio: cmsAudio?.url ?? place.audio?.[locale],
    gallery: cmsMedia.filter((media) => media.kind === "image" && media.purpose === "gallery"),
    videos: cmsMedia.filter((media) => media.kind === "video"),
  };
}

function rowsToPublicMedia(rows: readonly PublicMediaRow[], store?: MediaObjectStore): PublicMedia[] {
  let resolvedStore = store;
  return rows.flatMap(({ attachment, asset }) => {
    if (asset.archivedAt) return [];
    const locale = isLocale(attachment.locale) ? attachment.locale : undefined;
    let url: string | null | undefined;
    if (asset.sourceType === "external") url = asset.canonicalUrl;
    else if (asset.objectKey) {
      resolvedStore ??= getMediaObjectStore();
      url = resolvedStore.getPublicUrl(asset.objectKey);
    }
    if (!url) return [];
    return [{
      assetKey: asset.assetKey,
      kind: asset.kind,
      purpose: attachment.purpose,
      url,
      mimeType: asset.mimeType,
      ...(asset.sizeBytes !== null ? { sizeBytes: asset.sizeBytes } : {}),
      ...(asset.width !== null ? { width: asset.width } : {}),
      ...(asset.height !== null ? { height: asset.height } : {}),
      ...(asset.durationSeconds !== null ? { durationSeconds: asset.durationSeconds } : {}),
      ...(locale ? { locale } : {}),
      ...(asset.sourceType === "external" && asset.externalVideoProvider && asset.externalVideoId && asset.canonicalUrl ? { externalVideo: { provider: asset.externalVideoProvider, videoId: asset.externalVideoId, canonicalUrl: asset.canonicalUrl } } : {}),
    } satisfies PublicMedia];
  });
}

async function getPublishedEntityCityId(entityType: MediaEntityType, entityId: number): Promise<number | undefined> {
  const db = getDb();
  if (entityType === "city") {
    const [city] = await db.select({ id: citiesTable.id }).from(citiesTable).where(and(eq(citiesTable.id, entityId), eq(citiesTable.publicationStatus, "published"))).limit(1);
    return city?.id;
  }
  if (entityType === "place") {
    const [place] = await db.select({ cityId: placesTable.cityId }).from(placesTable).innerJoin(citiesTable, eq(placesTable.cityId, citiesTable.id)).where(and(eq(placesTable.id, entityId), eq(placesTable.publicationStatus, "published"), eq(citiesTable.publicationStatus, "published"))).limit(1);
    return place?.cityId;
  }
  const [tour] = await db.select({ cityId: toursTable.cityId }).from(toursTable).innerJoin(citiesTable, eq(toursTable.cityId, citiesTable.id)).where(and(eq(toursTable.id, entityId), eq(toursTable.publicationStatus, "published"), eq(citiesTable.publicationStatus, "published"))).limit(1);
  return tour?.cityId;
}
