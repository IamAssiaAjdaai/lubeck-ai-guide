import { parseCityRouteIdentity } from "./routing";

export type CityAssistantContext = Readonly<{ type: "city"; citySlug: string }>;
export function cityAssistantContext(citySlug: unknown): CityAssistantContext | undefined {
  const identity = parseCityRouteIdentity(citySlug);
  return identity ? { type: "city", citySlug: identity.citySlug } : undefined;
}
// Route identity never comes from translated text or a default place.
export function cityAssistantRoute(citySlug: string) {
  return { pathname: "/city/[citySlug]/assistant" as const, params: { citySlug } };
}
