import { parseSavedRoute, type SavedRoute } from "@citywalk/traveler-core";

/** Public share boundary: no owner identity, session, progress, or GPS history. */
export type PublicWalk = Readonly<{ version: 1; route: SavedRoute }>;

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
        start: { ...route.settings.start },
        interests: [...route.settings.interests],
        walking: route.settings.walking,
        ...(route.settings.categories ? { categories: [...route.settings.categories] } : {}),
        ...(route.finish ? { finish: { ...route.finish } } : {}),
      },
      ...(route.finish ? { finish: { ...route.finish } } : {}),
    },
  };
}
