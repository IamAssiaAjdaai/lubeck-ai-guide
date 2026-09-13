export const SCREEN_TOP_SPACING = 14;

const BASE_SAFE_AREA_EDGES = ["bottom", "left", "right"] as const;

export function getScreenSafeAreaEdges(includeTopSafeArea: boolean) {
  return includeTopSafeArea
    ? (["top", ...BASE_SAFE_AREA_EDGES] as const)
    : BASE_SAFE_AREA_EDGES;
}
