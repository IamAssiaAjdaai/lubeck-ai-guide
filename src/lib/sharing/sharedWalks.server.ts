import "server-only";
import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sharedWalkLinks } from "@/db/travelerSchema";
import { getPublicCitySnapshot } from "@/lib/content/publicRepository.server";
import { isEligibleTourPlace } from "@citywalk/traveler-core";
import { toPublicWalk } from "./publicWalk";

export class SharedWalkError extends Error {
  constructor(readonly status: number) { super("Shared walk unavailable."); }
}
export async function createSharedWalk(ownerId: string, input: unknown) {
  const publicWalk = toPublicWalk(input);
  if (!publicWalk) throw new SharedWalkError(400);
  const snapshot = await getPublicCitySnapshot(publicWalk.route.citySlug).catch(() => {
    throw new SharedWalkError(400);
  });
  if (publicWalk.route.stopSlugs.some(slug => !snapshot.places.some(place => place.slug === slug && isEligibleTourPlace(place)))) {
    throw new SharedWalkError(400);
  }
  const [record] = await getDb().insert(sharedWalkLinks).values({
    ownerId, citySlug: publicWalk.route.citySlug, route: publicWalk.route,
  }).returning({ id: sharedWalkLinks.id });
  if (!record) throw new SharedWalkError(503);
  return { id: record.id };
}
export async function getSharedWalk(id: string) {
  const [record] = await getDb().select({
    route: sharedWalkLinks.route,
  }).from(sharedWalkLinks).where(and(eq(sharedWalkLinks.id, id), isNull(sharedWalkLinks.revokedAt))).limit(1);
  if (!record) throw new SharedWalkError(404);
  const result = toPublicWalk(record.route);
  if (!result) throw new SharedWalkError(404);
  return result;
}
