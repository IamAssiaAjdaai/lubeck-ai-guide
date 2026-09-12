import "server-only";

import { eq, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  mediaAssetRightsTable,
  mediaAssetsTable,
  type MediaAssetRightsRow,
} from "@/db/schema";
import {
  assertMediaRightsCanBeVerified,
  isMediaRightsCleared,
  type MediaRightsInput,
} from "@/lib/media/rights";
import { MediaNotFoundError } from "@/lib/media/types";

type MediaRightsTransaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

export async function getMediaAssetRights(
  mediaAssetId: number,
): Promise<MediaAssetRightsRow | undefined> {
  const [rights] = await getDb()
    .select()
    .from(mediaAssetRightsTable)
    .where(eq(mediaAssetRightsTable.mediaAssetId, mediaAssetId))
    .limit(1);
  return rights;
}

export async function saveMediaAssetRights(
  mediaAssetId: number,
  input: MediaRightsInput,
  actorId: string,
) {
  return getDb().transaction(async (tx) => {
    await lockMediaAsset(tx, mediaAssetId);
    const [existing] = await tx
      .select()
      .from(mediaAssetRightsTable)
      .where(eq(mediaAssetRightsTable.mediaAssetId, mediaAssetId))
      .for("update")
      .limit(1);
    const materialChanged = !existing || MATERIAL_FIELDS.some(
      (field) => normalized(existing[field]) !== normalized(input[field]),
    );
    const values = {
      rightsBasis: input.rightsBasis,
      creator: input.creator ?? null,
      rightsHolder: input.rightsHolder ?? null,
      attributionRequired: input.attributionRequired,
      attributionText: input.attributionText ?? null,
      evidenceReference: input.evidenceReference ?? null,
      rightsNotes: input.rightsNotes ?? null,
      updatedByUserId: actorId,
      updatedAt: new Date(),
      ...(materialChanged
        ? { verifiedAt: null, verifiedByUserId: null }
        : {}),
    };
    const [saved] = await tx
      .insert(mediaAssetRightsTable)
      .values({
        mediaAssetId,
        ...values,
        createdByUserId: actorId,
      })
      .onConflictDoUpdate({
        target: mediaAssetRightsTable.mediaAssetId,
        set: values,
      })
      .returning();
    if (!saved) throw new MediaNotFoundError("Media rights");
    return saved;
  });
}

export async function verifyMediaAssetRights(
  mediaAssetId: number,
  reviewerUserId: string,
  verifiedAt = new Date(),
) {
  return getDb().transaction(async (tx) => {
    await lockMediaAsset(tx, mediaAssetId);
    const [rights] = await tx
      .select()
      .from(mediaAssetRightsTable)
      .where(eq(mediaAssetRightsTable.mediaAssetId, mediaAssetId))
      .for("update")
      .limit(1);
    if (!rights) throw new MediaNotFoundError("Media rights");
    assertMediaRightsCanBeVerified(rights);
    const [verified] = await tx
      .update(mediaAssetRightsTable)
      .set({
        verifiedAt,
        verifiedByUserId: reviewerUserId,
        updatedByUserId: reviewerUserId,
        updatedAt: new Date(),
      })
      .where(eq(mediaAssetRightsTable.mediaAssetId, mediaAssetId))
      .returning();
    if (!verified) throw new MediaNotFoundError("Media rights");
    return verified;
  });
}

export async function deleteMediaAssetRights(
  mediaAssetId: number,
): Promise<boolean> {
  const deleted = await getDb().transaction(async (tx) => {
    await lockMediaAsset(tx, mediaAssetId);
    return tx
      .delete(mediaAssetRightsTable)
      .where(eq(mediaAssetRightsTable.mediaAssetId, mediaAssetId))
      .returning({ mediaAssetId: mediaAssetRightsTable.mediaAssetId });
  });
  return deleted.length > 0;
}

export async function getRightsClearedAssetKeys(
  assetKeys: readonly string[],
): Promise<ReadonlySet<string>> {
  if (assetKeys.length === 0) return new Set();
  const rows = await getDb()
    .select({ assetKey: mediaAssetsTable.assetKey, rights: mediaAssetRightsTable })
    .from(mediaAssetsTable)
    .innerJoin(
      mediaAssetRightsTable,
      eq(mediaAssetRightsTable.mediaAssetId, mediaAssetsTable.id),
    )
    .where(inArray(mediaAssetsTable.assetKey, [...assetKeys]));
  return new Set(
    rows.filter(({ rights }) => isMediaRightsCleared(rights))
      .map(({ assetKey }) => assetKey),
  );
}

const MATERIAL_FIELDS = [
  "rightsBasis",
  "creator",
  "rightsHolder",
  "attributionRequired",
  "attributionText",
  "evidenceReference",
  "rightsNotes",
] as const satisfies readonly (keyof MediaRightsInput)[];

function normalized(value: unknown): unknown {
  return value === null ? undefined : value;
}

async function lockMediaAsset(
  tx: MediaRightsTransaction,
  mediaAssetId: number,
): Promise<void> {
  const [asset] = await tx
    .select({ id: mediaAssetsTable.id })
    .from(mediaAssetsTable)
    .where(eq(mediaAssetsTable.id, mediaAssetId))
    .for("update")
    .limit(1);
  if (!asset) throw new MediaNotFoundError();
}
