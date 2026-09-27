import { accountSavedJourney, parseSavedRoute, savedRouteFromJourney, savedRouteIdentity, type AccountSavedWalk } from "@citywalk/traveler-core";
import type { WalkJourney } from "@citywalk/traveler-core/walkJourney";
import { citywalkApi } from "./api/instance";
import { nativeAuthClient } from "./auth/client";
import { saveCurrentAccountWalk, type SavedWalk } from "./walkStorage";
import type { PublicPlaceCard } from "./api/contracts";
export type AccountLink = { accountSavedWalkId?: string; accountSavedUserId?: string };
const listeners = new Set<(userId: string) => void>();
export const subscribeAccountWalks = (listener: (userId: string) => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const notify = (userId: string) => listeners.forEach(listener => listener(userId));
async function request(userId: string, method = "GET", body?: unknown) {
  const response = await citywalkApi.fetchAuthenticated("/api/account/saved-walks", {
    method, headers: { "Content-Type": "application/json", "X-Citywalk-Account": userId },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(response.status === 401 ? "account-required" : "account-save-unavailable");
  return response.json();
}
function parseRecord(value: unknown): AccountSavedWalk {
  if (!value || typeof value !== "object") throw new Error("account-save-unavailable");
  const r = value as AccountSavedWalk, route = parseSavedRoute(r.route);
  if (!route || typeof r.id !== "string" || typeof r.createdAt !== "string" || typeof r.updatedAt !== "string") throw new Error("account-save-unavailable");
  return { id: r.id, route, createdAt: r.createdAt, updatedAt: r.updatedAt };
}
export async function listAccountWalks(userId: string): Promise<SavedWalk[]> {
  const result = await request(userId);
  if (!Array.isArray(result.walks)) throw new Error("account-save-unavailable");
  return result.walks.map((r: unknown) => accountSavedJourney(parseRecord(r)));
}
export function accountWalkState(journey: WalkJourney, walks: readonly WalkJourney[], userId: string) {
  const linked = journey as WalkJourney & AccountLink;
  const record = (linked.accountSavedUserId === userId ? walks.find(w => w.id === linked.accountSavedWalkId) : undefined)
    ?? walks.find(w => savedRouteIdentity(w) === savedRouteIdentity(journey));
  return { record, status: !record ? "unsaved" : savedRouteIdentity(record) === savedRouteIdentity(journey) ? "saved" : "changed" } as const;
}
export async function saveAccountWalk(journey: WalkJourney, places: readonly PublicPlaceCard[], ready: boolean, userId: string) {
  const session = await nativeAuthClient.getSession();
  if (session.data?.user.id !== userId) throw new Error("account-required");
  const linked = await saveCurrentAccountWalk(journey, places, ready, async current => {
    const route = savedRouteFromJourney(current);
    if (!route) throw new Error("walk-save-empty");
    const link = current as WalkJourney & AccountLink;
    const candidateId = link.accountSavedUserId === userId ? link.accountSavedWalkId : undefined;
    // Explicit removal on this or another device permits a later new Save.
    const id = candidateId && (await listAccountWalks(userId)).some(w => w.id === candidateId) ? candidateId : undefined;
    const result = await request(userId, "POST", { route, ...(id ? { id } : {}) });
    return { accountSavedWalkId: parseRecord(result.walk).id, accountSavedUserId: userId };
  });
  notify(userId); return linked;
}
export async function removeAccountWalk(userId: string, id: string) {
  await request(userId, "DELETE", { id }); notify(userId);
}
export async function loadAccountWalkForOpen(id: string, citySlug: string) {
  const session = await nativeAuthClient.getSession();
  const userId = session.data?.user.id;
  if (!userId) throw new Error("account-required");
  const record = (await listAccountWalks(userId)).find(w => w.id === id && w.citySlug === citySlug);
  if (!record) throw new Error("account-save-unavailable");
  return { ...record, accountSavedWalkId: record.id, accountSavedUserId: userId };
}
