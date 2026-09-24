const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const MOBILE_TRIP_ROUTE_VERSION = 1;

export type MobileTripSource = "personalized" | "published" | "saved";

export type MobileTripContext = Readonly<{
  version: typeof MOBILE_TRIP_ROUTE_VERSION;
  id: string;
  citySlug: string;
  stopSlugs: readonly string[];
  currentStopIndex: number;
  source: MobileTripSource;
}>;

export type MobileTripRouteParams = Readonly<{
  citySlug: string;
  placeSlug: string;
  tripVersion: string;
  tripId: string;
  tripStops: string;
  tripIndex: string;
  tripSource: MobileTripSource;
}>;

export function createMobileTripId(prefix = "trip"): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${randomId ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
}

export function createMobileTripPlaceParams(
  input: Omit<MobileTripContext, "version" | "currentStopIndex">,
  currentStopIndex: number,
): MobileTripRouteParams {
  assertTripIdentity(input.citySlug, input.stopSlugs, currentStopIndex);
  return {
    citySlug: input.citySlug,
    placeSlug: input.stopSlugs[currentStopIndex]!,
    tripVersion: String(MOBILE_TRIP_ROUTE_VERSION),
    tripId: input.id,
    tripStops: input.stopSlugs.join(","),
    tripIndex: String(currentStopIndex),
    tripSource: input.source,
  };
}

export function parseMobileTripContext(input: Readonly<{
  citySlug?: string | string[];
  placeSlug?: string | string[];
  tripVersion?: string | string[];
  tripId?: string | string[];
  tripStops?: string | string[];
  tripIndex?: string | string[];
  tripSource?: string | string[];
}>): MobileTripContext | undefined {
  const citySlug = single(input.citySlug);
  const placeSlug = single(input.placeSlug);
  const version = single(input.tripVersion);
  const id = single(input.tripId);
  const serializedStops = single(input.tripStops);
  const serializedIndex = single(input.tripIndex);
  const source = single(input.tripSource);
  if (
    version !== String(MOBILE_TRIP_ROUTE_VERSION) ||
    !id || id.length > 160 ||
    !citySlug || !SAFE_SLUG.test(citySlug) ||
    !placeSlug || !SAFE_SLUG.test(placeSlug) ||
    !serializedStops || !serializedIndex ||
    !isTripSource(source)
  ) return undefined;

  const stopSlugs = serializedStops.split(",");
  const currentStopIndex = Number(serializedIndex);
  if (
    stopSlugs.length === 0 || stopSlugs.length > 100 ||
    stopSlugs.some((slug) => !SAFE_SLUG.test(slug)) ||
    !Number.isInteger(currentStopIndex) ||
    currentStopIndex < 0 ||
    currentStopIndex >= stopSlugs.length ||
    stopSlugs[currentStopIndex] !== placeSlug
  ) return undefined;

  return {
    version: MOBILE_TRIP_ROUTE_VERSION,
    id,
    citySlug,
    stopSlugs,
    currentStopIndex,
    source,
  };
}

export function adjacentMobileTripParams(
  context: MobileTripContext,
  offset: -1 | 1,
): MobileTripRouteParams | undefined {
  const nextIndex = context.currentStopIndex + offset;
  if (nextIndex < 0 || nextIndex >= context.stopSlugs.length) return undefined;
  return createMobileTripPlaceParams(context, nextIndex);
}

function assertTripIdentity(
  citySlug: string,
  stopSlugs: readonly string[],
  currentStopIndex: number,
) {
  if (
    !SAFE_SLUG.test(citySlug) ||
    stopSlugs.length === 0 ||
    stopSlugs.some((slug) => !SAFE_SLUG.test(slug)) ||
    !Number.isInteger(currentStopIndex) ||
    currentStopIndex < 0 ||
    currentStopIndex >= stopSlugs.length
  ) throw new Error("Invalid mobile trip route.");
}

function isTripSource(value: string | undefined): value is MobileTripSource {
  return value === "personalized" || value === "published" || value === "saved";
}

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
