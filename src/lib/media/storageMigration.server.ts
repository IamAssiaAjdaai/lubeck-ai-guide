import "server-only";

import { asc, eq, isNotNull } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  citiesTable,
  cityMediaTable,
  mediaAssetsTable,
  placeMediaTable,
  placesTable,
  tourMediaTable,
  toursTable,
} from "@/db/schema";
import { getS3MediaEnvironment } from "@/lib/media/storage/environment.server";
import type { S3MediaEnvironment } from "@/lib/media/storage/environment.server";
import type { StoredMediaInventoryItem } from "@/lib/media/storageMigration";

const SOURCE_PREFIX = "CITYWALK_MEDIA_MIGRATION_SOURCE_S3";
const DESTINATION_PREFIX = "CITYWALK_MEDIA_MIGRATION_DESTINATION_S3";

export function getStorageMigrationSourceEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): S3MediaEnvironment {
  return getMigrationProfile(environment, SOURCE_PREFIX);
}

export function getStorageMigrationDestinationEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): S3MediaEnvironment {
  return getMigrationProfile(environment, DESTINATION_PREFIX);
}

export function assertDistinctStorageMigrationEnvironments(
  source: S3MediaEnvironment,
  destination: S3MediaEnvironment,
): void {
  const sourceEndpoint = new URL(source.endpoint).href;
  const destinationEndpoint = new URL(destination.endpoint).href;
  if (
    sourceEndpoint === destinationEndpoint &&
    source.bucket === destination.bucket
  ) {
    throw new Error("Source and destination storage must be distinct.");
  }
}

export async function getStoredMediaInventory(): Promise<
  readonly StoredMediaInventoryItem[]
> {
  const db = getDb();
  const [assets, cityAttachments, placeAttachments, tourAttachments] =
    await Promise.all([
      db
        .select({
          assetId: mediaAssetsTable.id,
          objectKey: mediaAssetsTable.objectKey,
          mimeType: mediaAssetsTable.mimeType,
          sizeBytes: mediaAssetsTable.sizeBytes,
          expectedSizeBytes: mediaAssetsTable.expectedSizeBytes,
          checksumSha256: mediaAssetsTable.checksumSha256,
          lifecycleStatus: mediaAssetsTable.approvalStatus,
          citySlug: citiesTable.slug,
        })
        .from(mediaAssetsTable)
        .innerJoin(citiesTable, eq(citiesTable.id, mediaAssetsTable.cityId))
        .where(isNotNull(mediaAssetsTable.objectKey))
        .orderBy(asc(mediaAssetsTable.id)),
      db
        .select({
          assetId: cityMediaTable.mediaAssetId,
          citySlug: citiesTable.slug,
        })
        .from(cityMediaTable)
        .innerJoin(citiesTable, eq(citiesTable.id, cityMediaTable.cityId)),
      db
        .select({
          assetId: placeMediaTable.mediaAssetId,
          citySlug: citiesTable.slug,
          placeSlug: placesTable.slug,
        })
        .from(placeMediaTable)
        .innerJoin(placesTable, eq(placesTable.id, placeMediaTable.placeId))
        .innerJoin(citiesTable, eq(citiesTable.id, placesTable.cityId)),
      db
        .select({
          assetId: tourMediaTable.mediaAssetId,
          citySlug: citiesTable.slug,
          tourSlug: toursTable.slug,
        })
        .from(tourMediaTable)
        .innerJoin(toursTable, eq(toursTable.id, tourMediaTable.tourId))
        .innerJoin(citiesTable, eq(citiesTable.id, toursTable.cityId)),
    ]);

  const associations = new Map<number, string[]>();
  const add = (assetId: number, value: string) => {
    const values = associations.get(assetId) ?? [];
    values.push(value);
    associations.set(assetId, values);
  };
  cityAttachments.forEach(({ assetId, citySlug }) =>
    add(assetId, `city:${citySlug}`),
  );
  placeAttachments.forEach(({ assetId, citySlug, placeSlug }) =>
    add(assetId, `place:${citySlug}/${placeSlug}`),
  );
  tourAttachments.forEach(({ assetId, citySlug, tourSlug }) =>
    add(assetId, `tour:${citySlug}/${tourSlug}`),
  );

  return assets.map((asset) => {
    if (!asset.objectKey) {
      throw new Error("Stored media inventory unexpectedly contains no object key.");
    }
    const linked = associations.get(asset.assetId) ?? [];
    const expectedSizeBytes = asset.sizeBytes ?? asset.expectedSizeBytes;
    return {
      assetId: asset.assetId,
      objectKey: asset.objectKey,
      mimeType: asset.mimeType,
      ...(expectedSizeBytes !== null
        ? { expectedSizeBytes }
        : {}),
      ...(asset.checksumSha256
        ? { checksumSha256: asset.checksumSha256 }
        : {}),
      lifecycleStatus: asset.lifecycleStatus,
      citySlug: asset.citySlug,
      attachmentCount: linked.length,
      associations: linked,
    } satisfies StoredMediaInventoryItem;
  });
}

function getMigrationProfile(
  environment: Readonly<Record<string, string | undefined>>,
  prefix: string,
): S3MediaEnvironment {
  const read = (suffix: string): string | undefined =>
    environment[`${prefix}_${suffix}`];

  return getS3MediaEnvironment({
    CITYWALK_MEDIA_STORAGE: "s3",
    CITYWALK_MEDIA_S3_ENDPOINT: read("ENDPOINT"),
    CITYWALK_MEDIA_S3_REGION: read("REGION"),
    CITYWALK_MEDIA_S3_BUCKET: read("BUCKET"),
    CITYWALK_MEDIA_S3_ACCESS_KEY_ID: read("ACCESS_KEY_ID"),
    CITYWALK_MEDIA_S3_SECRET_ACCESS_KEY: read("SECRET_ACCESS_KEY"),
  });
}
