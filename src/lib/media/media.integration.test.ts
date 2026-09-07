import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { closeDb, getDb } from "@/db/client";
import { citiesTable, mediaAssetsTable, placesTable } from "@/db/schema";
import {
  attachMedia,
  assertEntityMovePreservesMediaCity,
  cancelMediaUpload,
  createMediaUploadRecord,
  detachMedia,
  finalizeMediaAsset,
  getMediaAssetWithUsages,
  markMediaObjectDeleted,
  prepareMediaObjectDeletion,
  setMediaAssetDurationIfMissing,
  setMediaLifecycle,
} from "@/lib/media/repository.server";
import { getPublicMediaDeliveryAsset, getPublicMediaForEntity } from "@/lib/media/publicMedia.server";
import { FakeMediaObjectStore } from "@/lib/media/testing/fakeObjectStore";

const runIntegration = process.env.MEDIA_DB_INTEGRATION === "1";

describe.skipIf(!runIntegration)("CMS-03 PostgreSQL media integration", () => {
  const suffix = randomUUID().slice(0, 8);
  const actorId = `cms03-actor-${suffix}`;
  let cityId = 0;
  let placeId = 0;
  let draftPlaceId = 0;
  let otherCityId = 0;
  let otherCityPlaceId = 0;
  const assetIds: number[] = [];
  const store = new FakeMediaObjectStore();

  beforeAll(async () => {
    const db = getDb();
    const [city] = await db.insert(citiesTable).values({ slug: `cms03-integration-${suffix}`, name: "CMS-03 Integration", publicationStatus: "published", createdByUserId: actorId, updatedByUserId: actorId }).returning();
    cityId = city!.id;
    const [otherCity] = await db.insert(citiesTable).values({ slug: `cms03-other-${suffix}`, name: "CMS-03 Other", publicationStatus: "draft", createdByUserId: actorId, updatedByUserId: actorId }).returning();
    otherCityId = otherCity!.id;
    const [otherCityPlace] = await db.insert(placesTable).values({ cityId: otherCityId, slug: `cms03-other-place-${suffix}`, category: "see", latitude: 53.87, longitude: 10.69, durationMinutes: 10, environment: "outdoor", pricing: "free", tags: [], publicationStatus: "draft", createdByUserId: actorId, updatedByUserId: actorId }).returning();
    otherCityPlaceId = otherCityPlace!.id;
    const [place] = await db.insert(placesTable).values({ cityId, slug: `cms03-place-${suffix}`, category: "see", latitude: 53.86, longitude: 10.68, durationMinutes: 10, environment: "outdoor", pricing: "free", tags: [], publicationStatus: "published", createdByUserId: actorId, updatedByUserId: actorId }).returning();
    placeId = place!.id;
    const [draftPlace] = await db.insert(placesTable).values({ cityId, slug: `cms03-draft-place-${suffix}`, category: "see", latitude: 53.861, longitude: 10.681, durationMinutes: 10, environment: "outdoor", pricing: "free", tags: [], publicationStatus: "draft", createdByUserId: actorId, updatedByUserId: actorId }).returning();
    draftPlaceId = draftPlace!.id;
  });

  afterAll(async () => {
    const db = getDb();
    for (const id of assetIds) await db.delete(mediaAssetsTable).where(eq(mediaAssetsTable.id, id));
    if (draftPlaceId) await db.delete(placesTable).where(eq(placesTable.id, draftPlaceId));
    if (placeId) await db.delete(placesTable).where(eq(placesTable.id, placeId));
    if (otherCityPlaceId) await db.delete(placesTable).where(eq(placesTable.id, otherCityPlaceId));
    if (cityId) await db.delete(citiesTable).where(eq(citiesTable.id, cityId));
    if (otherCityId) await db.delete(citiesTable).where(eq(citiesTable.id, otherCityId));
    await closeDb();
  });

  it("creates, finalizes, approves, attaches and safely archives media", async () => {
    const asset = await createMediaUploadRecord({ assetKey: randomUUID(), cityId, kind: "image", originalFilename: "gate.jpg", mimeType: "image/jpeg", sizeBytes: 3, objectKey: `media/${suffix}/original.jpg`, storageProvider: "s3-test", uploadExpiresAt: new Date(Date.now() + 60_000) }, actorId);
    assetIds.push(asset.id);
    expect(asset.createdByUserId).toBe(actorId);
    await expect(attachMedia({ entityType: "place", entityId: placeId, mediaAssetId: asset.id, purpose: "hero" }, actorId, { allowPublicMutation: false })).rejects.toThrow(/Incomplete uploads/);
    const finalized = await finalizeMediaAsset(asset.id, { sizeBytes: 3, mimeType: "image/jpeg", checksumSha256: "sha256" }, actorId);
    expect(finalized.approvalStatus).toBe("pending_review");
    await expect(attachMedia({ entityType: "place", entityId: otherCityPlaceId, mediaAssetId: asset.id, purpose: "hero" }, actorId, { allowPublicMutation: true })).rejects.toThrow(/same city/);
    const attachment = await attachMedia({ entityType: "place", entityId: placeId, mediaAssetId: asset.id, purpose: "hero" }, actorId, { allowPublicMutation: false });
    expect(attachment.createdByUserId).toBe(actorId);
    expect((await getMediaAssetWithUsages(asset.id))?.usageCount).toBe(1);
    expect(await getPublicMediaForEntity("place", placeId)).toEqual([]);
    expect(await getPublicMediaDeliveryAsset(asset.assetKey)).toBeUndefined();
    await setMediaLifecycle(asset.id, "approved", actorId);
    expect((await getPublicMediaForEntity("place", placeId))[0]).toMatchObject({ kind: "image", purpose: "hero", url: `/api/media/${asset.assetKey}` });
    expect(await getPublicMediaDeliveryAsset(asset.assetKey)).toEqual({ objectKey: asset.objectKey, mimeType: "image/jpeg", sizeBytes: 3 });
    await expect(setMediaLifecycle(asset.id, "rejected", actorId)).rejects.toThrow(/Detach or replace/);
    await expect(setMediaLifecycle(asset.id, "archived", actorId)).rejects.toThrow(/Detach or replace/);
    const replacement = await createMediaUploadRecord({ assetKey: randomUUID(), cityId, kind: "image", originalFilename: "new-gate.jpg", mimeType: "image/jpeg", sizeBytes: 3, objectKey: `media/${suffix}/new-original.jpg`, storageProvider: "s3-test", uploadExpiresAt: new Date(Date.now() + 60_000) }, actorId);
    assetIds.push(replacement.id);
    await finalizeMediaAsset(replacement.id, { sizeBytes: 3, mimeType: "image/jpeg" }, actorId);
    await setMediaLifecycle(replacement.id, "approved", actorId);
    await expect(attachMedia({ entityType: "place", entityId: placeId, mediaAssetId: replacement.id, purpose: "hero" }, actorId, { allowPublicMutation: false })).rejects.toThrow(/Publishing permission/);
    const replaced = await attachMedia({ entityType: "place", entityId: placeId, mediaAssetId: replacement.id, purpose: "hero" }, actorId, { allowPublicMutation: true });
    expect(replaced.id).toBe(attachment.id);
    expect((await getMediaAssetWithUsages(asset.id))?.usageCount).toBe(0);
    await expect(setMediaLifecycle(asset.id, "archived", actorId)).resolves.toMatchObject({ approvalStatus: "archived" });
    expect(await getPublicMediaDeliveryAsset(asset.assetKey)).toBeUndefined();
    const deletion = await prepareMediaObjectDeletion(asset.id);
    await store.deleteObject(deletion.objectKey);
    await expect(markMediaObjectDeleted(asset.id, deletion.objectKey, actorId)).resolves.toMatchObject({ objectKey: null });
    await expect(detachMedia("place", replaced.id, { allowPublicMutation: false })).rejects.toThrow(/Publishing permission/);
    await detachMedia("place", replaced.id, { allowPublicMutation: true });
    await setMediaLifecycle(replacement.id, "archived", actorId);
  });

  it("retires an incomplete upload atomically without weakening lifecycle rules", async () => {
    const asset = await createMediaUploadRecord({
      assetKey: randomUUID(),
      cityId,
      kind: "image",
      originalFilename: "interrupted.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 3,
      objectKey: `media/${suffix}/interrupted.jpg`,
      storageProvider: "s3-test",
      uploadExpiresAt: new Date(Date.now() + 60_000),
    }, actorId);
    assetIds.push(asset.id);

    await expect(cancelMediaUpload(asset.id, actorId)).resolves.toMatchObject({
      approvalStatus: "archived",
      objectKey: asset.objectKey,
      uploadExpiresAt: null,
    });
    await expect(cancelMediaUpload(asset.id, actorId)).rejects.toThrow(
      /Only incomplete uploads/,
    );
    await expect(
      setMediaLifecycle(asset.id, "approved", actorId),
    ).rejects.toThrow(/Archived assets cannot be reviewed/);
  });

  it("keeps audio exact-locale and approved-only", async () => {
    const asset = await createMediaUploadRecord({ assetKey: randomUUID(), cityId, kind: "audio", originalFilename: "story-en.mp3", mimeType: "audio/mpeg", sizeBytes: 3, locale: "en", objectKey: `media/${suffix}/story-en.mp3`, storageProvider: "s3-test", uploadExpiresAt: new Date(Date.now() + 60_000) }, actorId);
    assetIds.push(asset.id);
    const finalized = await finalizeMediaAsset(asset.id, { sizeBytes: 3, mimeType: "audio/mpeg" }, actorId);
    expect(finalized.durationSeconds).toBeNull();
    await expect(setMediaAssetDurationIfMissing(asset.id, 87)).resolves.toBe(true);
    await expect(setMediaAssetDurationIfMissing(asset.id, 99)).resolves.toBe(false);
    await expect(attachMedia({ entityType: "place", entityId: placeId, mediaAssetId: asset.id, purpose: "audio", locale: "ar" }, actorId, { allowPublicMutation: false })).rejects.toThrow(/exact locale/);
    const attachment = await attachMedia({ entityType: "place", entityId: placeId, mediaAssetId: asset.id, purpose: "audio", locale: "en" }, actorId, { allowPublicMutation: false });
    await expect(getDb().transaction((tx) => assertEntityMovePreservesMediaCity(tx, "place", placeId, otherCityId))).rejects.toThrow(/Detach city-scoped media/);
    expect(await getPublicMediaForEntity("place", placeId)).toEqual([]);
    await setMediaLifecycle(asset.id, "approved", actorId);
    const media = await getPublicMediaForEntity("place", placeId);
    expect(media).toHaveLength(1);
    expect(media[0]?.locale).toBe("en");
    expect(media[0]?.durationSeconds).toBe(87);
    expect(media.some(({ locale }) => locale === "ar")).toBe(false);
    await expect(setMediaLifecycle(asset.id, "rejected", actorId)).rejects.toThrow(/Detach or replace/);
    await expect(detachMedia("place", attachment.id, { allowPublicMutation: false })).rejects.toThrow(/Publishing permission/);
    await detachMedia("place", attachment.id, { allowPublicMutation: true });
    expect(await getPublicMediaDeliveryAsset(asset.assetKey)).toBeUndefined();
    await setMediaLifecycle(asset.id, "rejected", actorId);
    expect(await getPublicMediaDeliveryAsset(asset.assetKey)).toBeUndefined();
    expect(await getPublicMediaForEntity("place", placeId)).toEqual([]);
    await setMediaLifecycle(asset.id, "approved", actorId);
    const draftAttachment = await attachMedia({ entityType: "place", entityId: draftPlaceId, mediaAssetId: asset.id, purpose: "audio", locale: "en" }, actorId, { allowPublicMutation: false });
    expect(await getPublicMediaForEntity("place", draftPlaceId)).toEqual([]);
    expect(await getPublicMediaDeliveryAsset(asset.assetKey)).toBeUndefined();
    await detachMedia("place", draftAttachment.id, { allowPublicMutation: false });
    await setMediaLifecycle(asset.id, "archived", actorId);
    expect(await getPublicMediaForEntity("place", placeId)).toEqual([]);
    expect(await getPublicMediaDeliveryAsset(asset.assetKey)).toBeUndefined();
  });

  it("exposes city media only through an approved published attachment", async () => {
    const asset = await createMediaUploadRecord({ assetKey: randomUUID(), cityId, kind: "image", originalFilename: "city-card.jpg", mimeType: "image/jpeg", sizeBytes: 3, objectKey: `media/${suffix}/city-card.jpg`, storageProvider: "s3-test", uploadExpiresAt: new Date(Date.now() + 60_000) }, actorId);
    assetIds.push(asset.id);
    await finalizeMediaAsset(asset.id, { sizeBytes: 3, mimeType: "image/jpeg" }, actorId);
    const attachment = await attachMedia({ entityType: "city", entityId: cityId, mediaAssetId: asset.id, purpose: "card" }, actorId, { allowPublicMutation: false });

    expect(await getPublicMediaForEntity("city", cityId)).toEqual([]);
    expect(await getPublicMediaDeliveryAsset(asset.assetKey)).toBeUndefined();
    await setMediaLifecycle(asset.id, "rejected", actorId);
    expect(await getPublicMediaForEntity("city", cityId)).toEqual([]);
    expect(await getPublicMediaDeliveryAsset(asset.assetKey)).toBeUndefined();

    await setMediaLifecycle(asset.id, "approved", actorId);
    expect(await getPublicMediaForEntity("city", cityId)).toEqual([
      expect.objectContaining({ purpose: "card", url: `/api/media/${asset.assetKey}` }),
    ]);
    expect(await getPublicMediaDeliveryAsset(asset.assetKey)).toBeDefined();

    await detachMedia("city", attachment.id, { allowPublicMutation: true });
    expect(await getPublicMediaDeliveryAsset(asset.assetKey)).toBeUndefined();
    await setMediaLifecycle(asset.id, "archived", actorId);
    expect(await getPublicMediaDeliveryAsset(asset.assetKey)).toBeUndefined();

    const draftCityAsset = await createMediaUploadRecord({ assetKey: randomUUID(), cityId: otherCityId, kind: "image", originalFilename: "draft-city-hero.jpg", mimeType: "image/jpeg", sizeBytes: 3, objectKey: `media/${suffix}/draft-city-hero.jpg`, storageProvider: "s3-test", uploadExpiresAt: new Date(Date.now() + 60_000) }, actorId);
    assetIds.push(draftCityAsset.id);
    await finalizeMediaAsset(draftCityAsset.id, { sizeBytes: 3, mimeType: "image/jpeg" }, actorId);
    await setMediaLifecycle(draftCityAsset.id, "approved", actorId);
    const draftAttachment = await attachMedia({ entityType: "city", entityId: otherCityId, mediaAssetId: draftCityAsset.id, purpose: "hero" }, actorId, { allowPublicMutation: false });
    expect(await getPublicMediaForEntity("city", otherCityId)).toEqual([]);
    expect(await getPublicMediaDeliveryAsset(draftCityAsset.assetKey)).toBeUndefined();
    await detachMedia("city", draftAttachment.id, { allowPublicMutation: false });
    await setMediaLifecycle(draftCityAsset.id, "archived", actorId);
  });
});
