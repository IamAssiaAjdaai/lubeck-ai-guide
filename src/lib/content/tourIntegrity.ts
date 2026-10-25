/** Public editorial routes must remain ordered content, never planner output. */
export type PublishedTourGraph = Readonly<{
  slug: string;
  stops: readonly Readonly<{
    placeSlug: string;
    position: number;
    visitDurationMinutes?: number;
  }>[];
}>;

export function assertPublishedTourGraph(
  tours: readonly PublishedTourGraph[],
  placeSlugs: ReadonlySet<string>,
  fixedRoute?: Readonly<{ slug: string; stopSlugs: readonly string[] }>,
): void {
  if (new Set(tours.map(({ slug }) => slug)).size !== tours.length) {
    throw new Error("Published tour identities are inconsistent.");
  }
  for (const tour of tours) {
    if (
      tour.stops.length === 0 ||
      new Set(tour.stops.map(({ placeSlug }) => placeSlug)).size !== tour.stops.length ||
      tour.stops.some((stop, index) =>
        !placeSlugs.has(stop.placeSlug) ||
        stop.position !== index + 1 ||
        (stop.visitDurationMinutes !== undefined &&
          (!Number.isInteger(stop.visitDurationMinutes) || stop.visitDurationMinutes <= 0)),
      )
    ) {
      throw new Error("Published tour stop graph is inconsistent.");
    }
    if (fixedRoute?.slug === tour.slug && (
      tour.stops.length !== fixedRoute.stopSlugs.length ||
      tour.stops.some(({ placeSlug }, index) => placeSlug !== fixedRoute.stopSlugs[index])
    )) {
      throw new Error("Published historic tour differs from its curated route.");
    }
  }
}
