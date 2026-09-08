import "server-only";

import { and, asc, eq, inArray, ne } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  audioGenerationMetadataTable,
  mediaAssetsTable,
  placeLocalizationsTable,
  placeMediaTable,
  placeRevisionsTable,
  placesTable,
} from "@/db/schema";
import { MediaIntegrityError } from "@/lib/media/types";

export async function listOperationsPlaces(cityIds: readonly number[]) {
  if (cityIds.length === 0) return [];
  const db = getDb();
  const [places, localizations, revisions, audioRows] = await Promise.all([
    db
      .select()
      .from(placesTable)
      .where(
        and(
          inArray(placesTable.cityId, [...cityIds]),
          ne(placesTable.publicationStatus, "archived"),
        ),
      )
      .orderBy(asc(placesTable.slug)),
    db
      .select()
      .from(placeLocalizationsTable)
      .innerJoin(placesTable, eq(placeLocalizationsTable.placeId, placesTable.id))
      .where(inArray(placesTable.cityId, [...cityIds])),
    db
      .select()
      .from(placeRevisionsTable)
      .innerJoin(placesTable, eq(placeRevisionsTable.placeId, placesTable.id))
      .where(
        and(
          inArray(placesTable.cityId, [...cityIds]),
          eq(placeRevisionsTable.isCurrent, true),
        ),
      ),
    db
      .select({
        attachment: placeMediaTable,
        asset: mediaAssetsTable,
        generation: audioGenerationMetadataTable,
      })
      .from(placeMediaTable)
      .innerJoin(
        mediaAssetsTable,
        eq(placeMediaTable.mediaAssetId, mediaAssetsTable.id),
      )
      .innerJoin(placesTable, eq(placeMediaTable.placeId, placesTable.id))
      .leftJoin(
        audioGenerationMetadataTable,
        eq(audioGenerationMetadataTable.mediaAssetId, mediaAssetsTable.id),
      )
      .where(
        and(
          inArray(placesTable.cityId, [...cityIds]),
          eq(placeMediaTable.purpose, "audio"),
          ne(mediaAssetsTable.approvalStatus, "archived"),
        ),
      )
      .orderBy(
        asc(placeMediaTable.placeId),
        asc(placeMediaTable.locale),
        asc(placeMediaTable.position),
      ),
  ]);

  return places.map((place) => ({
    ...place,
    localizations: localizations
      .filter(({ place_localizations }) => place_localizations.placeId === place.id)
      .map(({ place_localizations }) => place_localizations),
    publishedRevision: revisions.find(
      ({ place_revisions }) => place_revisions.placeId === place.id,
    )?.place_revisions,
    audio: audioRows.filter(
      ({ attachment }) => attachment.placeId === place.id,
    ),
  }));
}

export async function saveAudioGenerationMetadata(input: Readonly<{
  mediaAssetId: number;
  provider: string;
  voiceId?: string;
  sourceLocale: string;
  sourceTextHash: string;
}>) {
  const [metadata] = await getDb()
    .insert(audioGenerationMetadataTable)
    .values({
      mediaAssetId: input.mediaAssetId,
      provider: input.provider,
      voiceId: input.voiceId,
      sourceLocale: input.sourceLocale,
      sourceField: "story",
      sourceTextHash: input.sourceTextHash,
    })
    .onConflictDoNothing({
      target: audioGenerationMetadataTable.mediaAssetId,
    })
    .returning();
  if (!metadata) {
    throw new MediaIntegrityError("Audio generation provenance could not be recorded.");
  }
  return metadata;
}
