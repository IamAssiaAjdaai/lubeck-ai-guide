import "server-only";

import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import {
  requireAdminCapability,
  requireCityCapability,
  type AdminContext,
} from "@/lib/admin/authorization.server";
import { hasCityCapability } from "@/lib/admin/permissions";
import {
  getCmsCity,
  getCmsPlace,
  getCmsTour,
} from "@/lib/admin/content/repository.server";
import { isLocale } from "@/lib/i18n";
import {
  extractAudioDurationSeconds,
  type AudioDurationExtractor,
} from "@/lib/media/audioMetadata.server";
import { parseExternalVideoUrl } from "@/lib/media/externalVideo";
import {
  validateMediaPurpose,
  validateUploadedObject,
  validateUploadIntent,
} from "@/lib/media/policy";
import {
  attachMedia,
  createExternalVideoRecord,
  createMediaUploadRecord,
  detachMedia,
  finalizeMediaAsset,
  getMediaAsset,
  getMediaAssetWithUsages,
  getMediaAttachment,
  listEntityMedia,
  listMediaAssets,
  listStaleUploadingAssets,
  markStaleUploadArchived,
  markMediaObjectDeleted,
  prepareMediaObjectDeletion,
  setMediaLifecycle,
} from "@/lib/media/repository.server";
import { getMediaObjectStore } from "@/lib/media/storage/storage.server";
import type { MediaObjectStore } from "@/lib/media/storage/types";
import {
  MediaIntegrityError,
  MediaNotFoundError,
  MediaValidationError,
  type MediaAttachmentInput,
  type MediaEntityType,
  type UploadIntentInput,
} from "@/lib/media/types";

const UPLOAD_URL_SECONDS = 10 * 60;
const SIGNATURE_RANGE_END = 63;

export async function createAuthorizedUploadIntent(
  input: UploadIntentInput,
  store: MediaObjectStore = getMediaObjectStore(),
) {
  const validated = validateUploadIntent(input);
  const context = await requireCityCapability(validated.cityId, "media:manage");
  const assetKey = randomUUID();
  const objectKey = `media/${assetKey}/original${extname(validated.originalFilename).toLowerCase()}`;
  const uploadExpiresAt = new Date(Date.now() + UPLOAD_URL_SECONDS * 1000);
  const asset = await createMediaUploadRecord(
    {
      ...validated,
      assetKey,
      objectKey,
      storageProvider: store.providerId,
      uploadExpiresAt,
    },
    context.user.id,
  );
  const uploadUrl = await store.createUploadUrl({
    objectKey,
    contentType: validated.mimeType,
    expiresInSeconds: UPLOAD_URL_SECONDS,
  });
  return { assetId: asset.id, uploadUrl, expiresAt: uploadExpiresAt.toISOString() };
}

export async function finalizeAuthorizedUpload(
  assetId: number,
  store: MediaObjectStore = getMediaObjectStore(),
  extractDuration: AudioDurationExtractor = extractAudioDurationSeconds,
) {
  const asset = await getRequiredMediaAsset(assetId);
  const context = await requireCityCapability(asset.cityId, "media:manage");
  if (asset.approvalStatus !== "uploading") {
    return { assetId: asset.id, status: asset.approvalStatus };
  }
  if (!asset.objectKey || asset.sourceType !== "upload" || asset.expectedSizeBytes === null) {
    throw new MediaIntegrityError("Upload record is incomplete.");
  }
  const metadata = await store.headObject(asset.objectKey);
  if (!metadata) throw new MediaIntegrityError("Uploaded object was not found.");
  const initialBytes = await store.readObjectRange(asset.objectKey, 0, SIGNATURE_RANGE_END);
  validateUploadedObject(
    {
      kind: asset.kind,
      mimeType: asset.mimeType,
      sizeBytes: asset.expectedSizeBytes,
    },
    {
      sizeBytes: metadata.sizeBytes,
      mimeType: metadata.contentType,
      initialBytes,
    },
  );
  const durationSeconds =
    asset.kind === "audio"
      ? await safelyExtractAudioDuration(extractDuration, {
          store,
          objectKey: asset.objectKey,
          mimeType: asset.mimeType,
          sizeBytes: metadata.sizeBytes,
        })
      : undefined;
  const updated = await finalizeMediaAsset(
    asset.id,
    {
      sizeBytes: metadata.sizeBytes,
      mimeType: asset.mimeType,
      checksumSha256: metadata.checksumSha256,
      ...(durationSeconds !== undefined ? { durationSeconds } : {}),
    },
    context.user.id,
  );
  return { assetId: updated.id, status: updated.approvalStatus };
}

async function safelyExtractAudioDuration(
  extractDuration: AudioDurationExtractor,
  input: Parameters<AudioDurationExtractor>[0],
): Promise<number | undefined> {
  try {
    const durationSeconds = await extractDuration(input);
    return Number.isFinite(durationSeconds) && (durationSeconds ?? 0) > 0
      ? durationSeconds
      : undefined;
  } catch {
    return undefined;
  }
}

export async function createAuthorizedExternalVideo(input: Readonly<{
  cityId: number;
  url: string;
  title?: string;
  locale?: string;
}>) {
  if (!Number.isInteger(input.cityId) || input.cityId <= 0) {
    throw new MediaValidationError("City is required.");
  }
  if (input.locale && !isLocale(input.locale)) {
    throw new MediaValidationError("Media locale is not supported.");
  }
  const context = await requireCityCapability(input.cityId, "media:manage");
  const video = parseExternalVideoUrl(input.url);
  const title = input.title?.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (title && title.length > 255) {
    throw new MediaValidationError("External video title is too long.");
  }
  return createExternalVideoRecord(
    {
      assetKey: randomUUID(),
      cityId: input.cityId,
      originalFilename: title || `${video.provider}:${video.videoId}`,
      provider: video.provider,
      externalVideoId: video.videoId,
      canonicalUrl: video.canonicalUrl,
      ...(input.locale ? { locale: input.locale } : {}),
    },
    context.user.id,
  );
}

export async function listAuthorizedMediaAssets() {
  const context = await requireAdminCapability("media:view");
  return filterCityScope(await listMediaAssets(), context);
}

export async function getAuthorizedMediaAsset(id: number) {
  await requireAdminCapability("media:view");
  const asset = await getMediaAssetWithUsages(id);
  if (!asset) throw new MediaNotFoundError();
  await requireCityCapability(asset.cityId, "media:view");
  let previewUrl: string | undefined;
  if (asset.sourceType === "external") {
    previewUrl = asset.canonicalUrl ?? undefined;
  } else if (
    asset.objectKey &&
    asset.approvalStatus !== "uploading" &&
    asset.approvalStatus !== "archived"
  ) {
    previewUrl = await getMediaObjectStore().getAdminPreviewUrl(asset.objectKey);
  }
  return { ...asset, previewUrl };
}

export async function reviewAuthorizedMediaAsset(
  id: number,
  status: "approved" | "rejected",
) {
  const asset = await getRequiredMediaAsset(id);
  await requireAdminCapability("media:view");
  const context = await requireCityCapability(
    asset.cityId,
    status === "approved" ? "publishing:publish" : "publishing:review",
  );
  return setMediaLifecycle(id, status, context.user.id);
}

export async function archiveAuthorizedMediaAsset(id: number) {
  const asset = await getRequiredMediaAsset(id);
  const context = await requireCityCapability(asset.cityId, "media:manage");
  return setMediaLifecycle(id, "archived", context.user.id);
}

export async function deleteAuthorizedArchivedMediaObject(
  id: number,
  store: MediaObjectStore = getMediaObjectStore(),
) {
  const asset = await getRequiredMediaAsset(id);
  const context = await requireCityCapability(asset.cityId, "media:manage");
  const deletion = await prepareMediaObjectDeletion(id);
  await store.deleteObject(deletion.objectKey);
  return markMediaObjectDeleted(
    deletion.id,
    deletion.objectKey,
    context.user.id,
  );
}

export async function attachAuthorizedMedia(input: MediaAttachmentInput) {
  const purpose = validateMediaPurpose(input.purpose);
  const [asset, targetCityId] = await Promise.all([
    getRequiredMediaAsset(input.mediaAssetId),
    getTargetCityId(input.entityType, input.entityId),
  ]);
  if (asset.cityId !== targetCityId) {
    throw new MediaIntegrityError("Media and content must belong to the same city.");
  }
  const context = await requireCityCapability(targetCityId, "media:manage");
  return attachMedia(
    { ...input, purpose },
    context.user.id,
    mediaMutationAuthorization(context, targetCityId),
  );
}

export async function detachAuthorizedMedia(
  entityType: MediaEntityType,
  attachmentId: number,
) {
  const attachment = await getMediaAttachment(entityType, attachmentId);
  if (!attachment) throw new MediaNotFoundError("Media attachment");
  const entityId =
    entityType === "city"
      ? (attachment as { cityId: number }).cityId
      : entityType === "place"
        ? (attachment as { placeId: number }).placeId
        : (attachment as { tourId: number }).tourId;
  const cityId = await getTargetCityId(entityType, entityId);
  const context = await requireCityCapability(cityId, "media:manage");
  return detachMedia(
    entityType,
    attachmentId,
    mediaMutationAuthorization(context, cityId),
  );
}

export async function listAuthorizedEntityMedia(
  entityType: MediaEntityType,
  entityId: number,
) {
  const cityId = await getTargetCityId(entityType, entityId);
  await requireCityCapability(cityId, "media:view");
  return listEntityMedia(entityType, entityId);
}

export async function cleanupAuthorizedStaleUploads(
  olderThanHours = 24,
  store: MediaObjectStore = getMediaObjectStore(),
) {
  const context = await requireAdminCapability("media:manage");
  if (context.staff.role !== "super_admin" && !context.staff.globalAccess) {
    throw new MediaIntegrityError("Stale upload cleanup requires global staff access.");
  }
  const before = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  const stale = await listStaleUploadingAssets(before);
  let cleaned = 0;
  for (const asset of stale) {
    if (asset.objectKey) await store.deleteObject(asset.objectKey);
    if (await markStaleUploadArchived(asset.id, context.user.id)) cleaned += 1;
  }
  return { cleaned };
}

async function getRequiredMediaAsset(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new MediaNotFoundError();
  const asset = await getMediaAsset(id);
  if (!asset) throw new MediaNotFoundError();
  return asset;
}

async function getTargetCityId(entityType: MediaEntityType, entityId: number): Promise<number> {
  if (!Number.isInteger(entityId) || entityId <= 0) throw new MediaNotFoundError("Content");
  if (entityType === "city") {
    const city = await getCmsCity(entityId);
    if (!city) throw new MediaNotFoundError("Content");
    return city.id;
  }
  if (entityType === "place") {
    const place = await getCmsPlace(entityId);
    if (!place) throw new MediaNotFoundError("Content");
    return place.cityId;
  }
  const tour = await getCmsTour(entityId);
  if (!tour) throw new MediaNotFoundError("Content");
  return tour.cityId;
}

function filterCityScope<TRow extends { cityId: number }>(rows: readonly TRow[], context: AdminContext) {
  if (context.staff.role === "super_admin" || context.staff.globalAccess) return rows;
  return rows.filter(({ cityId }) => context.staff.cityIds.includes(cityId));
}

function mediaMutationAuthorization(
  context: AdminContext,
  cityId: number,
) {
  return {
    allowPublicMutation: hasCityCapability(
      context.staff,
      cityId,
      "publishing:publish",
    ),
  } as const;
}
