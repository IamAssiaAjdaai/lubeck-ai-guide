import "server-only";

import { createHash, randomUUID } from "node:crypto";

import {
  requireAdminCapability,
  requireCityCapability,
} from "@/lib/admin/authorization.server";
import {
  CmsContentIntegrityError,
  CmsContentNotFoundError,
  getCmsPlace,
} from "@/lib/admin/content/repository.server";
import {
  exactLocaleStory,
  hashNarrationSource,
} from "@/lib/admin/operations/audioOperations";
import { saveAudioGenerationMetadata } from "@/lib/admin/operations/repository.server";
import {
  getConfiguredTtsProvider,
  type TtsProvider,
} from "@/lib/admin/operations/ttsProvider.server";
import { isLocale, type Locale } from "@/lib/i18n";
import { validateUploadedObject, validateUploadIntent } from "@/lib/media/policy";
import {
  attachMedia,
  createMediaUploadRecord,
  finalizeMediaAsset,
  setMediaLifecycle,
} from "@/lib/media/repository.server";
import { getMediaObjectStore } from "@/lib/media/storage/storage.server";
import type { MediaObjectStore } from "@/lib/media/storage/types";
import { MediaIntegrityError } from "@/lib/media/types";

export async function generateAuthorizedAudioCandidate(
  placeId: number,
  rawLocale: unknown,
  voiceId?: string,
  provider: TtsProvider | undefined = getConfiguredTtsProvider(),
  store?: MediaObjectStore,
) {
  await requireAdminCapability("translations:manage");
  if (!isLocale(rawLocale)) {
    throw new CmsContentIntegrityError("Audio language is not supported.");
  }
  const place = await getCmsPlace(placeId);
  if (!place) throw new CmsContentNotFoundError("Place");
  const context = await requireCityCapability(place.cityId, "media:manage");
  if (!provider) {
    throw new CmsContentIntegrityError("Audio generation is not configured.");
  }
  const objectStore = store ?? getMediaObjectStore();
  const story = exactLocaleStory(place.localizations, rawLocale);
  if (!story) {
    throw new CmsContentIntegrityError(
      "Add a story in this language before generating audio.",
    );
  }

  return generateAudioCandidate({
    place: { id: place.id, cityId: place.cityId, slug: place.slug },
    locale: rawLocale,
    story,
    voiceId,
    actorId: context.user.id,
    provider,
    store: objectStore,
  });
}

export async function generateAudioCandidate(input: Readonly<{
  place: Readonly<{ id: number; cityId: number; slug: string }>;
  locale: Locale;
  story: string;
  voiceId?: string;
  actorId: string;
  provider: TtsProvider;
  store: MediaObjectStore;
}>) {
  const generated = await input.provider.generate({
    text: input.story,
    locale: input.locale,
    voiceId: input.voiceId,
  });
  const validated = validateUploadIntent({
    cityId: input.place.cityId,
    kind: "audio",
    originalFilename: generated.filename,
    mimeType: generated.mimeType,
    sizeBytes: generated.bytes.byteLength,
    locale: input.locale,
  });
  validateUploadedObject(validated, {
    sizeBytes: generated.bytes.byteLength,
    mimeType: generated.mimeType,
    initialBytes: generated.bytes.slice(0, 64),
  });

  const assetKey = randomUUID();
  const objectKey = `media/${assetKey}/original.mp3`;
  const asset = await createMediaUploadRecord(
    {
      ...validated,
      assetKey,
      objectKey,
      storageProvider: input.store.providerId,
      uploadExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
    input.actorId,
  );
  let objectWritten = false;
  try {
    await input.store.writeObject(
      objectKey,
      generated.bytes,
      generated.mimeType,
    );
    objectWritten = true;
    const finalized = await finalizeMediaAsset(
      asset.id,
      {
        sizeBytes: generated.bytes.byteLength,
        mimeType: generated.mimeType,
        checksumSha256: createHash("sha256")
          .update(generated.bytes)
          .digest("hex"),
        ...(isPositiveDuration(generated.durationSeconds)
          ? { durationSeconds: generated.durationSeconds }
          : {}),
      },
      input.actorId,
    );
    await saveAudioGenerationMetadata({
      mediaAssetId: finalized.id,
      provider: input.provider.id,
      voiceId: input.voiceId,
      sourceLocale: input.locale,
      sourceTextHash: hashNarrationSource(input.story),
    });
    const attachment = await attachMedia(
      {
        entityType: "place",
        entityId: input.place.id,
        mediaAssetId: finalized.id,
        purpose: "audio",
        position: 1,
        locale: input.locale,
      },
      input.actorId,
      { allowPublicMutation: false },
    );
    return { asset: finalized, attachment };
  } catch (error) {
    await setMediaLifecycle(asset.id, "archived", input.actorId).catch(
      () => undefined,
    );
    if (objectWritten) {
      await input.store.deleteObject(objectKey).catch(() => undefined);
    }
    throw error instanceof Error
      ? error
      : new MediaIntegrityError("Generated audio could not be saved.");
  }
}

function isPositiveDuration(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}
