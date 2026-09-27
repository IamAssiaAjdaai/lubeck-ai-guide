import { getAuth } from "@/lib/auth/server";
import { listAccountWalks, saveAccountWalk, removeAccountWalk, SavedWalkError } from "@/lib/account/savedWalks.server";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
async function handle(request: Request, action: "list" | "save" | "remove") {
  try {
    // Browser requests must be same-origin; native sends the existing SecureStore cookie.
    const origin = request.headers.get("origin");
    if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return json({ error: "Request not allowed." }, 403);
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session || request.headers.get("X-Citywalk-Account") !== session.user.id) return json({ error: "Authentication required." }, 401);
    if (action === "list") return json({ walks: await listAccountWalks(session.user.id) });
    if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "Invalid request." }, 415);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Invalid request." }, 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 30000) { await reader.cancel(); return json({ error: "Invalid request." }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const text = new TextDecoder().decode(bytes);
    let body;
    try { body = JSON.parse(text); } catch { return json({ error: "Invalid request." }, 400); }
    if (!body || typeof body !== "object" || (body.id !== undefined && (typeof body.id !== "string" || !uuid.test(body.id)))) return json({ error: "Invalid request." }, 400);
    if (action === "save") return json({ walk: await saveAccountWalk(session.user.id, body.route, body.id) });
    if (!body.id) return json({ error: "Invalid request." }, 400);
    await removeAccountWalk(session.user.id, body.id);
    return json({ removed: true });
  } catch (error) {
    return json({ error: "Saved walks are temporarily unavailable." }, error instanceof SavedWalkError ? error.status : 503);
  }
}
export const GET = (request: Request) => handle(request, "list");
export const POST = (request: Request) => handle(request, "save");
export const DELETE = (request: Request) => handle(request, "remove");
