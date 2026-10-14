import { getSharedWalk, SharedWalkError } from "@/lib/sharing/sharedWalks.server";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!uuid.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
  try {
    const walk = await getSharedWalk(id);
    return Response.json(walk, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: "Walk unavailable" }, { status: error instanceof SharedWalkError ? error.status : 503 });
  }
}
