export function getCityScopedPlannerId(citySlug: string): string {
  return `citywalk:${citySlug}:custom-tour`;
}

export function getCityScopedTourId(citySlug: string, tourSlug: string): string {
  return `citywalk:${citySlug}:tour:${tourSlug}`;
}
