import type { NativeLocationStatus } from "./location";

export function getLocationAnalyticsProperties(
  citySlug: string,
  status: NativeLocationStatus,
) {
  return { city_slug: citySlug, location_status: status } as const;
}
