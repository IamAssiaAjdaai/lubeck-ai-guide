import "server-only";

export type MarketingPerformance = Readonly<{
  status: "ready";
  days: number;
  landingViews: number;
  buildWalkClicks: number;
  walksStarted: number;
  walksCompleted: number;
}> | Readonly<{ status: "not_configured"; days: number }>;

type HogRow = readonly [string, number];

export async function getMarketingPerformance(
  citySlug?: string,
  environment: Readonly<Record<string, string | undefined>> = process.env,
  send: typeof fetch = fetch,
): Promise<MarketingPerformance> {
  const host = environment.CITYWALK_POSTHOG_QUERY_HOST ?? environment.NEXT_PUBLIC_POSTHOG_HOST;
  const projectId = environment.CITYWALK_POSTHOG_PROJECT_ID;
  const apiKey = environment.CITYWALK_POSTHOG_PERSONAL_API_KEY;
  const days = 30;
  if (!host || !projectId || !apiKey) return { status: "not_configured", days };

  let endpoint: URL;
  try { endpoint = new URL(`/api/projects/${encodeURIComponent(projectId)}/query/`, host); } catch { return { status: "not_configured", days }; }
  if (endpoint.protocol !== "https:") return { status: "not_configured", days };

  const cityClause = citySlug ? " AND properties.city = {city}" : "";
  const query = `SELECT event, count() FROM events WHERE timestamp >= now() - INTERVAL 30 DAY AND event IN ('landing_view','build_walk_clicked','walk_started','walk_completed')${cityClause} GROUP BY event`;
  try {
    const response = await send(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query, values: citySlug ? { city: citySlug } : {} } }),
      cache: "no-store",
    });
    if (!response.ok) return { status: "not_configured", days };
    const data = await response.json() as { results?: HogRow[] };
    const counts = new Map(data.results ?? []);
    return {
      status: "ready", days,
      landingViews: Number(counts.get("landing_view") ?? 0),
      buildWalkClicks: Number(counts.get("build_walk_clicked") ?? 0),
      walksStarted: Number(counts.get("walk_started") ?? 0),
      walksCompleted: Number(counts.get("walk_completed") ?? 0),
    };
  } catch {
    return { status: "not_configured", days };
  }
}
