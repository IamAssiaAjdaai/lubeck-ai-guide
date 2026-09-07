import "server-only";

import {
  extractAudioDurationSeconds,
  type AudioDurationExtractor,
} from "@/lib/media/audioMetadata.server";
import {
  listMediaAssetsForAudioDurationBackfill,
  setMediaAssetDurationIfMissing,
  type AudioDurationBackfillAsset,
} from "@/lib/media/repository.server";
import { getMediaObjectStore } from "@/lib/media/storage/storage.server";
import type { MediaObjectStore } from "@/lib/media/storage/types";

export type AudioDurationBackfillResult = Readonly<{
  scanned: number;
  updated: number;
  skipped: number;
  failed: number;
}>;

type AudioDurationBackfillDependencies = Readonly<{
  listAssets: () => Promise<readonly AudioDurationBackfillAsset[]>;
  updateDuration: (assetId: number, durationSeconds: number) => Promise<boolean>;
  store: MediaObjectStore;
  extractDuration: AudioDurationExtractor;
}>;

export async function backfillAudioDurations(
  dependencies: AudioDurationBackfillDependencies = {
    listAssets: listMediaAssetsForAudioDurationBackfill,
    updateDuration: setMediaAssetDurationIfMissing,
    store: getMediaObjectStore(),
    extractDuration: extractAudioDurationSeconds,
  },
): Promise<AudioDurationBackfillResult> {
  const assets = await dependencies.listAssets();
  const result = { scanned: assets.length, updated: 0, skipped: 0, failed: 0 };

  for (const asset of assets) {
    if (!isEligibleAsset(asset)) {
      result.skipped += 1;
      continue;
    }

    try {
      const object = await dependencies.store.headObject(asset.objectKey);
      if (!object || object.sizeBytes <= 0) {
        result.skipped += 1;
        continue;
      }

      const durationSeconds = await dependencies.extractDuration({
        store: dependencies.store,
        objectKey: asset.objectKey,
        mimeType: asset.mimeType,
        sizeBytes: object.sizeBytes,
      });
      if (!isReliableDuration(durationSeconds)) {
        result.failed += 1;
        continue;
      }

      if (await dependencies.updateDuration(asset.id, durationSeconds)) {
        result.updated += 1;
      } else {
        result.skipped += 1;
      }
    } catch {
      result.failed += 1;
    }
  }

  return result;
}

function isEligibleAsset(
  asset: AudioDurationBackfillAsset,
): asset is AudioDurationBackfillAsset & { objectKey: string } {
  return (
    asset.kind === "audio" &&
    asset.sourceType === "upload" &&
    asset.durationSeconds === null &&
    asset.objectKey !== null
  );
}

function isReliableDuration(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}
