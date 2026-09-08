"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AdminAuthorizationError } from "@/lib/admin/authorization.server";
import {
  CmsContentIntegrityError,
  CmsContentNotFoundError,
} from "@/lib/admin/content/repository.server";
import { generateAuthorizedAudioCandidate } from "@/lib/admin/operations/audioGeneration.server";
import { makeAuthorizedPlaceAudioLive } from "@/lib/media/service.server";
import {
  MediaIntegrityError,
  MediaNotFoundError,
  MediaValidationError,
} from "@/lib/media/types";

export async function makeAudioLiveAction(
  placeId: number,
  locale: string,
) {
  let destination = "/admin/operations/audio";
  try {
    await makeAuthorizedPlaceAudioLive(placeId, locale);
    revalidatePath("/admin/operations/audio");
    revalidatePath("/api/media");
    destination += "?saved=1";
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}`;
  }
  redirect(destination);
}

export async function generateAudioDraftAction(
  placeId: number,
  locale: string,
) {
  let destination = "/admin/operations/audio";
  try {
    await generateAuthorizedAudioCandidate(placeId, locale);
    revalidatePath("/admin/operations/audio");
    destination += "?saved=1";
  } catch (error) {
    destination += `?error=${encodeURIComponent(actionError(error))}`;
  }
  redirect(destination);
}

function actionError(error: unknown): string {
  if (
    error instanceof CmsContentIntegrityError ||
    error instanceof CmsContentNotFoundError ||
    error instanceof MediaIntegrityError ||
    error instanceof MediaNotFoundError ||
    error instanceof MediaValidationError ||
    error instanceof AdminAuthorizationError
  ) {
    return error.message;
  }
  return "Audio operation failed.";
}
