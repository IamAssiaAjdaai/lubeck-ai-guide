import "server-only";
import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { accountSavedJourney, parseSavedRoute, savedRouteIdentity, isEligibleTourPlace, type SavedRoute, type AccountSavedWalk } from "@citywalk/traveler-core";
import { getDb } from "@/db/client";
import { user } from "@/db/authSchema";
import { accountSavedWalks } from "@/db/travelerSchema";
import { PublicContentNotFoundError } from "@/lib/content/errors";
import { getPublicCitySnapshot } from "@/lib/content/publicRepository.server";

export class SavedWalkError extends Error {
  constructor(readonly status: number) { super("Saved walk request unavailable."); }
}
type Row = typeof accountSavedWalks.$inferSelect;
const dto = (r: Row): AccountSavedWalk => ({ id: r.id, route: r.route, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() });
export async function listAccountWalks(userId: string) {
  return (await getDb().select().from(accountSavedWalks).where(eq(accountSavedWalks.userId, userId)).orderBy(desc(accountSavedWalks.updatedAt))).map(dto);
}
export async function saveAccountWalk(userId: string, value: unknown, id?: string) {
  const route = parseSavedRoute(value);
  if (!route) throw new SavedWalkError(400);
  const snapshot = await getPublicCitySnapshot(route.citySlug).catch(error => {
    if (error instanceof PublicContentNotFoundError) throw new SavedWalkError(400);
    throw error;
  });
  if (route.stopSlugs.some(slug => !snapshot.places.some(p => p.slug === slug && isEligibleTourPlace(p)))) throw new SavedWalkError(400);
  return writeAccountWalk(userId, route, id);
}
// Transaction and per-user lock cover creates, explicit updates, collisions and retries.
async function writeAccountWalk(userId: string, route: SavedRoute, id?: string) {
  const fingerprint = createHash("sha256").update(savedRouteIdentity(accountSavedJourney({ id: "identity", route, createdAt: "", updatedAt: "" }))).digest("hex");
  return getDb().transaction(async tx => {
    await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for("update");
    const rows = await tx.select().from(accountSavedWalks).where(eq(accountSavedWalks.userId, userId));
    const target = id ? rows.find(r => r.id === id) : undefined;
    if (id && !target) throw new SavedWalkError(404);
    const duplicate = rows.find(r => r.fingerprint === fingerprint);
    if (duplicate && target && duplicate.id !== target.id) throw new SavedWalkError(409);
    if (duplicate) return dto(duplicate);
    if (target) {
      const [updated] = await tx.update(accountSavedWalks).set({ route, citySlug: route.citySlug, fingerprint, updatedAt: new Date() })
        .where(and(eq(accountSavedWalks.userId, userId), eq(accountSavedWalks.id, target.id))).returning();
      return dto(updated);
    }
    const [created] = await tx.insert(accountSavedWalks).values({ userId, citySlug: route.citySlug, fingerprint, route }).returning();
    return dto(created);
  });
}
export async function removeAccountWalk(userId: string, id: string) {
  return getDb().transaction(async tx => {
    await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for("update");
    const removed = await tx.delete(accountSavedWalks).where(and(eq(accountSavedWalks.userId, userId), eq(accountSavedWalks.id, id))).returning({ id: accountSavedWalks.id });
    if (!removed.length) throw new SavedWalkError(404);
  });
}
