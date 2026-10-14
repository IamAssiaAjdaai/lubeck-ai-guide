import { getAuth } from "@/lib/auth/server";
import { createSharedWalk, SharedWalkError } from "@/lib/sharing/sharedWalks.server";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return Response.json({ error: "Forbidden" }, { status: 403 });
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session || request.headers.get("X-Citywalk-Account") !== session.user.id) return Response.json({ error: "Authentication required" }, { status: 401 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "Invalid payload" }, { status: 415 });
  let payload: unknown;
  try {
    const text = await request.text();
    if (text.length > 16000) return Response.json({ error: "Too large" }, { status: 413 });
    payload = JSON.parse(text);
  } catch { return Response.json({ error: "Invalid payload" }, { status: 400 }); }
  try {
    const result = await createSharedWalk(session.user.id, payload);
    return Response.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: "Unable to share walk" }, { status: e instanceof SharedWalkError ? e.status : 503 });
  }
}
