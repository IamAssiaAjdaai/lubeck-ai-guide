import type {
  PlaceCategory,
  PlaceEnvironment,
  PlaceFact,
  PlacePricing,
  PlaceStatus,
} from "@/data/places";
import type { Locale } from "@/lib/i18n";

export type PlaceRevisionLocalization = Readonly<{
  locale: Locale;
  name: string;
  shortDescription: string;
  description?: string;
  story?: string;
  visitNotes?: string;
  facts: readonly PlaceFact[];
}>;

export type PlaceRevisionSnapshot = Readonly<{
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  durationMinutes: number;
  environment: PlaceEnvironment;
  pricing: PlacePricing;
  status?: PlaceStatus;
  statusVerifiedAt?: string;
  visitNoteVerifiedAt?: string;
  visitNoteValidUntil?: string;
  image?: string;
  tagSlugs: readonly string[];
  localizations: readonly PlaceRevisionLocalization[];
}>;
