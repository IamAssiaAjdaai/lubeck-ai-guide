import { captureMarketingFunnelEvent, type MarketingFunnelEvent } from "@/lib/marketing/performanceAnalytics.server";

const events = new Set<MarketingFunnelEvent>(["walk_started", "walk_completed"]);
const value = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;

export async function POST(request: Request) {
  // Older clients remain compatible, but never forward analytics without an
  // explicit client assertion. This is not proof of a human consent decision.
  if (request.headers.get("X-Citywalk-Analytics-Consent") !== "granted") {
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "Invalid request." }, { status: 415 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid request." }, { status: 400 });
  const input = body as Record<string, unknown>;
  if (typeof input.event !== "string" || !events.has(input.event as MarketingFunnelEvent) || !valid(input.city)) return Response.json({ error: "Invalid request." }, { status: 400 });
  const optional = ["source", "medium", "campaign", "contentId", "landingVariant"] as const;
  if (optional.some((key) => input[key] !== undefined && !valid(input[key]))) return Response.json({ error: "Invalid request." }, { status: 400 });
  await captureMarketingFunnelEvent({
    event: input.event as MarketingFunnelEvent,
    city: input.city as string,
    ...Object.fromEntries(optional.flatMap((key) => input[key] ? [[key, input[key]]] : [])),
  });
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

function valid(input: unknown): input is string {
  return typeof input === "string" && value.test(input);
}
