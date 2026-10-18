import { getLaunchPolicy } from "@/lib/commerce/launchPolicy.server";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(getLaunchPolicy(), { headers: { "Cache-Control": "private, no-store" } });
}
