import "server-only";
import { LifecycleError } from "./rateLimit.server";
export const lifecycleJson = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
export async function lifecycleBody(request: Request): Promise<Record<string, unknown>> {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new LifecycleError("INVALID_REQUEST", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new LifecycleError("INVALID_REQUEST", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new LifecycleError("INVALID_REQUEST", 400);
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length;
    if (size > 2048) { await reader.cancel(); throw new LifecycleError("INVALID_REQUEST", 413); }
    chunks.push(value);
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch { /* No raw request/error logging. */ }
  throw new LifecycleError("INVALID_REQUEST", 400);
}
export function lifecycleFailure(error: unknown) {
  return lifecycleJson({ code: error instanceof LifecycleError ? error.code : "UNAVAILABLE" }, error instanceof LifecycleError ? error.status : 503);
}
