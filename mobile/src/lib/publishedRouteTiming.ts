import type { PublicTour } from "./api/contracts";

/** Published duration has no walking/experience scope in the current DTO.
 * Never relabel it as walking time or derive a walking ETA from straight lines.
 * Visit totals use only explicit per-stop estimates; an omitted estimate stays unknown.
 */
export function publishedRouteTiming(tour: Pick<PublicTour, "estimatedDurationMinutes" | "stops">) {
  const knownVisits = tour.stops.map(stop => stop.visitDurationMinutes);
  const visitsComplete = knownVisits.length > 0 && knownVisits.every(minutes => minutes !== undefined && Number.isFinite(minutes) && minutes > 0);
  const visitMinutes = visitsComplete ? knownVisits.reduce<number>((sum, minutes) => sum + minutes!, 0) : undefined;
  const publishedMinutes = tour.estimatedDurationMinutes !== undefined && Number.isFinite(tour.estimatedDurationMinutes) && tour.estimatedDurationMinutes > 0
    ? tour.estimatedDurationMinutes : undefined;
  return {
    visitMinutes,
    publishedMinutes,
    conflictsWithVisits: publishedMinutes !== undefined && visitMinutes !== undefined && publishedMinutes < visitMinutes,
  };
}
