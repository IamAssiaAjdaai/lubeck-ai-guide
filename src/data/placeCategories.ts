import type { Place, PlaceCategory } from "@/data/places";
import type { Translations } from "@/lib/i18n";

export const PLACE_CATEGORY_ICON_IDS = [
  "LayoutGrid",
  "Landmark",
  "Utensils",
  "Sparkles",
] as const;

export type PlaceCategoryIconId = (typeof PLACE_CATEGORY_ICON_IDS)[number];
export type PlaceCategoryFilter = "all" | PlaceCategory;

export type PlaceCategoryConfig = Readonly<{
  id: PlaceCategoryFilter;
  category: PlaceCategory | null;
  icon: PlaceCategoryIconId;
}>;

export const placeCategoryConfig = [
  { id: "all", category: null, icon: "LayoutGrid" },
  { id: "see", category: "see", icon: "Landmark" },
  { id: "eat", category: "eat", icon: "Utensils" },
  { id: "fun", category: "fun", icon: "Sparkles" },
] as const satisfies readonly PlaceCategoryConfig[];

export type LocalizedPlaceCategory = PlaceCategoryConfig &
  Readonly<{
    label: string;
    description?: string;
  }>;

export function localizePlaceCategories(
  translations: Translations,
): readonly LocalizedPlaceCategory[] {
  return placeCategoryConfig.map((category) => ({
    ...category,
    label: translations.placeCategories[category.id],
  }));
}

export function filterPlacesByCategory<
  TPlace extends Pick<Place, "category">,
>(
  places: readonly TPlace[],
  selection: PlaceCategoryFilter,
): readonly TPlace[] {
  if (selection === "all") return places;
  return places.filter((place) => place.category === selection);
}
