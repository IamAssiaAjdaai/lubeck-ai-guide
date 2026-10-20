import { parseSavedRoute, type SavedRoute } from "@citywalk/traveler-core";

/** Public share boundary: no identity, progress, or precise private endpoints.
 * Sharing APIs remain unimplemented. Replay must resolve a public start from stops.
 */
export type PublicWalk = Readonly<{
  version: 1;
  route: Omit<SavedRoute, "settings" | "finish"> & {
    settings: Omit<SavedRoute["settings"], "start" | "finish">;
  };
}>;

export function toPublicWalk(input: unknown): PublicWalk | null {
  const route = parseSavedRoute(input);
  if (!route || route.stopSlugs.length === 0 || route.stopSlugs.length > 30) return null;
  return {
    version: 1,
    route: {
      citySlug: route.citySlug,
      stopSlugs: [...route.stopSlugs],
      settings: {
        minutes: route.settings.minutes,
        interests: [...route.settings.interests],
        walking: route.settings.walking,
        ...(route.settings.categories ? { categories: [...route.settings.categories] } : {}),
      },
    },
  };
}
