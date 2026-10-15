import {
  appendMarketingAttributionToPath,
  type MarketingAttribution,
} from "@/lib/marketingAttribution";

export const CITYWALK_APP_LINK_HOST = "getcitywalk.com";
export const CITYWALK_IOS_BUNDLE_IDENTIFIER = "com.citywalk.app";
export const CITYWALK_ANDROID_PACKAGE = "com.citywalk.app";

export function buildNativeAppHandoffPath({
  citySlug,
  marketingSlug,
  attribution,
}: Readonly<{
  citySlug: string;
  marketingSlug: string;
  attribution: MarketingAttribution;
}>): string {
  const path = `/open/${encodeURIComponent(cleanSegment(citySlug))}/${encodeURIComponent(cleanSegment(marketingSlug))}?intent=build_walk`;
  return appendMarketingAttributionToPath(path, attribution);
}

export function buildCitywalkSchemeUrl({
  citySlug,
  marketingSlug,
  attribution,
}: Readonly<{
  citySlug: string;
  marketingSlug: string;
  attribution: MarketingAttribution;
}>): string {
  const path = buildNativeAppHandoffPath({ citySlug, marketingSlug, attribution });
  return `citywalk://${path.replace(/^\//, "")}`;
}

export function approvedStoreUrl(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;

  try {
    const url = new URL(normalized);
    if (url.protocol !== "https:" || url.username || url.password) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function cleanSegment(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized || !/^[a-z0-9-]+$/.test(normalized)) {
    throw new Error("CITYWALK native handoff requires a safe route segment.");
  }
  return normalized;
}

// Universal/App Link path for sharing an exact guest walk.
export function buildSharedWalkHandoffPath(id: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Invalid CITYWALK shared-walk ID.");
  }
  return "/shared-walk/" + id;
}

export function buildSharedWalkSchemeUrl(id: string): string {
  return "citywalk://" + buildSharedWalkHandoffPath(id).slice(1);
}
