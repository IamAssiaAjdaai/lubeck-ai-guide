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
  const eligible = new Map(
    snapshot.places.filter(isEligibleTourPlace).map(place => [place.slug, place] as const),
  );
  const firstStop = eligible.get(publicWalk.route.stopSlugs[0]);
  if (!firstStop || publicWalk.route.stopSlugs.some(slug => !eligible.has(slug))) {
    throw new SharedWalkError(400);
  }

  // The server must enforce the privacy boundary even for crafted requests.
  // A shared itinerary starts at its first published stop, not at the author's
  // home, live location or an arbitrary private GPS coordinate.
  const sourceFinish = publicWalk.route.finish;
  const matchedFinish = sourceFinish && [...eligible.values()].find(place =>
    place.coordinates.lat === sourceFinish.lat &&
    place.coordinates.lng === sourceFinish.lng,
  );
  const safeFinish = matchedFinish ? {
    lat: matchedFinish.coordinates.lat,
    lng: matchedFinish.coordinates.lng,
  } : undefined;
  const route = {
    citySlug: publicWalk.route.citySlug,
    stopSlugs: [...publicWalk.route.stopSlugs],
    settings: {
      minutes: publicWalk.route.settings.minutes,
      start: { lat: firstStop.coordinates.lat, lng: firstStop.coordinates.lng },
      interests: [...publicWalk.route.settings.interests],
      walking: publicWalk.route.settings.walking,
      ...(publicWalk.route.settings.categories
        ? { categories: [...publicWalk.route.settings.categories] } : {}),
      ...(safeFinish ? { finish: safeFinish } : {}),
    },
    ...(safeFinish ? { finish: safeFinish } : {}),
  };

  const [record] = await getDb().insert(sharedWalkLinks).values({
    ownerId, citySlug: route.citySlug, route,
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
