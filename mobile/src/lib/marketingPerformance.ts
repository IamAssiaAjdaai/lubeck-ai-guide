import { getConfiguredApiOrigin } from "./api/environment";
import { getNativeAnalyticsConsent } from "./analyticsConsent";
import { loadNativeMarketingAttribution } from "./marketingAttribution";

export type NativeMarketingFunnelEvent = "walk_started" | "walk_completed";

export async function captureNativeMarketingFunnelEvent(
  event: NativeMarketingFunnelEvent,
  citySlug: string,
  send: typeof fetch = fetch,
): Promise<void> {
  try {
    if (await getNativeAnalyticsConsent() !== "granted") return;
    const attribution = await loadNativeMarketingAttribution();
    if (!attribution || attribution.citySlug !== citySlug) return;
    if (await getNativeAnalyticsConsent() !== "granted") return;
    await send(new URL("/api/analytics/marketing-funnel", getConfiguredApiOrigin()), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Citywalk-Analytics-Consent": "granted" },
      body: JSON.stringify({
        event,
        city: citySlug,
        source: attribution.source,
        medium: attribution.medium,
        campaign: attribution.campaign,
        contentId: attribution.contentId,
        landingVariant: attribution.landingVariant,
      }),
    });
  } catch {
    // Analytics must never affect the walk experience.
  }
}
