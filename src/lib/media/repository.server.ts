import "server-only";

import { and, asc, eq, lt, ne, or, sql } from "drizzle-orm";

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
import { isLocale } from "@/lib/i18n";
import { isPurposeCompatible } from "@/lib/media/policy";
import {
  MediaIntegrityError,
  MediaNotFoundError,
  type ExternalVideoProvider,
  type MediaAttachmentInput,
  type MediaEntityType,
  type MediaLifecycle,
  type UploadIntentInput,
} from "@/lib/media/types";

type CmsTransaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

export type CreateUploadRecordInput = UploadIntentInput &
  Readonly<{
    assetKey: string;
    objectKey: string;
    storageProvider: string;
    uploadExpiresAt: Date;
  }>;

export type CreateExternalVideoInput = Readonly<{
  assetKey: string;
  cityId: number;
  originalFilename: string;
  provider: ExternalVideoProvider;
  externalVideoId: string;
  canonicalUrl: string;
  locale?: string;
}>;

export async function createMediaUploadRecord(
  input: CreateUploadRecordInput,
  actorId: string,
) {
  const db = getDb();
  return db.transaction(async (tx) => {
    await assertEntityCity(tx, "city", input.cityId);
    const [asset] = await tx
      .insert(mediaAssetsTable)
      .values({
        assetKey: input.assetKey,
        cityId: input.cityId,
        kind: input.kind,
        sourceType: "upload",
        storageProvider: input.storageProvider,
        objectKey: input.objectKey,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        expectedSizeBytes: input.sizeBytes,
        locale: input.locale,
        approvalStatus: "uploading",
        uploadExpiresAt: input.uploadExpiresAt,
        createdByUserId: actorId,
        updatedByUserId: actorId,
      })
      .returning();
    if (!asset) throw new MediaIntegrityError("Unable to create upload intent.");
    return asset;
  });
}

export async function createExternalVideoRecord(
  input: CreateExternalVideoInput,
  actorId: string,
) {
  const db = getDb();
  return db.transaction(async (tx) => {
    await assertEntityCity(tx, "city", input.cityId);
    const [asset] = await tx
      .insert(mediaAssetsTable)
      .values({
        assetKey: input.assetKey,
        cityId: input.cityId,
        kind: "video",
        sourceType: "external",
        originalFilename: input.originalFilename,
        mimeType: "text/uri-list",
        locale: input.locale,
        approvalStatus: "pending_review",
        externalVideoProvider: input.provider,
        externalVideoId: input.externalVideoId,
        canonicalUrl: input.canonicalUrl,
        createdByUserId: actorId,
        updatedByUserId: actorId,
      })
      .returning();
    if (!asset) throw new MediaIntegrityError("Unable to create external video.");
    return asset;
  });
}

export async function getMediaAsset(id: number) {
  const [asset] = await getDb()
    .select()
    .from(mediaAssetsTable)
    .where(eq(mediaAssetsTable.id, id))
    .limit(1);
  return asset;
}

export async function listMediaAssets() {
  const db = getDb();
  const [assets, cityUsages, placeUsages, tourUsages] = await Promise.all([
    db.select().from(mediaAssetsTable).orderBy(asc(mediaAssetsTable.createdAt)),
    db.select({ mediaAssetId: cityMediaTable.mediaAssetId }).from(cityMediaTable),
    db.select({ mediaAssetId: placeMediaTable.mediaAssetId }).from(placeMediaTable),
    db.select({ mediaAssetId: tourMediaTable.mediaAssetId }).from(tourMediaTable),
  ]);
  const usageIds = [...cityUsages, ...placeUsages, ...tourUsages];
  return assets.map((asset) => ({
    ...asset,
    usageCount: usageIds.filter(({ mediaAssetId }) => mediaAssetId === asset.id).length,
  }));
}

export async function getMediaAssetWithUsages(id: number) {
  const asset = await getMediaAsset(id);
  if (!asset) return undefined;
  const usages = await listMediaUsages(id);
  return { ...asset, usages, usageCount: usages.length };
}

export async function finalizeMediaAsset(
  id: number,
  values: Readonly<{
    sizeBytes: number;
    mimeType: string;
    checksumSha256?: string;
  }>,
  actorId: string,
) {
  return getDb().transaction(async (tx) => {
    const asset = await lockMediaAsset(tx, id);
    if (asset.approvalStatus !== "uploading") return asset;
    const [updated] = await tx
      .update(mediaAssetsTable)
      .set({
        sizeBytes: values.sizeBytes,
        mimeType: values.mimeType,
        checksumSha256: values.checksumSha256,
        approvalStatus: "pending_review",
        uploadExpiresAt: null,
        updatedByUserId: actorId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(mediaAssetsTable.id, id),
          eq(mediaAssetsTable.approvalStatus, "uploading"),
        ),
      )
      .returning();
    return updated ?? asset;
  });
}

export async function setMediaLifecycle(
  id: number,
  status: Extract<MediaLifecycle, "approved" | "rejected" | "archived">,
  actorId: string,
) {
  return getDb().transaction(async (tx) => {
    const asset = await lockMediaAsset(tx, id);
    if (status === "archived") {
      const usageCount = await countMediaUsages(tx, id);
      if (usageCount > 0) {
        throw new MediaIntegrityError(
          "Detach this asset from all content before archiving it.",
        );
      }
    }
    if (status !== "archived" && asset.approvalStatus === "uploading") {
      throw new MediaIntegrityError("Incomplete uploads cannot be reviewed.");
    }
    if (asset.approvalStatus === "archived" && status !== "archived") {
      throw new MediaIntegrityError("Archived assets cannot be reviewed.");
    }
    const [updated] = await tx
      .update(mediaAssetsTable)
      .set({
        approvalStatus: status,
        archivedAt: status === "archived" ? new Date() : null,
        updatedByUserId: actorId,
        updatedAt: new Date(),
      })
      .where(eq(mediaAssetsTable.id, id))
      .returning();
    if (!updated) throw new MediaNotFoundError();
    return updated;
  });
}

export async function prepareMediaObjectDeletion(id: number) {
  return getDb().transaction(async (tx) => {
    const asset = await lockMediaAsset(tx, id);
    if (asset.sourceType !== "upload" || !asset.objectKey) {
      throw new MediaIntegrityError("This asset has no stored object to delete.");
    }
    if (asset.approvalStatus !== "archived") {
      throw new MediaIntegrityError("Archive the asset before deleting its stored object.");
    }
    if ((await countMediaUsages(tx, id)) > 0) {
      throw new MediaIntegrityError("Detach this asset before deleting its stored object.");
    }
    return { id: asset.id, cityId: asset.cityId, objectKey: asset.objectKey };
  });
}

export async function markMediaObjectDeleted(
  id: number,
  expectedObjectKey: string,
  actorId: string,
) {
  const [updated] = await getDb()
    .update(mediaAssetsTable)
    .set({
      objectKey: null,
      updatedByUserId: actorId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(mediaAssetsTable.id, id),
        eq(mediaAssetsTable.approvalStatus, "archived"),
        eq(mediaAssetsTable.objectKey, expectedObjectKey),
      ),
    )
    .returning();
  if (!updated) {
    throw new MediaIntegrityError(
      "Stored object deletion could not be recorded; retry safely.",
    );
  }
  return updated;
}

export async function attachMedia(
  input: MediaAttachmentInput,
  actorId: string,
) {
  return getDb().transaction(async (tx) => {
    const asset = await lockMediaAsset(tx, input.mediaAssetId);
    const targetCityId = await assertEntityCity(
      tx,
      input.entityType,
      input.entityId,
    );
    if (asset.cityId !== targetCityId) {
      throw new MediaIntegrityError("Media and content must belong to the same city.");
    }
    if (asset.approvalStatus === "uploading") {
      throw new MediaIntegrityError("Incomplete uploads cannot be attached.");
    }
    if (asset.approvalStatus === "archived") {
      throw new MediaIntegrityError("Archived media cannot be attached.");
    }
    if (!isPurposeCompatible(asset.kind, input.purpose)) {
      throw new MediaIntegrityError("Media purpose is incompatible with this asset kind.");
    }
    const locale = input.locale ?? "";
    if (locale && !isLocale(locale)) {
      throw new MediaIntegrityError("Attachment locale is not supported.");
    }
    if (asset.kind === "audio") {
      if (!locale || locale !== asset.locale) {
        throw new MediaIntegrityError("Audio attachments require the asset's exact locale.");
      }
    }
    const position = input.position ?? 0;
    if (!Number.isInteger(position) || position < 0) {
      throw new MediaIntegrityError("Media position must be a non-negative integer.");
    }
    if (!["gallery", "video"].includes(input.purpose) && position !== 0) {
      throw new MediaIntegrityError("This media purpose does not support ordering.");
    }
    const table = attachmentTable(input.entityType);
    const entityColumn = attachmentEntityColumn(input.entityType);
    const existing = await tx
      .select({ id: table.id })
      .from(table)
      .where(
        and(
          eq(entityColumn, input.entityId),
          eq(table.purpose, input.purpose),
          eq(table.locale, locale),
          eq(table.position, position),
        ),
      )
      .limit(1);
    const values = {
      mediaAssetId: input.mediaAssetId,
      purpose: input.purpose,
      position,
      locale,
      createdByUserId: actorId,
      [entityKey(input.entityType)]: input.entityId,
    };
    if (existing[0]) {
      if (["gallery", "video"].includes(input.purpose)) {
        throw new MediaIntegrityError("This ordered media position is already occupied.");
      }
      const [replacement] = await tx
        .update(table)
        .set({
          mediaAssetId: input.mediaAssetId,
          createdByUserId: actorId,
          createdAt: new Date(),
        })
        .where(eq(table.id, existing[0].id))
        .returning();
      if (!replacement) throw new MediaIntegrityError("Unable to replace media attachment.");
      return replacement;
    }
    const [attachment] = await tx.insert(table).values(values as never).returning();
    if (!attachment) throw new MediaIntegrityError("Unable to attach media.");
    return attachment;
  });
}

export async function detachMedia(
  entityType: MediaEntityType,
  attachmentId: number,
) {
  const table = attachmentTable(entityType);
  const [deleted] = await getDb()
    .delete(table)
    .where(eq(table.id, attachmentId))
    .returning();
  if (!deleted) throw new MediaNotFoundError("Media attachment");
  return deleted;
}

export async function getMediaAttachment(
  entityType: MediaEntityType,
  attachmentId: number,
) {
  const table = attachmentTable(entityType);
  const [attachment] = await getDb()
    .select()
    .from(table)
    .where(eq(table.id, attachmentId))
    .limit(1);
  return attachment;
}

export async function listEntityMedia(
  entityType: MediaEntityType,
  entityId: number,
) {
  const table = attachmentTable(entityType);
  const entityColumn = attachmentEntityColumn(entityType);
  return getDb()
    .select({ attachment: table, asset: mediaAssetsTable })
    .from(table)
    .innerJoin(mediaAssetsTable, eq(table.mediaAssetId, mediaAssetsTable.id))
    .where(eq(entityColumn, entityId))
    .orderBy(asc(table.purpose), asc(table.locale), asc(table.position));
}

export async function listMediaUsages(mediaAssetId: number) {
  const db = getDb();
  const [cities, places, tours] = await Promise.all([
    db
      .select({ attachment: cityMediaTable, entitySlug: citiesTable.slug })
      .from(cityMediaTable)
      .innerJoin(citiesTable, eq(cityMediaTable.cityId, citiesTable.id))
      .where(eq(cityMediaTable.mediaAssetId, mediaAssetId)),
    db
      .select({ attachment: placeMediaTable, entitySlug: placesTable.slug })
      .from(placeMediaTable)
      .innerJoin(placesTable, eq(placeMediaTable.placeId, placesTable.id))
      .where(eq(placeMediaTable.mediaAssetId, mediaAssetId)),
    db
      .select({ attachment: tourMediaTable, entitySlug: toursTable.slug })
      .from(tourMediaTable)
      .innerJoin(toursTable, eq(tourMediaTable.tourId, toursTable.id))
      .where(eq(tourMediaTable.mediaAssetId, mediaAssetId)),
  ]);
  return [
    ...cities.map((usage) => ({ ...usage, entityType: "city" as const })),
    ...places.map((usage) => ({ ...usage, entityType: "place" as const })),
    ...tours.map((usage) => ({ ...usage, entityType: "tour" as const })),
  ];
}

export async function listStaleUploadingAssets(before: Date) {
  return getDb()
    .select()
    .from(mediaAssetsTable)
    .where(
      and(
        eq(mediaAssetsTable.approvalStatus, "uploading"),
        or(
          lt(mediaAssetsTable.createdAt, before),
          lt(mediaAssetsTable.uploadExpiresAt, before),
        ),
      ),
    );
}

export async function markStaleUploadArchived(id: number, actorId: string) {
  const [updated] = await getDb()
    .update(mediaAssetsTable)
    .set({
      approvalStatus: "archived",
      archivedAt: new Date(),
      uploadExpiresAt: null,
      updatedByUserId: actorId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(mediaAssetsTable.id, id),
        eq(mediaAssetsTable.approvalStatus, "uploading"),
      ),
    )
    .returning();
  return updated;
}

export async function assertEntityMovePreservesMediaCity(
  tx: CmsTransaction,
  entityType: Extract<MediaEntityType, "place" | "tour">,
  entityId: number,
  targetCityId: number,
) {
  const table = entityType === "place" ? placeMediaTable : tourMediaTable;
  const entityColumn = entityType === "place" ? placeMediaTable.placeId : tourMediaTable.tourId;
  const [conflict] = await tx
    .select({ mediaAssetId: table.mediaAssetId })
    .from(table)
    .innerJoin(mediaAssetsTable, eq(table.mediaAssetId, mediaAssetsTable.id))
    .where(
      and(
        eq(entityColumn, entityId),
        ne(mediaAssetsTable.cityId, targetCityId),
      ),
    )
    .limit(1);
  if (conflict) {
    throw new MediaIntegrityError(
      "Detach city-scoped media before moving this content to another city.",
    );
  }
}

async function lockMediaAsset(tx: CmsTransaction, id: number): Promise<MediaAssetRow> {
  const [asset] = await tx
    .select()
    .from(mediaAssetsTable)
    .where(eq(mediaAssetsTable.id, id))
    .for("update")
    .limit(1);
  if (!asset) throw new MediaNotFoundError();
  return asset;
}

async function assertEntityCity(
  tx: CmsTransaction,
  entityType: MediaEntityType,
  entityId: number,
): Promise<number> {
  if (entityType === "city") {
    const [city] = await tx.select({ id: citiesTable.id }).from(citiesTable).where(eq(citiesTable.id, entityId)).limit(1);
    if (!city) throw new MediaNotFoundError("City");
    return city.id;
  }
  if (entityType === "place") {
    const [place] = await tx.select({ cityId: placesTable.cityId }).from(placesTable).where(eq(placesTable.id, entityId)).limit(1);
    if (!place) throw new MediaNotFoundError("Place");
    return place.cityId;
  }
  const [tour] = await tx.select({ cityId: toursTable.cityId }).from(toursTable).where(eq(toursTable.id, entityId)).limit(1);
  if (!tour) throw new MediaNotFoundError("Tour");
  return tour.cityId;
}

async function countMediaUsages(tx: CmsTransaction, mediaAssetId: number): Promise<number> {
  let total = 0;
  for (const table of [cityMediaTable, placeMediaTable, tourMediaTable]) {
    const [result] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(table)
      .where(eq(table.mediaAssetId, mediaAssetId));
    total += result?.count ?? 0;
  }
  return total;
}

function attachmentTable(entityType: MediaEntityType) {
  if (entityType === "city") return cityMediaTable;
  if (entityType === "place") return placeMediaTable;
  return tourMediaTable;
}

function attachmentEntityColumn(entityType: MediaEntityType) {
  if (entityType === "city") return cityMediaTable.cityId;
  if (entityType === "place") return placeMediaTable.placeId;
  return tourMediaTable.tourId;
}

function entityKey(entityType: MediaEntityType): "cityId" | "placeId" | "tourId" {
  if (entityType === "city") return "cityId";
  if (entityType === "place") return "placeId";
  return "tourId";
}
