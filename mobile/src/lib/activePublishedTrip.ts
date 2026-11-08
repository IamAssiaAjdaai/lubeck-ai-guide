import type { PublicCitySummaryResponse } from "./api/contracts";
import type { MobileTripContext } from "./tripNavigation";

/** URL context locates a published journey; it never defines its editorial order. */
export function resolveActivePublishedTrip(data: PublicCitySummaryResponse, trip: MobileTripContext) {
  if (trip.source !== "published" || data.city.slug !== trip.citySlug) return;
  const tour = data.tours.find(value => trip.id === `published-${value.slug}`);
  if (!tour) return;
  const ordered = [...tour.stops].sort((a, b) => a.position - b.position);
  const slugs = ordered.map(stop => stop.placeSlug);
  if (!slugs.length || new Set(slugs).size !== slugs.length || JSON.stringify(slugs) !== JSON.stringify(trip.stopSlugs)) return;
  const stops = ordered.flatMap(stop => {
    const place = data.places.find(value => value.slug === stop.placeSlug);
    return place ? [{ stop, place }] : [];
  });
  return stops.length === ordered.length ? { tour, stops } : undefined;
}
