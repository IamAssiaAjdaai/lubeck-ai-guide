// @vitest-environment node
import { afterAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
vi.mock("server-only", () => ({}));
import { closeDb, getDb } from "@/db/client";
import { citiesTable, placesTable, toursTable } from "@/db/schema";
import { listPublishingCandidates } from "./publishingQueue.server";

const enabled = process.env.CMS_DB_INTEGRATION === "1" || process.env.PUBLISHING_QUEUE_DB_INTEGRATION === "1";
describe.runIf(enabled)("publishing queue PostgreSQL isolation and lifecycle", () => {
  afterAll(async () => { await closeDb(); });
  it("isolates cities and entity types, excludes published/archived work and reflects transitions", async () => {
    const target = new URL(process.env.DATABASE_URL ?? "");
    if (!["127.0.0.1", "localhost"].includes(target.hostname)) {
      throw new Error("Publishing integration requires an explicitly selected loopback database.");
    }
    const db = getDb();
    const suffix = `${Date.now()}`;
    const cities = await db.insert(citiesTable).values([
      { slug: `queue-city-${suffix}`, name: "Queue city", publicationStatus: "draft" },
      { slug: `other-queue-city-${suffix}`, name: "Other city", publicationStatus: "draft" },
    ]).returning();
    const cityId = cities[0]!.id;
    const otherId = cities[1]!.id;
    try {
      const states = ["draft", "in_review", "approved", "published", "archived"] as const;
      const places = await db.insert(placesTable).values(states.map((publicationStatus, i) => ({
        cityId, slug: `place-${i}-${suffix}`, publicationStatus, category: "see" as const,
        latitude: 53.86, longitude: 10.68, durationMinutes: 10,
        environment: "outdoor" as const, pricing: "free" as const, tags: [],
      }))).returning();
      await db.insert(toursTable).values([
        ...states.map((publicationStatus, i) => ({ cityId, slug: `tour-${i}-${suffix}`, publicationStatus })),
        { cityId: otherId, slug: `other-tour-${suffix}`, publicationStatus: "in_review" },
      ]);
      const scoped = await listPublishingCandidates({ cityIds: [cityId], entities: ["city", "place", "tour"] });
      expect(scoped).toHaveLength(7);
      expect(scoped.every(item => item.cityId === cityId)).toBe(true);
      expect(new Set(scoped.map(item => item.publicationStatus))).toEqual(new Set(["draft", "in_review", "approved"]));
      expect(scoped[0]!.updatedAt).toBeInstanceOf(Date);
      const onlyTours = await listPublishingCandidates({ cityIds: [cityId], entities: ["tour"] });
      expect(onlyTours).toHaveLength(3);
      expect(onlyTours.every(item => item.entity === "tour")).toBe(true);
      expect(await listPublishingCandidates({ cityIds: [], entities: ["city", "place", "tour"] })).toEqual([]);
      const reviewPlace = places.find(place => place.publicationStatus === "in_review")!;
      await db.update(placesTable).set({ publicationStatus: "published" }).where(eq(placesTable.id, reviewPlace.id));
      const afterPublish = await listPublishingCandidates({ cityIds: [cityId], entities: ["place"] });
      expect(afterPublish.map(item => item.id)).not.toContain(reviewPlace.id);
      await db.update(placesTable).set({ publicationStatus: "draft" }).where(eq(placesTable.id, reviewPlace.id));
      expect((await listPublishingCandidates({ cityIds: [cityId], entities: ["place"] })).map(item => item.id)).toContain(reviewPlace.id);
    } finally {
      await db.delete(toursTable).where(inArray(toursTable.cityId, [cityId, otherId]));
      await db.delete(citiesTable).where(inArray(citiesTable.id, [cityId, otherId]));
    }
  });
});
