"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AdminAuthorizationError } from "@/lib/admin/authorization.server";
import {
  archiveAuthorizedMediaAsset,
  attachAuthorizedMedia,
  cancelAuthorizedMediaUpload,
  createAuthorizedExternalVideo,
  deleteAuthorizedArchivedMediaObject,
  detachAuthorizedMedia,
  reviewAuthorizedMediaAsset,
  retryAuthorizedUploadFinalize,
} from "@/lib/media/service.server";
import {
  MediaIntegrityError,
  MediaNotFoundError,
  MediaValidationError,
  type MediaEntityType,
  type MediaPurpose,
} from "@/lib/media/types";
import { isLocale } from "@/lib/i18n";

export async function createExternalVideoAction(formData: FormData) {
  let destination = "/admin/media/new";
  try {
    const asset = await createAuthorizedExternalVideo({
      cityId: Number(formData.get("cityId")),
      url: String(formData.get("url") ?? ""),
      title: String(formData.get("title") ?? ""),
      locale: optionalLocale(formData.get("locale")),
    });
    revalidatePath("/admin/media");
    destination = `/admin/media/${asset.id}?saved=1`;
  } catch (error) {
    destination += `?error=${encodeURIComponent(mediaActionError(error))}`;
  }
  redirect(destination);
}

export async function reviewMediaAction(
  id: number,
  status: "approved" | "rejected",
) {
  let destination = `/admin/media/${id}`;
  try {
    await reviewAuthorizedMediaAsset(id, status);
    revalidatePath("/admin/media");
    destination = `/admin/media?status=${status}&saved=1`;
  } catch (error) {
    destination += `?error=${encodeURIComponent(mediaActionError(error))}`;
  }
  redirect(destination);
}

export async function archiveMediaAction(id: number) {
  let destination = `/admin/media/${id}`;
  try {
    await archiveAuthorizedMediaAsset(id);
    revalidatePath("/admin/media");
    destination += "?saved=1";
  } catch (error) {
    destination += `?error=${encodeURIComponent(mediaActionError(error))}`;
  }
  redirect(destination);
}

export async function deleteMediaObjectAction(id: number) {
  let destination = `/admin/media/${id}`;
  try {
    await deleteAuthorizedArchivedMediaObject(id);
    revalidatePath("/admin/media");
    destination += "?saved=1";
  } catch (error) {
    destination += `?error=${encodeURIComponent(mediaActionError(error))}`;
  }
  redirect(destination);
}

export async function retryFinalizeMediaAction(id: number) {
  let destination = "/admin/media?status=uploading";
  try {
    await retryAuthorizedUploadFinalize(id);
    revalidatePath("/admin/media");
    destination = "/admin/media?status=pending_review&saved=1";
  } catch (error) {
    destination += `&error=${encodeURIComponent(mediaActionError(error))}`;
  }
  redirect(destination);
}

export async function cancelUploadAction(id: number) {
  let destination = `/admin/media/${id}`;
  try {
    await cancelAuthorizedMediaUpload(id);
    revalidatePath("/admin/media");
    destination = "/admin/media?status=archived&saved=1";
  } catch (error) {
    destination += `?error=${encodeURIComponent(mediaActionError(error))}`;
  }
  redirect(destination);
}

export async function archiveMediaFromLibraryAction(id: number) {
  let destination = "/admin/media";
  try {
    await archiveAuthorizedMediaAsset(id);
    revalidatePath("/admin/media");
    destination = "/admin/media?status=archived&saved=1";
  } catch (error) {
    destination += `?error=${encodeURIComponent(mediaActionError(error))}`;
  }
  redirect(destination);
}

export async function deleteMediaObjectFromLibraryAction(id: number) {
  let destination = "/admin/media?status=archived";
  try {
    await deleteAuthorizedArchivedMediaObject(id);
    revalidatePath("/admin/media");
    destination += "&saved=1";
  } catch (error) {
    destination += `&error=${encodeURIComponent(mediaActionError(error))}`;
  }
  redirect(destination);
}

export async function attachMediaAction(
  entityType: MediaEntityType,
  entityId: number,
  formData: FormData,
) {
  let destination = entityHref(entityType, entityId);
  try {
    const locale = optionalLocale(formData.get("locale"));
    await attachAuthorizedMedia({
      entityType,
      entityId,
      mediaAssetId: Number(formData.get("mediaAssetId")),
      purpose: String(formData.get("purpose") ?? "") as MediaPurpose,
      position: Number(formData.get("position") ?? 0),
      ...(locale ? { locale } : {}),
    });
    revalidatePath(destination);
    destination += "?saved=1";
  } catch (error) {
    destination += `?error=${encodeURIComponent(mediaActionError(error))}`;
  }
  redirect(destination);
}

export async function detachMediaAction(
  entityType: MediaEntityType,
  entityId: number,
  attachmentId: number,
) {
  let destination = entityHref(entityType, entityId);
  try {
    await detachAuthorizedMedia(entityType, attachmentId);
    revalidatePath(destination);
    destination += "?saved=1";
  } catch (error) {
    destination += `?error=${encodeURIComponent(mediaActionError(error))}`;
  }
  redirect(destination);
}

function entityHref(entityType: MediaEntityType, entityId: number): string {
  return `/admin/${entityType === "city" ? "cities" : `${entityType}s`}/${entityId}`;
}

function optionalLocale(value: FormDataEntryValue | null) {
  return isLocale(value) ? value : undefined;
}

function mediaActionError(error: unknown): string {
  if (
    error instanceof MediaValidationError ||
    error instanceof MediaIntegrityError ||
    error instanceof MediaNotFoundError ||
    error instanceof AdminAuthorizationError
  ) {
    return error.message;
  }
  return "Media operation failed.";
}
