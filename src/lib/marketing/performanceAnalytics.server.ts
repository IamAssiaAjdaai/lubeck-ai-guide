import "server-only";

export type MarketingFunnelEvent = "walk_started" | "walk_completed";
export type MarketingFunnelInput = Readonly<{
  event: MarketingFunnelEvent;
  city: string;
  source?: string;
  medium?: string;
  campaign?: string;
  contentId?: string;
  landingVariant?: string;
}>;

export async function captureMarketingFunnelEvent(
  input: MarketingFunnelInput,
  environment: Readonly<Record<string, string | undefined>> = process.env,
  send: typeof fetch = fetch,
): Promise<void> {
  const token = environment.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const rawHost = environment.NEXT_PUBLIC_POSTHOG_HOST;
  if (!token || !rawHost) return;
  let endpoint: URL;
  try { endpoint = new URL("/capture/", rawHost); } catch { return; }
  if (endpoint.protocol !== "https:") return;
  try {
    await send(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: token,
        event: input.event,
        properties: {
          distinct_id: "citywalk-marketing-funnel",
          city: input.city,
          ...(input.source ? { utm_source: input.source } : {}),
          ...(input.medium ? { utm_medium: input.medium } : {}),
          ...(input.campaign ? { utm_campaign: input.campaign } : {}),
          ...(input.contentId ? { utm_content: input.contentId } : {}),
          ...(input.landingVariant ? { landing_variant: input.landingVariant } : {}),
        },
      }),
    });
  } catch {
    // Analytics must never affect the walk experience.
  }
}
